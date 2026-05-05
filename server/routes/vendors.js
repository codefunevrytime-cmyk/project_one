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

// GET all vendors
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET vendor portfolio images
router.get('/:id/portfolio', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_portfolio WHERE vendor_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET vendor tags
router.get('/:id/tags', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_tags WHERE vendor_id = $1',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload portfolio image
router.post('/:id/portfolio', upload.single('image'), async (req, res) => {
  try {
    const { caption, tags } = req.body;
    const image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const tagsArray = tags ? tags.split(',').map(t => t.trim()) : [];
    await pool.query(
      'INSERT INTO vendor_portfolio (vendor_id, image_url, caption, tags) VALUES ($1, $2, $3, $4)',
      [req.params.id, image_url, caption, tagsArray]
    );
    res.json({ success: true, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add vendor tag
router.post('/:id/tags', async (req, res) => {
  try {
    const { tag, tag_type } = req.body;
    await pool.query(
      'INSERT INTO vendor_tags (vendor_id, tag, tag_type) VALUES ($1, $2, $3)',
      [req.params.id, tag, tag_type || 'specialty']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add new vendor
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, specialty, contact, service_id, price_per_day } = req.body;
    const photo_url = req.file 
      ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
      : null;
    await pool.query(
      'INSERT INTO vendors (name, specialty, photo_url, contact, service_id, price_per_day) VALUES ($1, $2, $3, $4, $5, $6)',
      [name, specialty, photo_url, contact, service_id || null, price_per_day ? Number(price_per_day) : null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Vendor insert error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH update vendor price
router.patch('/:id/price', async (req, res) => {
  try {
    const { price_per_day } = req.body;
    await pool.query(
      'UPDATE vendors SET price_per_day = $1 WHERE id = $2',
      [price_per_day ? Number(price_per_day) : null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle vendor active/inactive
router.patch('/:id/toggle', async (req, res) => {
  try {
    await pool.query(
      'UPDATE vendors SET is_active = NOT is_active WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE portfolio image
router.delete('/portfolio/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vendor_portfolio WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE vendor tag
router.delete('/tags/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vendor_tags WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;