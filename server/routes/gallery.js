const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const multer  = require('multer');
const path    = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ── GET all published images (with optional event_type filter) ────────────
router.get('/', async (req, res) => {
  try {
    let query  = 'SELECT * FROM gallery WHERE is_published = true';
    const params = [];

    if (req.query.event_type) {
      params.push(req.query.event_type);
      query += ` AND event_type = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST upload new gallery image (admin) ─────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, event_date, price, tags, event_type, venue, scale } = req.body;

    const image_url  = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const tagsArray  = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    await pool.query(
      `INSERT INTO gallery
         (title, image_url, description, event_date, price, tags, event_type, venue, scale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        title,
        image_url,
        description,
        event_date  || null,
        price       || 0,
        tagsArray,
        event_type  || '',
        venue       || '',
        scale       || '',
      ]
    );

    res.json({ success: true, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE gallery image (admin) ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
