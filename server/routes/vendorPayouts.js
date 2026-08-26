// server/routes/vendorPayouts.js
// What Celeste owes each vendor (built up by createVendorPayouts() in
// payments.js every time a client payment clears) and admin's ability to
// mark those payouts as sent (UPI/NEFT, done outside this app).
//
// Each vendor_payouts row also carries commission_amount — the platform's
// cut taken specifically off that vendor's slot of the payment (see
// splitPayment()/createVendorPayouts() in payments.js). That's what powers
// the commission visibility below: admin sees how much commission it has
// earned from each vendor, and vendors see how much was taken off their
// own bookings.
//
// Monthly view: every payout row is bucketed by vp.created_at — i.e. the
// month the booking/commission actually happened, regardless of when the
// vendor payout was later marked paid. This keeps a pending payout from
// June showing under June even if it's settled in July. Pass ?month=
// (format 'YYYY-MM') to /admin and /admin/commission-summary to scope
// results to that month; omit it to see everything.

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');
const adminAuth = require('../middleware/adminAuth');

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try { return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET); } catch { return null; }
}

// 'YYYY-MM' -> [start, end) as UTC Date bounds, for a half-open created_at range.
function monthRange(monthStr) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr || '');
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1; // 0-based
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end   = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { start, end };
}

// ── GET /api/vendor-payouts/vendor — logged-in vendor's own payouts ──────
router.get('/vendor', async (req, res) => {
  try {
    const payload = verifyToken(req);
    if (!payload?.vendorUserId) return res.status(401).json({ error: 'Unauthorized' });

    const vuRes = await pool.query('SELECT vendor_id FROM vendor_users WHERE id = $1', [payload.vendorUserId]);
    const vendorId = vuRes.rows[0]?.vendor_id;
    if (!vendorId) return res.json({ payouts: [], pending_total: 0, paid_total: 0, commission_total: 0 });

    const result = await pool.query(
      `SELECT vp.*, er.event_name, er.event_type, er.event_date
       FROM vendor_payouts vp
       JOIN event_requests er ON vp.event_id = er.id
       WHERE vp.vendor_id = $1
       ORDER BY vp.created_at DESC`,
      [vendorId]
    );
    const payouts = result.rows;
    const pending_total = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
    const paid_total    = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

    // Commission Celeste has taken off THIS vendor's bookings — counted
    // from the moment the client's payment cleared, regardless of whether
    // the vendor's own payout has since been marked paid. Cancelled
    // payouts (refunded/reversed bookings) are excluded since that money
    // was never actually kept by anyone.
    const commission_total = payouts
      .filter(p => p.status !== 'cancelled')
      .reduce((s, p) => s + Number(p.commission_amount || 0), 0);

    res.json({ payouts, pending_total, paid_total, commission_total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vendor-payouts/admin?status=&month= — all payouts ───────────
// status: 'pending' | 'paid' | 'cancelled' (omit for all)
// month:  'YYYY-MM' — scopes to payouts whose booking happened that month
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const { status, month } = req.query;
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`vp.status = $${params.length}`);
    }
    if (month) {
      const range = monthRange(month);
      if (!range) return res.status(400).json({ error: 'Invalid month format, expected YYYY-MM' });
      params.push(range.start);
      conditions.push(`vp.created_at >= $${params.length}`);
      params.push(range.end);
      conditions.push(`vp.created_at < $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT vp.*, v.name AS vendor_name, er.event_name, er.event_type, er.event_date
       FROM vendor_payouts vp
       LEFT JOIN vendors v ON vp.vendor_id = v.id
       JOIN event_requests er ON vp.event_id = er.id
       ${where}
       ORDER BY vp.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vendor-payouts/admin/available-months ────────────────────────
// Distinct 'YYYY-MM' months that have at least one payout, newest first.
// Powers the month switcher on the admin dashboard.
router.get('/admin/available-months', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT to_char(created_at, 'YYYY-MM') AS month
       FROM vendor_payouts
       ORDER BY month DESC`
    );
    res.json(result.rows.map(r => r.month));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/vendor-payouts/admin/commission-summary?month= ──────────────
// Total platform commission earned FROM each vendor's bookings — i.e. what
// admin actually collected as its cut whenever a client paid for that
// vendor's slot. This is Celeste's own revenue, separate from `amount`
// (the vendor's share), attributed per vendor for visibility on the admin
// dashboard. Cancelled payouts are excluded (refunded/reversed bookings
// never resulted in real commission being kept). Pass ?month= (YYYY-MM) to
// scope to a single month; omit for all-time totals.
router.get('/admin/commission-summary', adminAuth, async (req, res) => {
  try {
    const { month } = req.query;
    const params = [];
    const conditions = [`vp.status != 'cancelled'`];

    if (month) {
      const range = monthRange(month);
      if (!range) return res.status(400).json({ error: 'Invalid month format, expected YYYY-MM' });
      params.push(range.start);
      conditions.push(`vp.created_at >= $${params.length}`);
      params.push(range.end);
      conditions.push(`vp.created_at < $${params.length}`);
    }

    const result = await pool.query(
      `SELECT vp.vendor_id, v.name AS vendor_name,
              COALESCE(SUM(vp.commission_amount), 0) AS commission_total,
              COALESCE(SUM(vp.amount), 0) AS vendor_share_total,
              COUNT(*) AS payout_count
       FROM vendor_payouts vp
       LEFT JOIN vendors v ON vp.vendor_id = v.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY vp.vendor_id, v.name
       ORDER BY commission_total DESC`,
      params
    );
    res.json(result.rows.map(r => ({
      vendor_id:          r.vendor_id,
      vendor_name:        r.vendor_name || `Vendor #${r.vendor_id}`,
      commission_total:   Number(r.commission_total),
      vendor_share_total: Number(r.vendor_share_total),
      payout_count:       Number(r.payout_count),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/vendor-payouts/:id/mark-paid ───────────────────────────────
// Body: { reference_note, admin_id }
router.patch('/:id/mark-paid', adminAuth, async (req, res) => {
  try {
    const { reference_note, admin_id } = req.body;
    const result = await pool.query(
      `UPDATE vendor_payouts SET status = 'paid', paid_at = NOW(), reference_note = $1, marked_by_admin_id = $2
       WHERE id = $3 AND status = 'pending' RETURNING *`,
      [reference_note || null, admin_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Payout not found or already settled' });
    res.json({ success: true, payout: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;