const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all active services
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM services WHERE is_active = true ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new service (admin)
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    await pool.query(
      'INSERT INTO services (name, description) VALUES ($1, $2)',
      [name, description]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle service active/inactive (admin)
router.patch('/:id/toggle', async (req, res) => {
  try {
    await pool.query(
      'UPDATE services SET is_active = NOT is_active WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE service (admin)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;