const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const adminAuth = require('../middleware/adminAuth');
const { finalizeImageUpload } = require('../lib/imageUpload');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  // Temp name only — the real extension is assigned by finalizeImageUpload()
  // below, after it sniffs the file's actual magic bytes. Never derive it
  // from file.originalname (client-controlled — see lib/imageUpload.js).
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '.tmp');
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });

// Must match LANDING_SLOTS in AdminGallery.jsx (the 3x3 grid on
// LandingPage.jsx). The frontend disables the toggle button once this many
// items are marked, but that's UI-only — a direct API call (POST / with
// show_on_landing=true, or PATCH /:id/landing) bypassed it entirely, so the
// cap is enforced here too, server-side, as the actual source of truth.
const LANDING_SLOTS = 9;

async function landingCount() {
  const result = await pool.query('SELECT COUNT(*) FROM gallery WHERE show_on_landing = true');
  return Number(result.rows[0].count);
}

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

// ── Ensure gallery.show_on_landing column exists ─────────────────────────
// Marks a gallery item to appear in the hardcoded-style 3x3 grid on
// LandingPage.jsx. As admin marks more items, LandingPage.jsx fills fewer
// hardcoded placeholder slots (see frontend logic).
async function ensureLandingColumn() {
  await pool.query(`ALTER TABLE gallery ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT false`);
}
ensureLandingColumn().catch(console.error);

// ── GET all published gallery items (with extra images array) ─────────────
// ?event_type=  → filter by event type
// ?landing=true → only items marked show_on_landing (used by LandingPage.jsx)
router.get('/', async (req, res) => {
  try {
    let query  = 'SELECT * FROM gallery WHERE is_published = true';
    const params = [];

    if (req.query.event_type) {
      params.push(req.query.event_type);
      query += ` AND event_type = $${params.length}`;
    }

    if (req.query.landing === 'true') {
      query += ' AND show_on_landing = true';
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
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, event_date, price, tags, event_type, venue, scale, show_on_landing } = req.body;
    if (!req.file) return res.status(400).json({ error: 'A JPEG, PNG, or WebP image is required' });

    // FIXED: finalizeImageUpload() verifies the file's real magic bytes AND
    // renames it to an extension derived from that verified type — never
    // from the client-supplied original filename. See lib/imageUpload.js
    // for why trusting the original extension is a stored-XSS vector.
    const finalFilename = await finalizeImageUpload(req.file);
    if (!finalFilename) return res.status(400).json({ error: 'Uploaded file is not a valid JPEG, PNG, or WebP image' });

    // FIXED: store a relative path instead of a full URL built from
    // req.protocol/req.get('host'). A full URL bakes in whatever host the
    // upload request happened to hit (e.g. localhost:5000, or an ngrok
    // tunnel that changes every restart) — so the image only ever loads
    // correctly from that exact host. A relative path always resolves
    // against whatever host is currently serving the frontend, on any
    // device (laptop, phone via ngrok, production domain, etc).
    const image_url  = `/uploads/${finalFilename}`;
    const tagsArray  = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    let showOnLanding = show_on_landing === 'true' || show_on_landing === true;

    // Enforce the same cap the toggle route enforces below — a crafted
    // upload request setting show_on_landing=true was a second way past
    // the frontend-only limit, bypassing /:id/landing entirely.
    if (showOnLanding && (await landingCount()) >= LANDING_SLOTS) {
      return res.status(400).json({ error: `All ${LANDING_SLOTS} landing page slots are full. Remove one before adding another.` });
    }

    const insertResult = await pool.query(
      `INSERT INTO gallery
         (title, image_url, description, event_date, price, tags, event_type, venue, scale, show_on_landing)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        showOnLanding,
      ]
    );

    res.json({ success: true, image_url, id: insertResult.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST add extra image to an existing gallery item ─────────────────────
router.post('/:id/images', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { caption, sort_order } = req.body;
    if (!req.file) return res.status(400).json({ error: 'A JPEG, PNG, or WebP image is required' });

    // FIXED: see note in the '/' POST route above.
    const finalFilename = await finalizeImageUpload(req.file);
    if (!finalFilename) return res.status(400).json({ error: 'Uploaded file is not a valid JPEG, PNG, or WebP image' });
    const image_url = `/uploads/${finalFilename}`;

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

// ── PATCH toggle show_on_landing for a gallery item (admin) ──────────────
router.patch('/:id/landing', adminAuth, async (req, res) => {
  try {
    const current = await pool.query('SELECT show_on_landing FROM gallery WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const isCurrentlyOn = current.rows[0].show_on_landing === true;
    // Only check the cap when turning ON — turning off always succeeds and
    // never needs the count. Check + toggle isn't atomic against a second
    // concurrent request, but this is a low-traffic admin-only action, so
    // a rare off-by-one race is an acceptable tradeoff for keeping this a
    // single simple query pair rather than a transaction/row lock.
    if (!isCurrentlyOn && (await landingCount()) >= LANDING_SLOTS) {
      return res.status(400).json({ error: `All ${LANDING_SLOTS} landing page slots are full. Remove one before adding another.` });
    }

    const result = await pool.query(
      `UPDATE gallery SET show_on_landing = NOT COALESCE(show_on_landing, false)
       WHERE id = $1 RETURNING show_on_landing`,
      [req.params.id]
    );
    res.json({ success: true, show_on_landing: result.rows[0].show_on_landing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE an extra image ─────────────────────────────────────────────────
router.delete('/images/:imageId', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM gallery_images WHERE id = $1', [req.params.imageId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE gallery item (admin) ───────────────────────────────────────────
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    // gallery_images cascade deletes automatically
    await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;