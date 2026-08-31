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
//   cancelled        → MANUAL, via Terminate / client cancel.
// ─────────────────────────────────────────────────────────────────────────────
//
// ── CHANGES IN THIS VERSION ─────────────────────────────────────────────────
// decoration_venue_id / decoration_venue_image / decoration_venue_title:
// NEW columns backing the Create Event "decoration location" secondary
// screen (CreateEventPage.jsx's DecorationVenuePicker). Previously
// `decoration_type` only stored the category string (home/lawn/hotel/...);
// there was nowhere to persist which specific real photo the client picked
// for that category. decoration_venue_id points at decoration_venues.id
// (see routes/decorationVenues.js) when the photo came from that catalog;
// image/title are denormalized alongside it so /my and /admin/all can
// render the picked photo without an extra join, and so the record still
// makes sense even if that decoration_venues row is later deleted (FK is
// ON DELETE SET NULL on decoration_venue_id only — image/title are kept).
//
// maybeAdvanceEventStatus() (pre-existing): once ALL vendor slots on an
// event are 'accepted' AND admin has set status to 'admin_approved', the
// event is automatically flipped to 'payment_pending'. Checked from both
// sides (vendor responds, or admin approves) so it works regardless of
// which happens first.
//
// reference_event_price column: previously only gallery-sourced references
// carried a price (fixed gallery data, never stored on the event row
// itself). Now that clients can upload their OWN reference photo (no
// gallery row, no price), we persist a price on the event row so:
//   1. A client-uploaded reference's price (if/when admin sets one — see
//      PATCH /admin/:id/reference-price below) can be shown back to the
//      client.
//   2. It's readable from both /my and /admin/all without extra joins.
// This does NOT feed into budget_estimate automatically — budget_estimate
// is fixed at submission time and left untouched here, since a client may
// already have paid an advance against that original total.
//
// ── VENDOR SLOT VALIDATION ────────────────────────────────────────────────
// Previously, POST / trusted req.body.vendors wholesale: any vendor_id and
// quoted_price the client sent was inserted directly into
// event_vendor_slots, with no check that the vendor_id existed, was
// active, matched the requested service_type, or that the price was
// anything close to real. Since event_vendor_slots.quoted_price feeds
// straight into payout math (via effective_price in GET /my and
// GET /admin/all), a fabricated vendor_id/price pair could drive real
// payouts off a vendor that's inactive, deleted, or belongs to a
// different category entirely — or off an arbitrary price the client
// made up.
//
// validateVendorSlot() below re-fetches each vendor server-side and
// rejects the whole submission (400) if a slot references a vendor that
// doesn't exist, isn't active, whose service category doesn't match
// the vendor's actual category, or that requests a sub-service
// (coverage_type) the vendor never priced on their own profile. The price
// actually persisted mirrors CreateEventPage.jsx's computeVendorTotal()
// exactly: sum of the vendor's own per-sub-service prices for whichever
// coverage_types were picked (falling back to price_per_day if none
// were), × days.
//
// FIXED — category comparison used the wrong field entirely: it compared
// `v.service_type` (a human-readable display LABEL sent from the frontend,
// e.g. "Custom Invitations") against `vendor.service_category` (the DB
// SLUG, e.g. "custom-invitations"). A label with a space can never equal
// a slug with a hyphen, so this check failed for every single vendor slot
// on every single event submission, regardless of vendor or category —
// "Vendor N does not offer <service>" fired unconditionally. The frontend
// (CreateEventPage.jsx) now sends BOTH: `service_type` (label, kept as-is
// for display/storage) and a new `service_category` field carrying the
// same canonical slug (`VENDOR_SERVICE_CONFIGS[...].id`) that
// vendors.service_category actually stores. Validation below now compares
// slug-to-slug. If an older/cached frontend build sends no
// service_category at all, this check is skipped entirely rather than
// falling back to the broken label comparison — better to skip a
// secondary safety check than to hard-block 100% of submissions again.
// ─────────────────────────────────────────────────────────────────────────────
//
// ── SOCKET.IO LIVE UPDATES ────────────────────────────────────────────────
// emitEventUpdate(io, eventId) is called after every write that changes an
// event row OR a vendor slot's status, so both the client's MyEvents page
// and admin's AdminEventRequests page update live without a reload.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');
const { emitEventUpdate, emitAddonsUpdate } = require('../lib/emitEventUpdate');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('../middleware/rateLimit');

// Same per-IP throttle pattern used in auth.js / admin.js / etc. This
// router was previously unthrottled — event creation (POST /) and vendor
// slot responses were both callable at unlimited rate per IP.
router.use(rateLimit({ max: 30 }));

// ── Auto-migrate ──────────────────────────────────────────────────────────────
async function ensureTables() {
  // Main event requests table
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

  // Add missing columns to existing table if they don't exist
  const alterColumns = [
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS client_id INTEGER`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS client_name TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_id TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_image TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_title TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_type TEXT`,
  // NEW: price for a reference event/image. Nullable/0 by default — a
  // client-uploaded photo starts with no price until admin sets one via
  // PATCH /admin/:id/reference-price.
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS reference_event_price NUMERIC`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS payment_status TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS additional_details TEXT`,
  // NEW — the specific decoration venue photo picked on the Create Event
  // secondary screen (see decorationVenues.js). decoration_type keeps
  // storing just the category (home/lawn/hotel/...) as before.
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS decoration_venue_id INTEGER REFERENCES decoration_venues(id) ON DELETE SET NULL`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS decoration_venue_image TEXT`,
  `ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS decoration_venue_title TEXT`,
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

// ── NEW: server-side vendor slot validation ───────────────────────────────────
// Re-fetches the vendor from the DB (never trusts the client's payload) and
// checks it exists, is active, and — if the client specified a
// service_category — that it matches the vendor's actual service category.
//
// ALSO computes the authoritative price here, mirroring
// CreateEventPage.jsx's computeVendorTotal() exactly:
//   - if the client picked sub-services (coverage_types), sum THIS
//     vendor's own price for each one (from the vendors.prices JSONB
//     column they set on their own profile)
//   - otherwise fall back to price_per_day
//   - multiply by days
// The "multiply by days" step matches frontend behaviour for BOTH pricing
// models without the backend needing to know which one a service_type
// uses: only "perDay" services ever send a real `days` value in the
// payload (see CreateEventPage.jsx's extraFields config) — a "flat"
// service never sends `days`, so it defaults to 1 here and the
// multiplication is a no-op, same as frontend's `if (pricingModel ===
// "flat") return base` short-circuit.
//
// Any coverage_type the client sends that the vendor hasn't actually
// priced (missing from vendors.prices) is rejected outright, rather than
// silently contributing ₹0 — otherwise a client could request a
// sub-service the vendor never offered/priced and get it inserted for
// free, which is its own price-fabrication path even with the flat-price
// fallback closed off.
//
// Returns { ok: true, vendor, price } on success or { ok: false, error }
// on failure; the caller rejects the whole submission on any failure
// rather than silently dropping/ignoring the bad slot, since a
// partially-created event with missing vendor coverage is its own kind
// of confusing state.
async function validateVendorSlot(v) {
  if (!v.vendor_id) {
    // No vendor attached to this slot at all — nothing to validate.
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

  // FIXED: was comparing v.service_type (display LABEL, e.g. "Custom
  // Invitations") against vendor.service_category (DB SLUG, e.g.
  // "custom-invitations") — a label can never equal a slug, so this check
  // rejected every single vendor slot on every submission unconditionally.
  // Now compares v.service_category (the canonical slug the frontend now
  // sends alongside service_type — see CreateEventPage.jsx's
  // vendorsPayload construction) against vendor.service_category, i.e.
  // slug-to-slug. If the client payload doesn't include service_category
  // at all (e.g. a stale cached frontend bundle), this check is skipped
  // rather than falling back to the old broken comparison — a missing
  // secondary safety check is far better than hard-blocking every
  // submission again.
  if (v.service_category && vendor.service_category &&
      String(v.service_category).toLowerCase() !== String(vendor.service_category).toLowerCase()) {
    return { ok: false, error: `Vendor ${v.vendor_id} does not offer ${v.service_type || v.service_category}` };
  }

  const vendorPrices = vendor.prices || {};
  const coverageTypes = Array.isArray(v.coverage_types) ? v.coverage_types : [];

  let base;
  if (coverageTypes.length > 0) {
    for (const svc of coverageTypes) {
      // hasOwnProperty (not just a truthy/undefined check) so a
      // legitimately-priced-at-0 sub-service isn't confused with one the
      // vendor never priced at all.
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

    const anyDeclined = slots.some(s => s.status === 'declined');
    if (anyDeclined) return; // needs manual resolution

    // A zero-vendor event (a simple booking with no vendors attached) has
    // nothing to wait on — "all vendors accepted" is trivially true since
    // there are no vendors. Previously this function returned early on an
    // empty slots array, which meant a zero-vendor event could NEVER
    // advance past 'admin_approved' no matter what admin did, since there
    // was nothing left to trigger the check again.
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

    // NEW: validate every vendor slot BEFORE creating anything. Fail the
    // whole submission (400) rather than the event partially existing
    // with a bad/missing vendor slot — a client resubmits from scratch
    // instead of ending up with a half-broken event to sort out later.
    const validated = [];
    for (const v of vendors) {
      const result = await validateVendorSlot(v);
      if (!result.ok) {
        return res.status(400).json({ error: result.error });
      }
      // FIXED: validateVendorSlot() computes the authoritative price and
      // returns it as result.price, but it was never carried into this
      // array — only input/vendor were kept. The insert loop below
      // destructures `price` back out of `validated`, so it was always
      // `undefined` (-> stored as NULL in quoted_price) regardless of
      // whether vendor_id was set or the price calc succeeded. This is
      // what caused vendors to see ₹0 while the client's budget screen
      // (which computes its own total client-side) showed the correct
      // amount.
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

    // New submission — tell the admin room right away so a fresh request
    // shows up on AdminEventRequests without a reload. No client room
    // push needed here since the client already has this in local state
    // from the form they just submitted.
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
              admin_notes, status, payment_status, created_at, updated_at
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

    // Admin's tab should see the cancellation live too.
    await emitEventUpdate(req.app.get('io'), req.params.id);

    res.json({ success: true });
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
router.patch('/admin/:id/status', adminAuth, async (req, res) => {
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

    // Emit AFTER maybeAdvanceEventStatus so the client gets whatever the
    // final status ended up being (admin_approved OR payment_pending),
    // not a stale intermediate value.
    await emitEventUpdate(req.app.get('io'), req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/events/admin/:id/reference-price — admin sets a price on a
//    client-uploaded reference image ──────────────────────────────────────────
// A gallery-picked reference already carries its own price from the gallery
// data itself. A client-uploaded photo (reference_event_id IS NULL but
// reference_event_image IS NOT NULL) has no price at all — this lets admin
// attach a ballpark estimate after reviewing the photo.
//
// Deliberately scoped narrow: only updates reference_event_price, never
// budget_estimate. budget_estimate was fixed at submission time and the
// client may already have paid an advance against it — silently changing
// the total here would be surprising and could desync it from what was
// actually paid for. If you want the admin's estimate to also roll into
// the total budget, that needs its own explicit flow (and a decision on
// how to handle events that already have a payment against them).
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
// FIXED: was accepting any valid vendor JWT with no `type` check — a vendor
// refresh token (30-day life, meant to live only in the HttpOnly cookie —
// see issueVendorTokens() in vendorAuth.js) has the exact same
// { vendorUserId, type } shape as an access token, differing only in
// `type`. vendorAuth.js's own middleware and vendorOrAdminAuth.js both
// already enforce `type === 'access'` for this reason; this route never
// did, so a leaked refresh token would work here identically to a
// legitimate 15-minute access token.
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
// FIXED: this route had NO auth check at all — anyone who knew or guessed
// a slotId could accept/decline any vendor's booking slot. Now requires a
// valid vendor token, and the UPDATE is scoped so a vendor can only touch
// their own slots (same ownership check as GET /vendor/requests above).
//
// FIXED (2): also now enforces `type === 'access'` — same reasoning as
// GET /vendor/requests above. Without it, a leaked vendor refresh token
// could be used to accept/decline booking slots directly.
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
      // Vendor just accepted/declined — check if this completes the
      // "all vendors accepted + admin approved" condition.
      await maybeAdvanceEventStatus(eventId);

      // Either way (accepted, declined, or auto-advanced to
      // payment_pending), both the client and admin should see the vendor
      // status change live.
      await emitEventUpdate(req.app.get('io'), eventId);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;