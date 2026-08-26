// server/routes/analytics.js
//
// Admin analytics endpoints. Mount in server.js the same way as your other
// admin routes, e.g.:
//   app.use('/api/analytics', require('./routes/analytics'));
//
// SCHEMA THIS FILE READS (all pre-existing, nothing new to migrate):
//   event_requests      — id, status, created_at, event_type, event_date, budget_estimate
//   event_vendor_slots  — event_id, vendor_id, service_type, status, created_at
//                          (this table IS the vendor/service usage log —
//                          every time a vendor+service gets attached to an
//                          event, a row lands here, so no new tracking
//                          table is needed for "which vendor/service is
//                          being used")
//   vendors             — id, name, specialty, is_active
//   services            — id, name, category, is_active
//   payments            — id, event_id, amount (paise), status, payment_type, created_at
//   vendor_payouts      — vendor_id, amount, commission_amount, status, created_at
//   users               — id, created_at (self-healing ADD COLUMN below,
//                          same pattern as auth.js does for `phone`)
//   queries             — id, created_at, is_booking, replied
//   reviews             — id, vendor_id, rating, created_at

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const adminAuth = require('../middleware/adminAuth');

// This whole router is admin-only — every route below reads revenue,
// vendor performance, and platform-wide activity data. Apply once here
// instead of per-route.
router.use(adminAuth);

// Self-healing column, same pattern used elsewhere in this codebase
// (auth.js adds `phone`, googleAuth.js adds `google_id`) — needed because
// the users table as shown in auth.js doesn't guarantee created_at exists.
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
  } catch (err) {
    // ignore if already exists
  }
})();

// ── Range helper ─────────────────────────────────────────────────────────
// '7d' | '30d' | '90d' -> { start, prevStart, prevEnd } for current-vs-
// previous-period delta comparisons on the stat cards.
function resolveRange(rangeParam) {
  const days = { '7d': 7, '30d': 30, '90d': 90 }[rangeParam] || 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, prevStart, prevEnd: start, days };
}

function pctDelta(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── GET /overview?range=7d|30d|90d ─────────────────────────────────────────
// Stat cards: events created, requests approved, new signups, revenue.
router.get('/overview', async (req, res) => {
  try {
    const { start, prevStart, prevEnd } = resolveRange(req.query.range);

    const [eventsCur, eventsPrev, approvedCur, approvedPrev, signupsCur, signupsPrev, revenueCur, revenuePrev] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) FROM event_requests WHERE created_at >= $1`, [start]),
        pool.query(`SELECT COUNT(*) FROM event_requests WHERE created_at >= $1 AND created_at < $2`, [prevStart, prevEnd]),
        pool.query(
          `SELECT COUNT(*) FROM event_requests
           WHERE updated_at >= $1
             AND status IN ('admin_approved','payment_pending','confirmed','completed')`,
          [start]
        ),
        pool.query(
          `SELECT COUNT(*) FROM event_requests
           WHERE updated_at >= $1 AND updated_at < $2
             AND status IN ('admin_approved','payment_pending','confirmed','completed')`,
          [prevStart, prevEnd]
        ),
        pool.query(`SELECT COUNT(*) FROM users WHERE created_at >= $1`, [start]),
        pool.query(`SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at < $2`, [prevStart, prevEnd]),
        pool.query(`SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'paid' AND created_at >= $1`, [start]),
        pool.query(`SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'paid' AND created_at >= $1 AND created_at < $2`, [prevStart, prevEnd]),
      ]);

    const eventsCount    = Number(eventsCur.rows[0].count);
    const approvedCount  = Number(approvedCur.rows[0].count);
    const signupsCount   = Number(signupsCur.rows[0].count);
    const revenuePaise   = Number(revenueCur.rows[0].coalesce);

    res.json({
      events_created:   { value: eventsCount,   delta_pct: pctDelta(eventsCount, Number(eventsPrev.rows[0].count)) },
      requests_approved:{ value: approvedCount, delta_pct: pctDelta(approvedCount, Number(approvedPrev.rows[0].count)) },
      new_signups:      { value: signupsCount,  delta_pct: pctDelta(signupsCount, Number(signupsPrev.rows[0].count)) },
      revenue_rupees:   {
        value: Math.round(revenuePaise / 100),
        delta_pct: pctDelta(revenuePaise, Number(revenuePrev.rows[0].coalesce)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /event-trend — last 6 months, created vs completed ────────────────
router.get('/event-trend', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        to_char(month_bucket, 'Mon') AS month,
        COUNT(*) FILTER (WHERE created_month = month_bucket) AS created,
        COUNT(*) FILTER (WHERE status = 'completed' AND updated_month = month_bucket) AS completed
      FROM (
        SELECT
          date_trunc('month', created_at) AS created_month,
          date_trunc('month', updated_at) AS updated_month,
          status
        FROM event_requests
        WHERE created_at >= NOW() - INTERVAL '6 months'
      ) e
      CROSS JOIN LATERAL (
        SELECT generate_series(
          date_trunc('month', NOW() - INTERVAL '5 months'),
          date_trunc('month', NOW()),
          '1 month'
        ) AS month_bucket
      ) m
      WHERE created_month = month_bucket OR updated_month = month_bucket
      GROUP BY month_bucket
      ORDER BY month_bucket
    `);
    res.json(result.rows.map(r => ({
      month: r.month,
      created: Number(r.created),
      completed: Number(r.completed),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /funnel?range= — requested → approved → confirmed ─────────────────
router.get('/funnel', async (req, res) => {
  try {
    const { start } = resolveRange(req.query.range);
    const result = await pool.query(
      `SELECT
         COUNT(*) AS requested,
         COUNT(*) FILTER (WHERE status IN ('admin_approved','payment_pending','confirmed','completed')) AS approved,
         COUNT(*) FILTER (WHERE status IN ('confirmed','completed')) AS confirmed
       FROM event_requests
       WHERE created_at >= $1`,
      [start]
    );
    const r = result.rows[0];
    res.json([
      { stage: 'Requested', value: Number(r.requested) },
      { stage: 'Approved',  value: Number(r.approved) },
      { stage: 'Confirmed', value: Number(r.confirmed) },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /vendor-usage?range=&limit=10 ──────────────────────────────────────
// Which vendors are actually being used: how many times a vendor got
// attached to an event, split by response (accepted/declined/pending), and
// revenue attributed to them via vendor_payouts. This is the direct answer
// to "which vendor is being used" — event_vendor_slots already logs every
// vendor-service attachment, so this is a straight aggregation, no new
// tracking table needed.
router.get('/vendor-usage', async (req, res) => {
  try {
    const { start } = resolveRange(req.query.range);
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const result = await pool.query(
      `SELECT
         v.id,
         v.name,
         v.specialty,
         COUNT(evs.id)                                       AS total_slots,
         COUNT(evs.id) FILTER (WHERE evs.status = 'accepted') AS accepted_slots,
         COUNT(evs.id) FILTER (WHERE evs.status = 'declined') AS declined_slots,
         COUNT(evs.id) FILTER (WHERE evs.status = 'pending')  AS pending_slots,
         COALESCE(SUM(vp.amount) FILTER (WHERE vp.status != 'cancelled'), 0) AS revenue_paise
       FROM event_vendor_slots evs
       JOIN vendors v ON evs.vendor_id = v.id
       LEFT JOIN vendor_payouts vp ON vp.vendor_id = v.id AND vp.created_at >= $1
       WHERE evs.created_at >= $1
       GROUP BY v.id, v.name, v.specialty
       ORDER BY total_slots DESC
       LIMIT $2`,
      [start, limit]
    );

    res.json(result.rows.map(r => ({
      vendor_id: r.id,
      name: r.name,
      specialty: r.specialty,
      total_slots: Number(r.total_slots),
      accepted_slots: Number(r.accepted_slots),
      declined_slots: Number(r.declined_slots),
      pending_slots: Number(r.pending_slots),
      revenue_rupees: Math.round(Number(r.revenue_paise) / 100),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /service-usage?range= ──────────────────────────────────────────────
// Which service categories (photography, decor, catering, etc.) are
// getting booked most, by counting event_vendor_slots.service_type. Also
// breaks in acceptance rate, since a service that's requested a lot but
// rarely accepted is a signal worth seeing (e.g. vendors in that category
// under-resourced, or priced wrong).
router.get('/service-usage', async (req, res) => {
  try {
    const { start } = resolveRange(req.query.range);
    const result = await pool.query(
      `SELECT
         COALESCE(evs.service_type, 'unspecified') AS service_type,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE evs.status = 'accepted') AS accepted
       FROM event_vendor_slots evs
       WHERE evs.created_at >= $1
       GROUP BY evs.service_type
       ORDER BY total DESC`,
      [start]
    );
    res.json(result.rows.map(r => ({
      service_type: r.service_type,
      total: Number(r.total),
      accepted: Number(r.accepted),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /activity?limit=10 — recent admin-relevant events, merged feed ────
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const result = await pool.query(
      `(
         SELECT 'event_request' AS type, event_name AS label, status AS detail, created_at
         FROM event_requests ORDER BY created_at DESC LIMIT $1
       )
       UNION ALL
       (
         SELECT 'query' AS type,
                CASE WHEN is_booking THEN 'Booking inquiry' ELSE 'Message inquiry' END AS label,
                client_name AS detail, created_at
         FROM queries ORDER BY created_at DESC LIMIT $1
       )
       UNION ALL
       (
         SELECT 'review' AS type, 'New review' AS label,
                CONCAT(rating, ' stars') AS detail, created_at
         FROM reviews ORDER BY created_at DESC LIMIT $1
       )
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
