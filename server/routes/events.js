// server/routes/events.js
//
// ── CHANGES IN THIS VERSION (Option B fix) ─────────────────────────────────────
// Problem: JWT payload only contains { id, iat, exp } — no `email` field.
// GET /my was filtering on token?.email (always undefined) → always returned [].
// POST / was trusting req.body.client_email blindly → anyone could submit an
// event "as" any email address, and it never matched what GET /my expected.
//
// Fix: event_requests now has a client_id column. POST resolves the logged-in
// user's id/name/email from the `users` table using the JWT's `id`, stores
// client_id on the row, and GET /my filters directly on client_id. No more
// trusting the request body for identity, no more email-matching mismatch.
//
// ⚠️ ASSUMPTION TO VERIFY: this file assumes a `users` table exists with at
// least `id`, `name`, `email` columns (matching your client login/signup).
// If your table or column names differ, tell me and I'll adjust the
// `SELECT email, name FROM users WHERE id = $1` line accordingly.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');

// ── Auto-migrate ──────────────────────────────────────────────────────────────
async function ensureTables() {
  // Main event requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_requests (
      id                     SERIAL PRIMARY KEY,
      client_id              INTEGER,
      client_name            TEXT,
      client_email           TEXT,
      client_phone           TEXT,
      event_name             TEXT,
      event_type             TEXT,
      event_date             DATE,
      event_time             TEXT,
      location               TEXT,
      capacity               INTEGER,
      budget_estimate        NUMERIC,
      decoration_type        TEXT,
      reference_event_id     TEXT,
      reference_event_image  TEXT,
      reference_event_title  TEXT,
      reference_event_type   TEXT,
      admin_notes            TEXT,
      status                 TEXT DEFAULT 'pending',
      created_at             TIMESTAMPTZ DEFAULT NOW(),
      updated_at             TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add missing columns to existing table if they don't exist
  const alterColumns = [
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS client_id INTEGER`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS client_name TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_id TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_image TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_title TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_type TEXT`,
  ];
  for (const sql of alterColumns) {
    await pool.query(sql).catch(() => {}); // ignore if already exists
  }

  // Helpful for fast "my events" lookups
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_event_requests_client_id ON event_requests(client_id)`
  ).catch(() => {});

  // ── One-time backfill for rows created before client_id existed ─────────────
  // Those older rows still have client_email saved (the old POST route wrote
  // it straight from the request body), just no client_id. Match them to the
  // users table by email so they become visible again in GET /my. This is
  // safe to run on every startup — it only touches rows where client_id is
  // still NULL and a matching user email exists.
  await pool.query(`
    UPDATE event_requests er
    SET client_id = u.id
    FROM users u
    WHERE er.client_id IS NULL
      AND er.client_email IS NOT NULL
      AND LOWER(er.client_email) = LOWER(u.email)
  `).catch(err => console.error('client_id backfill skipped:', err.message));

  // Vendor slots table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_vendor_slots (
      id                      SERIAL PRIMARY KEY,
      event_id                INTEGER NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
      vendor_id               INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      vendor_user_id          INTEGER REFERENCES vendor_users(id) ON DELETE SET NULL,
      service_type            TEXT,
      quoted_price            NUMERIC,
      days                    INTEGER DEFAULT 1,
      coverage_types          TEXT[],
      quantity                TEXT,
      vendor_notes            TEXT,
      reference_event_id      TEXT,
      reference_event_image   TEXT,
      status                  TEXT DEFAULT 'pending',
      responded_at            TIMESTAMPTZ,
      created_at              TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add missing columns to vendor slots
  const alterSlots = [
    `ALTER TABLE event_vendor_slots ADD COLUMN IF NOT EXISTS days INTEGER DEFAULT 1`,
    `ALTER TABLE event_vendor_slots ADD COLUMN IF NOT EXISTS coverage_types TEXT[]`,
    `ALTER TABLE event_vendor_slots ADD COLUMN IF NOT EXISTS quantity TEXT`,
    `ALTER TABLE event_vendor_slots ADD COLUMN IF NOT EXISTS reference_event_id TEXT`,
    `ALTER TABLE event_vendor_slots ADD COLUMN IF NOT EXISTS reference_event_image TEXT`,
  ];
  for (const sql of alterSlots) {
    await pool.query(sql).catch(() => {});
  }
}
ensureTables().catch(console.error);

// ── Auth helper ───────────────────────────────────────────────────────────────
function getClientFromToken(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return null;
    return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
  } catch { return null; }
}

// ── POST /api/events — client submits event ───────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const token = getClientFromToken(req);
    if (!token?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Resolve the logged-in user's real identity from the DB —
    // never trust client_name/client_email from the request body.
    const userRes = await pool.query(
      `SELECT id, name, email FROM users WHERE id = $1`,
      [token.id]
    );
    const clientUser = userRes.rows[0];
    if (!clientUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    const {
      client_phone,
      event_name, event_type, event_date, event_time,
      location, capacity, budget_estimate, decoration_type,
      reference_event_id, reference_event_image,
      reference_event_title, reference_event_type,
      vendors = [],
    } = req.body;

    // Insert the event
    const eventResult = await pool.query(
      `INSERT INTO event_requests
         (client_id, client_name, client_email, client_phone,
          event_name, event_type, event_date, event_time,
          location, capacity, budget_estimate, decoration_type,
          reference_event_id, reference_event_image,
          reference_event_title, reference_event_type,
          status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending')
       RETURNING id`,
      [
        clientUser.id,
        clientUser.name  || req.body.client_name || null,
        clientUser.email || null,
        client_phone     || null,
        event_name       || null,
        event_type       || null,
        event_date       || null,
        event_time       || null,
        location         || null,
        capacity         || null,
        budget_estimate  || null,
        decoration_type  || null,
        reference_event_id    ? String(reference_event_id) : null,
        reference_event_image || null,
        reference_event_title || null,
        reference_event_type  || null,
      ]
    );

    const eventId = eventResult.rows[0].id;

    // Insert vendor slots
    for (const v of vendors) {
      // Look up vendor_user_id from vendors table
      let vendorUserId = null;
      if (v.vendor_id) {
        const vuRes = await pool.query(
          `SELECT id FROM vendor_users WHERE vendor_id = $1 LIMIT 1`,
          [v.vendor_id]
        ).catch(() => ({ rows: [] }));
        vendorUserId = vuRes.rows[0]?.id || null;
      }

      await pool.query(
        `INSERT INTO event_vendor_slots
           (event_id, vendor_id, vendor_user_id, service_type,
            quoted_price, days, coverage_types, quantity,
            vendor_notes, reference_event_id, reference_event_image, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')`,
        [
          eventId,
          v.vendor_id   || null,
          vendorUserId,
          v.service_type || null,
          v.quoted_price || null,
          v.days         || 1,
          v.coverage_types?.length ? v.coverage_types : null,
          v.quantity     || null,
          v.vendor_notes || null,
          v.reference_event_id    ? String(v.reference_event_id) : null,
          v.reference_event_image || null,
        ]
      );
    }

    res.json({ success: true, id: eventId });
  } catch (err) {
    console.error('POST /api/events error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/my — client's own events ──────────────────────────────────
router.get('/my', async (req, res) => {
  try {
    const token = getClientFromToken(req);
    if (!token?.id) return res.json([]);

    // event_date::text avoids node-postgres serializing DATE columns as full
    // ISO timestamps (e.g. "2026-05-30T18:30:00.000Z"), which broke the
    // frontend's date filtering — it expects a plain "YYYY-MM-DD" string.
    const eventsRes = await pool.query(
      `SELECT id, client_id, client_name, client_email, client_phone,
              event_name, event_type, event_date::text AS event_date, event_time,
              location, capacity, budget_estimate, decoration_type,
              reference_event_id, reference_event_image,
              reference_event_title, reference_event_type,
              admin_notes, status, created_at, updated_at
       FROM event_requests WHERE client_id = $1 ORDER BY created_at DESC`,
      [token.id]
    );
    const events = eventsRes.rows;
    if (events.length === 0) return res.json([]);

    const ids = events.map(e => e.id);
    const slotsRes = await pool.query(
      `SELECT evs.*,
              v.name  AS vendor_name,
              vu.name AS business_name
       FROM event_vendor_slots evs
       LEFT JOIN vendors      v  ON evs.vendor_id      = v.id
       LEFT JOIN vendor_users vu ON evs.vendor_user_id = vu.id
       WHERE evs.event_id = ANY($1)`,
      [ids]
    );

    const slotsByEvent = {};
    for (const s of slotsRes.rows) {
      if (!slotsByEvent[s.event_id]) slotsByEvent[s.event_id] = [];
      slotsByEvent[s.event_id].push(s);
    }

    res.json(events.map(e => ({ ...e, vendors: slotsByEvent[e.id] || [] })));
  } catch (err) {
    console.error('GET /api/events/my error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/events/:id/cancel — client cancels ────────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    const token = getClientFromToken(req);
    if (!token?.id) return res.status(401).json({ error: 'Not authenticated' });

    // Make sure the event actually belongs to this client before cancelling it
    const result = await pool.query(
      `UPDATE event_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND client_id = $2
       RETURNING id`,
      [req.params.id, token.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/admin/all — admin sees everything ────────────────────────
router.get('/admin/all', async (req, res) => {
  try {
    const eventsRes = await pool.query(
      `SELECT id, client_id, client_name, client_email, client_phone,
              event_name, event_type, event_date::text AS event_date, event_time,
              location, capacity, budget_estimate, decoration_type,
              reference_event_id, reference_event_image,
              reference_event_title, reference_event_type,
              admin_notes, status, created_at, updated_at
       FROM event_requests ORDER BY created_at DESC`
    );
    const events = eventsRes.rows;
    if (events.length === 0) return res.json([]);

    const ids = events.map(e => e.id);
    const slotsRes = await pool.query(
      `SELECT evs.*,
              v.name  AS vendor_name,
              vu.name AS business_name
       FROM event_vendor_slots evs
       LEFT JOIN vendors      v  ON evs.vendor_id      = v.id
       LEFT JOIN vendor_users vu ON evs.vendor_user_id = vu.id
       WHERE evs.event_id = ANY($1)`,
      [ids]
    );

    const slotsByEvent = {};
    for (const s of slotsRes.rows) {
      if (!slotsByEvent[s.event_id]) slotsByEvent[s.event_id] = [];
      slotsByEvent[s.event_id].push(s);
    }

    res.json(events.map(e => ({ ...e, vendors: slotsByEvent[e.id] || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/events/admin/:id/status — admin updates status ────────────────
router.patch('/admin/:id/status', async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    await pool.query(
      `UPDATE event_requests
       SET status = $1, admin_notes = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, admin_notes || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/vendor/requests — vendor sees their slots ────────────────
router.get('/vendor/requests', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    const vendorUserId = payload.vendorUserId || payload.id;

    // Try matching by vendor_user_id first, then by email via vendor_users
    const result = await pool.query(
      `SELECT evs.*,
              er.event_name, er.event_type, er.event_date, er.event_time,
              er.location,   er.capacity
       FROM event_vendor_slots evs
       JOIN event_requests er ON evs.event_id = er.id
       WHERE evs.vendor_user_id = $1
          OR evs.vendor_id IN (
            SELECT id FROM vendors WHERE id = (
              SELECT vendor_id FROM vendor_users WHERE id = $1 LIMIT 1
            )
          )
       ORDER BY er.event_date ASC NULLS LAST`,
      [vendorUserId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/events/vendor/respond/:slotId ─────────────────────────────────
router.patch('/vendor/respond/:slotId', async (req, res) => {
  try {
    const { status, vendor_notes } = req.body;
    await pool.query(
      `UPDATE event_vendor_slots
       SET status = $1, vendor_notes = $2, responded_at = NOW()
       WHERE id = $3`,
      [status, vendor_notes || null, req.params.slotId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;