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
router.post('/create-order', async (req, res) => {
  try {
    const { booking_id, amount } = req.body;
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt:  `booking_${booking_id}`,
      notes:    { booking_id: String(booking_id) },
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

    // Get booking details for payment splitting
    const bookingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    const booking = bookingRes.rows[0];
    const paymentRes = await pool.query('SELECT * FROM payments WHERE razorpay_order_id = $1', [razorpay_order_id]);
    const payment = paymentRes.rows[0];
    
    // Calculate admin commission and vendor share
    const adminCommissionPct = booking.admin_commission_pct || 15;
    const totalAmount = payment.amount;
    const adminCommission = Math.round(totalAmount * (adminCommissionPct / 100));
    const vendorShare = totalAmount - adminCommission;

    await pool.query(
      'UPDATE payments SET razorpay_payment_id = $1, status = $2, admin_commission = $3, vendor_share = $4 WHERE razorpay_order_id = $5',
      [razorpay_payment_id, 'paid', adminCommission, vendorShare, razorpay_order_id]
    );
    await pool.query(
      `UPDATE bookings SET payment_status = 'advance_paid', status = 'confirmed' WHERE id = $1`,
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

    // Find the paid payment for this booking
    const payRes = await pool.query(
      `SELECT * FROM payments WHERE booking_id = $1 AND status = 'paid' ORDER BY created_at DESC LIMIT 1`,
      [booking_id]
    );
    if (payRes.rows.length === 0) return res.json({ success: true, message: 'No payment to refund' });

    const payment    = payRes.rows[0];
    const refundAmt  = Math.round((payment.amount * (refund_pct || 100)) / 100);

    const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
      amount: refundAmt,
      notes:  { booking_id: String(booking_id), reason: 'Booking cancelled' },
    });

    await pool.query(
      `UPDATE payments SET status = 'refunded', refund_id = $1, refund_amount = $2 WHERE id = $3`,
      [refund.id, refundAmt, payment.id]
    );

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
      `SELECT p.*, b.event_type, b.event_date, b.message, b.client_name, b.email, b.status as booking_status
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE b.email = $1
       ORDER BY p.created_at DESC`,
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
