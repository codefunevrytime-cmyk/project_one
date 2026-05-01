const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all availability
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM availability ORDER BY date ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST set a date status (admin)
router.post('/', async (req, res) => {
  try {
    const { date, status, note } = req.body;
    await pool.query(
      `INSERT INTO availability (date, status, note) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (date) DO UPDATE SET status = $2, note = $3`,
      [date, status, note]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;