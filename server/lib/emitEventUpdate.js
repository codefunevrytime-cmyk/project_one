// server/lib/emitEventUpdate.js
//
// Shared by routes/events.js and routes/payments.js. Any time an event's
// row changes (status, payment_status, reference_event_price) or one of
// its vendor slots changes (accept/decline), call emitEventUpdate(io, id)
// right after the DB write. It re-reads the full event (same shape as
// GET /my and GET /admin/all return) and pushes it to:
//   - client:<client_id>  → that client's MyEvents tab updates live
//   - admin                → every open admin tab updates live too
//
// Safe to call even if io is undefined (e.g. in a script/test context) —
// it just no-ops.
//
// NOTE: decoration_venue_id/image/title added below so a live push carries
// the same decoration-venue-photo fields that GET /my and GET /admin/all
// already return (see routes/events.js + routes/decorationVenues.js).

const pool = require('../db');

async function getFullEvent(eventId) {
  const evRes = await pool.query(
    `SELECT id, client_id, client_name, client_email, client_phone,
            event_name, event_type, event_date::text AS event_date, event_time,
            location, capacity, budget_estimate, decoration_type,
            decoration_venue_id, decoration_venue_image, decoration_venue_title,
            reference_event_id, reference_event_image,
            reference_event_title, reference_event_type, reference_event_price,
            additional_details,
            admin_notes, status, payment_status, created_at, updated_at
     FROM event_requests WHERE id = $1`,
    [eventId]
  );
  const event = evRes.rows[0];
  if (!event) return null;

  const slotsRes = await pool.query(
    `SELECT evs.*,
            v.name  AS vendor_name,
            v.price_per_day AS vendor_current_price,
            vu.name AS business_name,
            COALESCE(NULLIF(evs.quoted_price, 0), v.price_per_day * COALESCE(evs.days, 1)) AS effective_price
     FROM event_vendor_slots evs
     LEFT JOIN vendors      v  ON evs.vendor_id      = v.id
     LEFT JOIN vendor_users vu ON evs.vendor_user_id = vu.id
     WHERE evs.event_id = $1`,
    [eventId]
  );

  return { ...event, vendors: slotsRes.rows };
}

async function emitEventUpdate(io, eventId) {
  if (!io || !eventId) return;
  try {
    const event = await getFullEvent(eventId);
    if (!event) return;
    console.log(`[emit] event:update for event ${eventId} → client:${event.client_id} (+admin)`);
    io.to(`client:${event.client_id}`).emit('event:update', event);
    io.to('admin').emit('event:update', event);
  } catch (err) {
    console.error('emitEventUpdate failed:', err.message);
  }
}

// Add-on charges live in their own table (event_addons) and are fetched by
// the frontend separately from the main event row, so they get their own
// socket event rather than being folded into 'event:update'. Call this
// after creating an add-on, cancelling one, or marking one paid.
async function emitAddonsUpdate(io, eventId) {
  if (!io || !eventId) return;
  try {
    const evRes = await pool.query(`SELECT client_id FROM event_requests WHERE id = $1`, [eventId]);
    const clientId = evRes.rows[0]?.client_id;
    if (!clientId) return;

    const addonsRes = await pool.query(
      `SELECT * FROM event_addons WHERE event_id = $1 ORDER BY created_at DESC`,
      [eventId]
    );

    const payload = { event_id: Number(eventId), addons: addonsRes.rows };
    io.to(`client:${clientId}`).emit('addons:update', payload);
    io.to('admin').emit('addons:update', payload);
  } catch (err) {
    console.error('emitAddonsUpdate failed:', err.message);
  }
}

module.exports = { emitEventUpdate, emitAddonsUpdate, getFullEvent };