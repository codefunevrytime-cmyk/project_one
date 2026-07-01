const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// Create bookings table if it doesn't exist, add missing columns if table exists
async function ensureBookingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        client_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        event_type TEXT,
        event_date DATE,
        message TEXT,
        reference_image TEXT,
        decoration_location TEXT,
        reference_event_id INTEGER,
        status TEXT DEFAULT 'new',
        payment_status TEXT,
        payment_requested BOOLEAN DEFAULT false,
        cancelled BOOLEAN DEFAULT false,
        cancel_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add missing columns to existing table
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reference_event_id INTEGER`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reference_image TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS decoration_location TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_requested BOOLEAN DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT`).catch(() => {});

    // Columns needed for vendor assignment + response tracking
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_status TEXT DEFAULT 'pending'`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vendor_notes TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quoted_price NUMERIC`).catch(() => {});

  } catch (err) {
    // table ready or already exists
  }
}
ensureBookingsTable();

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

// GET bookings assigned to a specific vendor
// Called by VendorEventRequests.jsx as GET /bookings/vendor-requests/:vendorId
router.get('/vendor-requests/:vendorId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bookings
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [req.params.vendorId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new booking (from client)
router.post('/', async (req, res) => {
  try {
    const { client_name, phone, email, event_type, event_date, message, reference_image, decoration_location, reference_event_id } = req.body;
    await pool.query(
      'INSERT INTO bookings (client_name, phone, email, event_type, event_date, message, reference_image, decoration_location, reference_event_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [client_name, phone, email, event_type, event_date, message, reference_image || null, decoration_location || null, reference_event_id || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Booking error:', err);
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

// PATCH vendor responds to a booking request (accept / decline)
// Called by VendorEventRequests.jsx as PATCH /bookings/:id/vendor-response
router.patch('/:id/vendor-response', async (req, res) => {
  try {
    const { status, vendor_notes } = req.body;
    await pool.query(
      `UPDATE bookings SET vendor_status = $1, vendor_notes = $2 WHERE id = $3`,
      [status, vendor_notes || null, req.params.id]
    );
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
    if (daysToEvent > 7)       { refundPct = 100; refundPolicy = 'full'; }
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