const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET client's own bookings by email
router.get('/my', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);
    const result = await pool.query(
      'SELECT * FROM bookings WHERE email = $1 ORDER BY created_at DESC',
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all bookings (admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new booking (from client)
router.post('/', async (req, res) => {
  try {
    const { client_name, phone, email, event_type, event_date, message, reference_image, decoration_location } = req.body;
    await pool.query(
      'INSERT INTO bookings (client_name, phone, email, event_type, event_date, message, reference_image, decoration_location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [client_name, phone, email, event_type, event_date, message, reference_image || null, decoration_location || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update booking status (admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update payment status
router.patch('/:id/payment-status', async (req, res) => {
  try {
    const { payment_status } = req.body;
    await pool.query('UPDATE bookings SET payment_status = $1 WHERE id = $2', [payment_status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH admin sends payment request to client
router.patch('/:id/request-payment', async (req, res) => {
  try {
    await pool.query('UPDATE bookings SET payment_requested = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH admin cancels/terminates booking
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query(
      `UPDATE bookings SET status = 'cancelled', cancelled = true, cancel_reason = $1 WHERE id = $2`,
      [reason || 'Cancelled by admin', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH client cancels their own booking
router.patch('/:id/client-cancel', async (req, res) => {
  try {
    const bookingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (bookingRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });

    const booking     = bookingRes.rows[0];
    const now         = new Date();
    const createdAt   = new Date(booking.created_at);
    const hoursSince  = (now - createdAt) / (1000 * 60 * 60);
    const eventDate   = booking.event_date ? new Date(booking.event_date) : null;
    const daysToEvent = eventDate ? (eventDate - now) / (1000 * 60 * 60 * 24) : 999;

    let refundPct    = 0;
    let refundPolicy = 'no_refund';
    if (daysToEvent > 7)      { refundPct = 100; refundPolicy = 'full'; }
    else if (hoursSince <= 48) { refundPct = 50;  refundPolicy = 'half'; }

    await pool.query(
      `UPDATE bookings SET status = 'cancelled', cancelled = true, cancel_reason = 'Cancelled by client', refund_policy = $1 WHERE id = $2`,
      [refundPolicy, req.params.id]
    );

    res.json({ success: true, refundPct, refundPolicy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
