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

// ── Ensure gallery_images table exists ───────────────────────────────────
async function ensureGalleryImagesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gallery_images (
      id         SERIAL PRIMARY KEY,
      gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
      image_url  TEXT NOT NULL,
      caption    TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
ensureGalleryImagesTable().catch(console.error);

// ── GET all published gallery items (with extra images array) ─────────────
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
    const rows = result.rows;

    if (rows.length === 0) return res.json([]);

    // Fetch all extra images for these gallery items in one query
    const ids = rows.map(r => r.id);
    const imgResult = await pool.query(
      `SELECT * FROM gallery_images WHERE gallery_id = ANY($1) ORDER BY gallery_id, sort_order, id`,
      [ids]
    );

    // Group extra images by gallery_id
    const extraImagesMap = {};
    for (const img of imgResult.rows) {
      if (!extraImagesMap[img.gallery_id]) extraImagesMap[img.gallery_id] = [];
      extraImagesMap[img.gallery_id].push(img);
    }

    // Merge: primary image first, then extras
    const enriched = rows.map(row => {
      const extras = extraImagesMap[row.id] || [];
      const images = [
        ...(row.image_url ? [row.image_url] : []),
        ...extras.map(e => e.image_url),
      ];
      return { ...row, images, gallery_images: extras };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST upload new gallery item (admin) ─────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, event_date, price, tags, event_type, venue, scale } = req.body;

    const image_url  = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const tagsArray  = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const insertResult = await pool.query(
      `INSERT INTO gallery
         (title, image_url, description, event_date, price, tags, event_type, venue, scale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
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

    res.json({ success: true, image_url, id: insertResult.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST add extra image to an existing gallery item ─────────────────────
router.post('/:id/images', upload.single('image'), async (req, res) => {
  try {
    const { caption, sort_order } = req.body;
    const image_url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    await pool.query(
      `INSERT INTO gallery_images (gallery_id, image_url, caption, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, image_url, caption || null, sort_order || 0]
    );

    res.json({ success: true, image_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET extra images for a gallery item ───────────────────────────────────
router.get('/:id/images', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM gallery_images WHERE gallery_id = $1 ORDER BY sort_order, id`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE an extra image ─────────────────────────────────────────────────
router.delete('/images/:imageId', async (req, res) => {
  try {
    await pool.query('DELETE FROM gallery_images WHERE id = $1', [req.params.imageId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE gallery item (admin) ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    // gallery_images cascade deletes automatically
    await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;