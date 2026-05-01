const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all bookings (admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookings ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new booking (from client)
router.post('/', async (req, res) => {
  try {
    const { client_name, phone, email, event_type, event_date, message } = req.body;
    await pool.query(
      'INSERT INTO bookings (client_name, phone, email, event_type, event_date, message) VALUES ($1, $2, $3, $4, $5, $6)',
      [client_name, phone, email, event_type, event_date, message]
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
    await pool.query(
      'UPDATE bookings SET status = $1 WHERE id = $2',
      [status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;