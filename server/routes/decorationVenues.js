// server/routes/decorationVenues.js
//
// Admin-managed catalog of real decoration-venue photos, grouped by
// venue_type (home / lawn / hotel / restaurant / banquet / outdoor — the
// same values CreateEventPage.jsx's DECORATION_LOCATIONS dropdown already
// uses). This is what powers the "secondary screen with real images"
// picker on Create Event: client picks a category from the dropdown, then
// browses actual uploaded photos for that category instead of an emoji.
//
// Mount in server.js:
//   app.use('/api/decoration-venues', require('./routes/decorationVenues'));

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const jwt     = require('jsonwebtoken');
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
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

// Mirrors CreateEventPage.jsx's DECORATION_LOCATIONS values (minus the
// empty "None" option, which never needs its own photo catalog).
const VALID_TYPES = ['home', 'lawn', 'hotel', 'restaurant', 'banquet', 'outdoor'];

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS decoration_venues (
      id          SERIAL PRIMARY KEY,
      venue_type  TEXT NOT NULL,
      title       TEXT NOT NULL,
      image_url   TEXT NOT NULL,
      description TEXT,
      is_active   BOOLEAN DEFAULT true,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_decoration_venues_type ON decoration_venues(venue_type)`
  ).catch(() => {});
}
ensureTable().catch(console.error);

// ── GET /api/decoration-venues?type=lawn ──────────────────────────────────
// Public, client-facing: only active venues, optionally filtered by type.
// This is what CreateEventPage.jsx's DecorationVenuePicker calls.
//
// ── GET /api/decoration-venues?all=true[&type=lawn] ───────────────────────
// Admin-only: everything including inactive. Verified inline (rather than
// gating the whole route with adminAuth) so the plain public GET above
// stays open with no token required.
router.get('/', async (req, res) => {
  try {
    const { type, all } = req.query;

    if (all === 'true') {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ error: 'No token' });
      try {
        const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
        if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const params = [];
      let query = 'SELECT * FROM decoration_venues';
      if (type) { params.push(type); query += ` WHERE venue_type = $${params.length}`; }
      query += ' ORDER BY venue_type ASC, created_at DESC';
      const result = await pool.query(query, params);
      return res.json(result.rows);
    }

    const params = [true];
    let query = 'SELECT * FROM decoration_venues WHERE is_active = $1';
    if (type) { params.push(type); query += ` AND venue_type = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/decoration-venues/types-summary — per-type counts, so the admin
// panel can show "Lawn (4)" tabs without fetching every row up front.
router.get('/types-summary', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT venue_type, COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active
       FROM decoration_venues GROUP BY venue_type`
    );
    const map = Object.fromEntries(result.rows.map(r => [r.venue_type, { total: Number(r.total), active: Number(r.active) }]));
    res.json(VALID_TYPES.map(t => ({ venue_type: t, ...(map[t] || { total: 0, active: 0 }) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/decoration-venues — admin uploads a new venue photo
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { venue_type, title, description } = req.body;
    if (!venue_type || !VALID_TYPES.includes(venue_type)) {
      return res.status(400).json({ error: `venue_type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!req.file) return res.status(400).json({ error: 'A JPEG, PNG, or WebP image is required' });

    // FIXED: finalizeImageUpload() verifies the file's real magic bytes AND
    // renames it to an extension derived from that verified type — never
    // from the client-supplied original filename. See lib/imageUpload.js
    // for why trusting the original extension is a stored-XSS vector.
    const finalFilename = await finalizeImageUpload(req.file);
    if (!finalFilename) {
      return res.status(400).json({ error: 'Uploaded file is not a valid JPEG, PNG, or WebP image' });
    }

    // Relative path — resolves against whatever host is currently serving
    // the frontend (same reasoning already used in gallery.js / vendors.js).
    const image_url = `/uploads/${finalFilename}`;

    const result = await pool.query(
      `INSERT INTO decoration_venues (venue_type, title, image_url, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [venue_type, title.trim(), image_url, description || null]
    );
    res.json({ success: true, venue: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/decoration-venues/:id/toggle — admin activates/deactivates
router.patch('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE decoration_venues SET is_active = NOT is_active WHERE id = $1 RETURNING is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, is_active: result.rows[0].is_active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/decoration-venues/:id — admin removes a photo
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM decoration_venues WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;