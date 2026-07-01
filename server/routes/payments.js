const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const Razorpay = require('razorpay');
const crypto   = require('crypto');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
// `booking_id` in the payload is actually event_requests.id — kept the
// same field name on the wire so PaymentCheckout.jsx doesn't need changes.
router.post('/create-order', async (req, res) => {
  try {
    const { booking_id, amount } = req.body;

    // Sanity check: make sure this event exists and is actually ready for payment
    const evRes = await pool.query('SELECT id, status FROM event_requests WHERE id = $1', [booking_id]);
    const event = evRes.rows[0];
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.status !== 'payment_pending' && event.status !== 'confirmed') {
      return res.status(400).json({ error: 'This event is not ready for payment yet' });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt:  `event_${booking_id}`,
      notes:    { event_id: String(booking_id) },
    });

    // Ensure payments table has commission columns
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_commission DECIMAL`).catch(() => {});
    await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_share DECIMAL`).catch(() => {});

    await pool.query(
      'INSERT INTO payments (booking_id, razorpay_order_id, amount, status, payment_type) VALUES ($1, $2, $3, $4, $5)',
      [booking_id, order.id, amount, 'pending', 'advance']
    );
    res.json({ success: true, order_id: order.id, amount, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/verify
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // booking_id here refers to event_requests.id
    const eventRes = await pool.query('SELECT * FROM event_requests WHERE id = $1', [booking_id]);
    const event = eventRes.rows[0];
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const paymentRes = await pool.query('SELECT * FROM payments WHERE razorpay_order_id = $1', [razorpay_order_id]);
    const payment = paymentRes.rows[0];
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Calculate admin commission and vendor share.
    // event_requests doesn't currently store a per-event commission %,
    // so default to 15% here. If you later add an admin_commission_pct
    // column to event_requests, swap the literal below for it.
    const adminCommissionPct = event.admin_commission_pct || 15;
    const totalAmount = payment.amount;
    const adminCommission = Math.round(totalAmount * (adminCommissionPct / 100));
    const vendorShare = totalAmount - adminCommission;

    await pool.query(
      'UPDATE payments SET razorpay_payment_id = $1, status = $2, admin_commission = $3, vendor_share = $4 WHERE razorpay_order_id = $5',
      [razorpay_payment_id, 'paid', adminCommission, vendorShare, razorpay_order_id]
    );

    await pool.query(
      `UPDATE event_requests SET payment_status = 'advance_paid', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    res.json({ success: true, adminCommission, vendorShare });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/refund  (admin cancels or client cancels after paying)
router.post('/refund', async (req, res) => {
  try {
    const { booking_id, refund_pct } = req.body;

    // Find the paid payment for this event
    const payRes = await pool.query(
      `SELECT * FROM payments WHERE booking_id = $1 AND status = 'paid' ORDER BY created_at DESC LIMIT 1`,
      [booking_id]
    );
    if (payRes.rows.length === 0) return res.json({ success: true, message: 'No payment to refund' });

    const payment    = payRes.rows[0];
    const refundAmt  = Math.round((payment.amount * (refund_pct || 100)) / 100);

    const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
      amount: refundAmt,
      notes:  { event_id: String(booking_id), reason: 'Booking cancelled' },
    });

    await pool.query(
      `UPDATE payments SET status = 'refunded', refund_id = $1, refund_amount = $2 WHERE id = $3`,
      [refund.id, refundAmt, payment.id]
    );

    await pool.query(
      `UPDATE event_requests SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    ).catch(() => {});

    res.json({ success: true, refund_id: refund.id, refund_amount: refundAmt });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/history?email=
router.get('/history', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);
    const result = await pool.query(
      `SELECT p.*,
              e.event_type,
              e.event_date,
              e.event_name,
              e.client_name,
              e.client_email AS email,
              e.status       AS booking_status
       FROM payments p
       JOIN event_requests e ON p.booking_id = e.id
       WHERE e.client_email = $1
       ORDER BY p.created_at DESC`,
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;