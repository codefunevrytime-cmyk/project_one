const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const { vendorOrAdminAuth, ownsVendor } = require('../middleware/vendorOrAdminAuth');
const { validateImageUpload } = require('../lib/imageUpload');
const rateLimit = require('../middleware/rateLimit');

// Same per-IP throttle pattern used in auth.js / admin.js / etc. This
// router was previously unthrottled — portfolio image uploads in
// particular (multipart, disk writes) were callable at unlimited rate
// per IP.
router.use(rateLimit({ max: 30 }));

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });

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
// FIXED: was adminAuth-only, which 403'd every vendor self-upload from
// VendorPortfolio.jsx (it sends the vendor token, not an admin token).
// Now accepts either an admin token or the vendor that owns this :id.
router.post('/:id/portfolio', vendorOrAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!ownsVendor(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });
    if (!req.file) return res.status(400).json({ error: 'A JPEG, PNG, or WebP image is required' });
    if (!await validateImageUpload(req.file)) return res.status(400).json({ error: 'Uploaded file is not a valid JPEG, PNG, or WebP image' });

    const { caption, tags } = req.body;
    // FIXED: store a relative path instead of a full URL built from
    // req.protocol/req.get('host'). A full URL bakes in whatever host the
    // upload request happened to hit (localhost:5000, or an ngrok tunnel
    // that changes every restart) — so the image only ever loads from that
    // exact host. A relative path always resolves against whatever host is
    // currently serving the frontend, on any device.
    const image_url = `/uploads/${req.file.filename}`;
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
// FIXED: same adminAuth-only bug as portfolio POST above.
router.post('/:id/tags', vendorOrAdminAuth, async (req, res) => {
  try {
    if (!ownsVendor(req, req.params.id)) return res.status(403).json({ error: 'Forbidden' });

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

// POST add new vendor — admin only. Vendors get their vendor row created
// implicitly during signup (see vendorAuth.js /signup), so this stays
// admin-only rather than moving to vendorOrAdminAuth.
router.post('/', adminAuth, upload.single('photo'), async (req, res) => {
  try {
    if (req.file && !await validateImageUpload(req.file)) return res.status(400).json({ error: 'Uploaded file is not a valid JPEG, PNG, or WebP image' });
    const { name, specialty, contact, service_id, price_per_day } = req.body;
    // FIXED: relative path — see note above in the portfolio POST route.
    const photo_url = req.file
      ? `/uploads/${req.file.filename}`
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

// PATCH update vendor price — admin only (unchanged). Vendors set their
// own price_per_day via PUT /api/vendor-auth/profile instead, computed
// on the frontend from their per-service prices; this route is for
// admin overrides.
router.patch('/:id/price', adminAuth, async (req, res) => {
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

// PATCH toggle vendor active/inactive — admin only (unchanged). This is
// the admin account-activation flag (vendors.is_active), distinct from
// the vendor-controlled online/offline flag (vendors.is_online) handled
// by PATCH /api/vendor-auth/status.
router.patch('/:id/toggle', adminAuth, async (req, res) => {
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
// FIXED: was adminAuth-only, 403'ing VendorPortfolio.jsx's delete button.
// The :id here is the *portfolio row's* id, not the vendor id, so
// ownership has to be resolved by looking up which vendor the row
// belongs to before comparing against the caller.
router.delete('/portfolio/:id', vendorOrAdminAuth, async (req, res) => {
  try {
    const row = await pool.query('SELECT vendor_id FROM vendor_portfolio WHERE id = $1', [req.params.id]);
    if (!row.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (!ownsVendor(req, row.rows[0].vendor_id)) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM vendor_portfolio WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE vendor tag
// FIXED: same pattern as portfolio delete above — :id is the tag row's
// id, so resolve its owning vendor_id before checking ownership.
router.delete('/tags/:id', vendorOrAdminAuth, async (req, res) => {
  try {
    const row = await pool.query('SELECT vendor_id FROM vendor_tags WHERE id = $1', [req.params.id]);
    if (!row.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (!ownsVendor(req, row.rows[0].vendor_id)) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM vendor_tags WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;