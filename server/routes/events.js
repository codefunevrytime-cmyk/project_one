// server/routes/events.js
//
// ── STATUS LIFECYCLE (kept in sync with AdminEventRequests.jsx / MyEvents.jsx) ─
//   pending          → auto-set here on client submit.
//   admin_reviewing  → auto-set by the admin panel the moment admin opens
//                       the request card (PATCH /admin/:id/status).
//   contact          → MANUAL, admin panel button. Admin is reaching out
//                       to the client to confirm details.
//   admin_approved   → MANUAL, admin panel button.
//   payment_pending  → AUTO, via maybeAdvanceEventStatus() below, once all
//                       vendor slots are accepted AND the event is
//                       admin_approved. No manual button for this one.
//   confirmed        → AUTO. payments.js sets this directly the moment the
//                       client's ADVANCE payment succeeds (both the online
//                       Razorpay verify route and the offline-payment
//                       route already do this inline — no call into this
//                       file needed). No manual button for this either.
//   completed        → MANUAL, admin panel button. This is what reveals the
//                       balance-due prompt on the client side. payments.js
//                       must NOT auto-set this on a balance payment — see
//                       the fix in payments.js's /verify and /offline
//                       routes, which previously flipped status to
//                       'completed' on its own if the event date had
//                       passed. Completed is admin-only now.
//   cancellation_requested → AUTO, the moment a CLIENT asks to cancel (see
//                       PATCH /:id/cancel below). Parked here — nothing is
//                       actually cancelled or refunded yet. Payments are
//                       blocked while in this state (see
//                       assertPaymentEligible in payments.js).
//   cancelled        → MANUAL. Two paths now:
//                       (a) admin/vendor-initiated termination
//                           (AdminEventRequests "Terminate") → 100% refund
//                       (b) admin approves a client's cancellation request
//                           (PATCH /admin/:id/approve-cancellation) → 90%
//                           refund (CLIENT_CANCELLATION_REFUND_PCT in
//                           payments.js)
//                       Both routes now refund EVERY paid instalment for
//                       the booking via refundAllPaidPayments(), not just
//                       the most recent one.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');
const { emitEventUpdate, emitAddonsUpdate } = require('../lib/emitEventUpdate');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('../middleware/rateLimit');
const { refundAllPaidPayments, CLIENT_CANCELLATION_REFUND_PCT } = require('./payments');

router.use(rateLimit({ max: 30 }));

// ── Auto-migrate ──────────────────────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_requests (
      id                     SERIAL PRIMARY KEY,
      client_id              INTEGER,
      client_name            TEXT,
      client_email           TEXT,
      client_phone            TEXT,
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

  const alterColumns = [
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS client_id INTEGER`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS client_name TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_id TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_image TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_title TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_type TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_price NUMERIC`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS payment_status TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS additional_details TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS decoration_venue_id INTEGER REFERENCES decoration_venues(id) ON DELETE SET NULL`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS decoration_venue_image TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS decoration_venue_title TEXT`,
  // NEW — remembers what status an event was in right before a client
  // asked to cancel, so a denied cancellation request bounces back to
  // exactly where it was instead of guessing (e.g. landing everyone back
  // at 'admin_reviewing' even if they were already 'payment_pending').
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS pre_cancellation_status TEXT`,
];
  for (const sql of alterColumns) {
    await pool.query(sql).catch(() => {}); // ignore if already exists
  }

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_event_requests_client_id ON event_requests(client_id)`
  ).catch(() => {});

  await pool.query(`
    UPDATE event_requests er
    SET client_id = u.id
    FROM users u
    WHERE er.client_id IS NULL
      AND er.client_email IS NOT NULL
      AND LOWER(er.client_email) = LOWER(u.email)
  `).catch(err => console.error('client_id backfill skipped:', err.message));

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

// ── Server-side vendor slot validation ─────────────────────────────────────
async function validateVendorSlot(v) {
  if (!v.vendor_id) {
    return { ok: true, vendor: null, price: null };
  }

  const vendorRes = await pool.query(
    `SELECT v.id, v.is_active, v.price_per_day, v.prices, s.category AS service_category
     FROM vendors v
     LEFT JOIN services s ON v.service_id = s.id
     WHERE v.id = $1`,
    [v.vendor_id]
  );
  const vendor = vendorRes.rows[0];

  if (!vendor) {
    return { ok: false, error: `Vendor ${v.vendor_id} does not exist` };
  }
  if (!vendor.is_active) {
    return { ok: false, error: `Vendor ${v.vendor_id} is not currently active` };
  }

  if (v.service_category && vendor.service_category &&
      String(v.service_category).toLowerCase() !== String(vendor.service_category).toLowerCase()) {
    return { ok: false, error: `Vendor ${v.vendor_id} does not offer ${v.service_type || v.service_category}` };
  }

  const vendorPrices = vendor.prices || {};
  const coverageTypes = Array.isArray(v.coverage_types) ? v.coverage_types : [];

  let base;
  if (coverageTypes.length > 0) {
    for (const svc of coverageTypes) {
      if (!Object.prototype.hasOwnProperty.call(vendorPrices, svc)) {
        return { ok: false, error: `Vendor ${v.vendor_id} has not priced "${svc}"` };
      }
    }
    base = coverageTypes.reduce((sum, svc) => sum + (Number(vendorPrices[svc]) || 0), 0);
  } else {
    base = vendor.price_per_day != null ? Number(vendor.price_per_day) : 0;
  }

  const days = Number(v.days) || 1;
  const price = base * days;

  return { ok: true, vendor, price };
}

// ── Payment-flow helper ────────────────────────────────────────────────────────
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

    const anyDeclined = slots.some(s => s.status === 'declined');
    if (anyDeclined) return;

    const allAccepted = slots.length === 0 || slots.every(s => s.status === 'accepted');

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
  decoration_venue_id, decoration_venue_image, decoration_venue_title,
  reference_event_id, reference_event_image,
  reference_event_title, reference_event_type,
  reference_event_price,
  additional_details,
  vendors = [],
} = req.body;

    const validated = [];
    for (const v of vendors) {
      const result = await validateVendorSlot(v);
      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }
      validated.push({ input: v, vendor: result.vendor, price: result.price });
    }

const eventResult = await pool.query(
  `INSERT INTO event_requests
     (client_id, client_name, client_email, client_phone,
      event_name, event_type, event_date, event_time,
      location, capacity, budget_estimate, decoration_type,
      decoration_venue_id, decoration_venue_image, decoration_venue_title,
      reference_event_id, reference_event_image,
      reference_event_title, reference_event_type, reference_event_price,
      additional_details,
      status)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'pending')
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
    decoration_venue_id    || null,
    decoration_venue_image || null,
    decoration_venue_title || null,
    reference_event_id    ? String(reference_event_id) : null,
    reference_event_image || null,
    reference_event_title || null,
    reference_event_type  || null,
    reference_event_price || null,
    additional_details    || null,
  ]
);

    const eventId = eventResult.rows[0].id;

    for (const { input: v, vendor, price } of validated) {
      let vendorUserId = null;
      if (v.vendor_id) {
        const vuRes = await pool.query(
          `SELECT id FROM vendor_users WHERE vendor_id = $1 LIMIT 1`,
          [v.vendor_id]
        ).catch(() => ({ rows: [] }));
        vendorUserId = vuRes.rows[0]?.id || null;
      }

      const days = v.days || 1;

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
          v.vendor_id ? price : null,
          days,
          v.coverage_types?.length ? v.coverage_types : null,
          v.quantity     || null,
          v.vendor_notes || null,
          v.reference_event_id    ? String(v.reference_event_id) : null,
          v.reference_event_image || null,
        ]
      );
    }

    await emitEventUpdate(req.app.get('io'), eventId);

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
              decoration_venue_id, decoration_venue_image, decoration_venue_title,
              reference_event_id, reference_event_image,
              reference_event_title, reference_event_type, reference_event_price,
              additional_details,
              admin_notes, status, pre_cancellation_status, payment_status, created_at, updated_at
       FROM event_requests
       WHERE client_id = $1
       ORDER BY created_at DESC`,
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

// ── PATCH /api/events/:id/cancel — client REQUESTS cancellation ─────────────
// CHANGED: this used to cancel the event immediately, with no refund ever
// triggered from this path at all (refund only happened via admin's
// Terminate button). Per the agreed policy, a client cancelling on their
// own should get a 90% refund — but that needs an admin approval step in
// between, not an instant client-side cancel. So this route now only
// PARKS the request: status becomes 'cancellation_requested' (remembering
// the prior status in pre_cancellation_status so a denial can bounce it
// back), and nothing is refunded or actually cancelled yet.
//
// See PATCH /admin/:id/approve-cancellation below for the step that
// actually cancels the event and issues the 90% refund, and
// PATCH /admin/:id/deny-cancellation for rejecting the request.
router.patch('/:id/cancel', async (req, res) => {
  try {
    const token = getClientFromToken(req);
    if (!token?.id) return res.status(401).json({ error: 'Not authenticated' });

    const evRes = await pool.query(
      `SELECT status FROM event_requests WHERE id = $1 AND client_id = $2`,
      [req.params.id, token.id]
    );
    if (evRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const currentStatus = evRes.rows[0].status;
    if (['cancelled', 'completed', 'cancellation_requested'].includes(currentStatus)) {
      return res.status(400).json({ error: `Cannot request cancellation from status: ${currentStatus}` });
    }

    const result = await pool.query(
      `UPDATE event_requests
       SET pre_cancellation_status = status, status = 'cancellation_requested', updated_at = NOW()
       WHERE id = $1 AND client_id = $2
       RETURNING id`,
      [req.params.id, token.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Admin's tab should see this pending request live too.
    await emitEventUpdate(req.app.get('io'), req.params.id);

    res.json({ success: true, status: 'cancellation_requested' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/events/admin/:id/approve-cancellation ──────────────────────
// Admin approves a client's pending cancellation request: the event is
// actually cancelled now, and — if anything was paid — a FIXED 90% refund
// (CLIENT_CANCELLATION_REFUND_PCT) is issued across every paid instalment
// via refundAllPaidPayments(), which also cancels every pending
// vendor_payouts row for the event.
router.patch('/admin/:id/approve-cancellation', adminAuth, async (req, res) => {
  try {
    const evRes = await pool.query(
      `SELECT status, payment_status FROM event_requests WHERE id = $1`,
      [req.params.id]
    );
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'cancellation_requested') {
      return res.status(400).json({ error: 'This event has no pending cancellation request' });
    }

    await pool.query(
      `UPDATE event_requests
       SET status = 'cancelled', pre_cancellation_status = NULL,
           admin_notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.body.admin_notes || 'Client cancellation approved by admin — 90% refund issued', req.params.id]
    );

    const hasPaid = event.payment_status === 'advance_paid' || event.payment_status === 'fully_paid';
    let refundResult = null;

    if (hasPaid) {
      refundResult = await refundAllPaidPayments(
        req.app.get('io'),
        req.params.id,
        CLIENT_CANCELLATION_REFUND_PCT,
        'Client-requested cancellation approved by admin — 90% refund policy'
      );
    } else {
      await emitEventUpdate(req.app.get('io'), req.params.id);
    }

    res.json({ success: true, refund_pct: CLIENT_CANCELLATION_REFUND_PCT, refund: refundResult });
  } catch (err) {
    console.error('approve-cancellation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/events/admin/:id/deny-cancellation ─────────────────────────
// Admin denies the request — no refund, no cancellation. The event bounces
// back to whatever status it was in right before the client asked to
// cancel (falls back to 'admin_reviewing' only if that was somehow never
// recorded).
router.patch('/admin/:id/deny-cancellation', adminAuth, async (req, res) => {
  try {
    const evRes = await pool.query(
      `SELECT status, pre_cancellation_status FROM event_requests WHERE id = $1`,
      [req.params.id]
    );
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'cancellation_requested') {
      return res.status(400).json({ error: 'This event has no pending cancellation request' });
    }

    const revertTo = event.pre_cancellation_status || 'admin_reviewing';

    await pool.query(
      `UPDATE event_requests
       SET status = $1, pre_cancellation_status = NULL, updated_at = NOW()
       WHERE id = $2`,
      [revertTo, req.params.id]
    );

    await emitEventUpdate(req.app.get('io'), req.params.id);
    res.json({ success: true, status: revertTo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/admin/all — admin sees everything ────────────────────────
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const eventsRes = await pool.query(
  `SELECT id, client_id, client_name, client_email, client_phone,
          event_name, event_type, event_date::text AS event_date, event_time,
          location, capacity, budget_estimate, decoration_type,
          decoration_venue_id, decoration_venue_image, decoration_venue_title,
          reference_event_id, reference_event_image,
          reference_event_title, reference_event_type, reference_event_price,
          additional_details,
          admin_notes, status, pre_cancellation_status, payment_status, created_at, updated_at
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
router.patch('/admin/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    await pool.query(
      `UPDATE event_requests
       SET status = $1, admin_notes = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, admin_notes || null, req.params.id]
    );

    if (status === 'admin_approved') {
      await maybeAdvanceEventStatus(req.params.id);
    }

    await emitEventUpdate(req.app.get('io'), req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/events/admin/:id/reference-price ──────────────────────────
router.patch('/admin/:id/reference-price', adminAuth, async (req, res) => {
  try {
    const { reference_event_price } = req.body;
    const price = Number(reference_event_price);

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price required' });
    }

    const result = await pool.query(
      `UPDATE event_requests
       SET reference_event_price = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, reference_event_price`,
      [price, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await emitEventUpdate(req.app.get('io'), req.params.id);

    res.json({ success: true, reference_event_price: result.rows[0].reference_event_price });
  } catch (err) {
    console.error('PATCH /api/events/admin/:id/reference-price error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/events/vendor/requests — vendor sees their slots ────────────────
router.get('/vendor/requests', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (payload.type !== 'access') return res.status(401).json({ error: 'Invalid token' });
    const vendorUserId = payload.vendorUserId;
    if (!vendorUserId) return res.status(403).json({ error: 'Vendor access required' });

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
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (payload.type !== 'access') return res.status(401).json({ error: 'Invalid token' });
    const vendorUserId = payload.vendorUserId;
    if (!vendorUserId) return res.status(401).json({ error: 'Invalid token' });

    const { status, vendor_notes } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'status must be accepted or declined' });
    }
    const slotRes = await pool.query(
      `UPDATE event_vendor_slots
       SET status = $1, vendor_notes = $2, responded_at = NOW()
       WHERE id = $3
         AND (
           vendor_user_id = $4
           OR vendor_id IN (
             SELECT id FROM vendors WHERE id = (
               SELECT vendor_id FROM vendor_users WHERE id = $4 LIMIT 1
             )
           )
         )
       RETURNING event_id`,
      [status, vendor_notes || null, req.params.slotId, vendorUserId]
    );

    if (slotRes.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found or not yours' });
    }

    const eventId = slotRes.rows[0]?.event_id;
    if (eventId) {
      await maybeAdvanceEventStatus(eventId);
      await emitEventUpdate(req.app.get('io'), eventId);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;