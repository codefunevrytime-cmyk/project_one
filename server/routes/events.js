// server/routes/events.js
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
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS client_name TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_id TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_image TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_title TEXT`,
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_type TEXT`,
  ];
  for (const sql of alterColumns) {
    await pool.query(sql).catch(() => {}); // ignore if already exists
  }

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
    const {
      client_name, client_email, client_phone,
      event_name, event_type, event_date, event_time,
      location, capacity, budget_estimate, decoration_type,
      reference_event_id, reference_event_image,
      vendors = [],
    } = req.body;

    // Get reference event title/type from eventsData lookup if not provided
    const reference_event_title = req.body.reference_event_title || null;
    const reference_event_type  = req.body.reference_event_type  || null;

    // Insert the event
    const eventResult = await pool.query(
      `INSERT INTO event_requests
         (client_name, client_email, client_phone,
          event_name, event_type, event_date, event_time,
          location, capacity, budget_estimate, decoration_type,
          reference_event_id, reference_event_image,
          reference_event_title, reference_event_type,
          status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending')
       RETURNING id`,
      [
        client_name   || null,
        client_email  || null,
        client_phone  || null,
        event_name    || null,
        event_type    || null,
        event_date    || null,
        event_time    || null,
        location      || null,
        capacity      || null,
        budget_estimate || null,
        decoration_type || null,
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
          `SELECT vu.id FROM vendor_users vu
           JOIN vendors vn ON vn.name = vu.name
           WHERE vn.id = $1 LIMIT 1`,
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
    const email = token?.email || req.query.email;
    if (!email) return res.json([]);

    const eventsRes = await pool.query(
      `SELECT * FROM event_requests WHERE client_email = $1 ORDER BY created_at DESC`,
      [email]
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

// ── PATCH /api/events/:id/cancel — client cancels ────────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    await pool.query(
      `UPDATE event_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/admin/all — admin sees everything ────────────────────────
router.get('/admin/all', async (req, res) => {
  try {
    const eventsRes = await pool.query(
      `SELECT * FROM event_requests ORDER BY created_at DESC`
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