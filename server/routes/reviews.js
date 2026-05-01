const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET reviews — pass ?all=true for all, otherwise only approved
router.get('/', async (req, res) => {
  try {
    let result;
    if (req.query.all === 'true') {
      result = await pool.query('SELECT * FROM reviews ORDER BY approved ASC, created_at DESC');
    } else {
      result = await pool.query('SELECT * FROM reviews WHERE approved = true ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new review
router.post('/', async (req, res) => {
  try {
    const { client_name, message, rating, approved } = req.body;
    await pool.query(
      'INSERT INTO reviews (client_name, message, rating, approved) VALUES ($1, $2, $3, $4)',
      [client_name, message, rating, approved === true || approved === 'true']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH approve a review
router.patch('/:id/approve', async (req, res) => {
  try {
    await pool.query('UPDATE reviews SET approved = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a review
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;