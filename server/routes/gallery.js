const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET all published gallery images
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gallery WHERE is_published = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload new gallery image (admin)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, event_date } = req.body;
    const image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    await pool.query(
      'INSERT INTO gallery (title, image_url, description, event_date) VALUES ($1, $2, $3, $4)',
      [title, image_url, description, event_date]
    );
    res.json({ success: true, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE gallery image (admin)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;