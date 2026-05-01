const express = require('express');
const router = express.Router();
const pool = require('../db');

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
    const { client_name, email, phone, message } = req.body;
    await pool.query(
      'INSERT INTO queries (client_name, email, phone, message) VALUES ($1, $2, $3, $4)',
      [client_name, email, phone, message]
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