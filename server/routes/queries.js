const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ensure queries table has event_type and event_date columns
(async () => {
  try {
    await pool.query(`ALTER TABLE queries ADD COLUMN IF NOT EXISTS event_type TEXT`);
    await pool.query(`ALTER TABLE queries ADD COLUMN IF NOT EXISTS event_date DATE`);
  } catch (err) {
    // Ignore errors if columns already exist
  }
})();

// GET all queries (admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM queries ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new query (from client)
router.post('/', async (req, res) => {
  try {
    const { client_name, email, phone, message, vendor_id, event_type, event_date } = req.body;
    await pool.query(
      'INSERT INTO queries (client_name, email, phone, message, vendor_id, event_type, event_date) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [client_name, email, phone, message, vendor_id || null, event_type || null, event_date || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mark as replied (admin)
router.patch('/:id/replied', async (req, res) => {
  try {
    await pool.query(
      'UPDATE queries SET replied = true WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;