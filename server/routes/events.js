// server/routes/events.js
//
// ── CHANGES IN THIS VERSION ─────────────────────────────────────────────────
// Added maybeAdvanceEventStatus(): once ALL vendor slots on an event are
// 'accepted' AND admin has set status to 'admin_approved', the event is
// automatically flipped to 'payment_pending'. This is checked from both
// sides (vendor responds, or admin approves) so it works regardless of
// which one happens first. The client's MyEvents page watches for
// status === 'payment_pending' to show the Pay button.
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
    // NEW: payment_status tracks advance/paid state, separate from workflow `status`
    `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS payment_status TEXT`,
  ];
  for (const sql of alterColumns) {
    await pool.query(sql).catch(() => {}); // ignore if already exists
  }

  // Helpful for fast "my events" lookups
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_event_requests_client_id ON event_requests(client_id)`
  ).catch(() => {});

  // ── One-time backfill for rows created before client_id existed ─────────────
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

// ── Payment-flow helper ────────────────────────────────────────────────────────
// Call this any time a vendor slot status changes OR admin changes event
// status. It checks: are all (non-replaced) vendor slots 'accepted'? Is the
// event already 'admin_approved'? If both true, flip event to
// 'payment_pending' so the client's MyEvents page shows the Pay button.
// If any slot is 'declined', we do NOT auto-advance — admin/client must
// resolve that first (e.g. client picks another vendor).
async function maybeAdvanceEventStatus(eventId) {
  try {
    const evRes = await pool.query(`SELECT status FROM event_requests WHERE id = $1`, [eventId]);
    const event = evRes.rows[0];
    if (!event) return;

    const slotsRes = await pool.query(
      `SELECT status FROM event_vendor_slots WHERE event_id = $1 AND status != 'replaced'`,
      [eventId]
    );
    const slots = slotsRes.rows;
    if (slots.length === 0) return;

    const anyDeclined = slots.some(s => s.status === 'declined');
    if (anyDeclined) return; // needs manual resolution

    const allAccepted = slots.every(s => s.status === 'accepted');

    if (allAccepted && event.status === 'admin_approved') {
      await pool.query(
        `UPDATE event_requests SET status = 'payment_pending', updated_at = NOW() WHERE id = $1`,
        [eventId]
      );
    }
  } catch (err) {
    console.error('maybeAdvanceEventStatus error:', err.message);
  }
}

// ── POST /api/events — client submits event ───────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const token = getClientFromToken(req);
    if (!token?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

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

    for (const v of vendors) {
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

    const eventsRes = await pool.query(
      `SELECT id, client_id, client_name, client_email, client_phone,
              event_name, event_type, event_date::text AS event_date, event_time,
              location, capacity, budget_estimate, decoration_type,
              reference_event_id, reference_event_image,
              reference_event_title, reference_event_type,
              admin_notes, status, payment_status, created_at, updated_at
       FROM event_requests WHERE client_id = $1 ORDER BY created_at DESC`,
      [token.id]
    );
    const events = eventsRes.rows;
    if (events.length === 0) return res.json([]);

    const ids = events.map(e => e.id);
    const slotsRes = await pool.query(
  `SELECT evs.*,
          v.name  AS vendor_name,
          v.price_per_day AS vendor_current_price,
          vu.name AS business_name,
          COALESCE(NULLIF(evs.quoted_price, 0), v.price_per_day * COALESCE(evs.days, 1)) AS effective_price
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
              admin_notes, status, payment_status, created_at, updated_at
       FROM event_requests ORDER BY created_at DESC`
    );
    const events = eventsRes.rows;
    if (events.length === 0) return res.json([]);

    const ids = events.map(e => e.id);
    const slotsRes = await pool.query(
  `SELECT evs.*,
          v.name  AS vendor_name,
          v.price_per_day AS vendor_current_price,
          vu.name AS business_name,
          COALESCE(NULLIF(evs.quoted_price, 0), v.price_per_day * COALESCE(evs.days, 1)) AS effective_price
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

    // If admin just approved, check whether vendors already all accepted —
    // if so, immediately advance to payment_pending rather than waiting
    // on a vendor action that already happened.
    if (status === 'admin_approved') {
      await maybeAdvanceEventStatus(req.params.id);
    }

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
    const slotRes = await pool.query(
      `UPDATE event_vendor_slots
       SET status = $1, vendor_notes = $2, responded_at = NOW()
       WHERE id = $3
       RETURNING event_id`,
      [status, vendor_notes || null, req.params.slotId]
    );

    const eventId = slotRes.rows[0]?.event_id;
    if (eventId) {
      // Vendor just accepted/declined — check if this completes the
      // "all vendors accepted + admin approved" condition.
      await maybeAdvanceEventStatus(eventId);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;