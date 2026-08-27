const express = require('express');
const router = express.Router();
const pool = require('../db');
const adminAuth = require('../middleware/adminAuth');

// Must match SERVICE_OPTIONS in VendorSignup.jsx / SERVICE_CONFIGS in
// VendorProfile.jsx. Kept as the single source of truth here — both POST /
// and PATCH /:id/category enforce this same list, so a service can no
// longer be created with a category the frontend doesn't recognize (it
// previously could only be caught after the fact via the /:id/category
// fix-up route, once a vendor was already silently stuck showing
// photography fields).
const VALID_CATEGORIES = ['photography', 'invitation', 'decor', 'catering', 'music', 'makeup', 'venue'];

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
//
// ── FIX ──────────────────────────────────────────────────────────────────
// This route previously only inserted `name` and `description`, leaving
// `services.category` NULL for every service created through the admin
// panel. VendorLayout.jsx and VendorProfile.jsx both read
// `service_category` (sourced from this column via a join) to decide which
// form/nav config to show, and both silently fall back to 'photography'
// when it's NULL. That fallback is what caused invitation/decor/etc.
// vendors linked to an admin-created service to see photography fields.
//
// Now accepts and stores `category` — it MUST be one of the same keys
// used in VendorSignup.jsx's SERVICE_OPTIONS / VendorProfile.jsx's
// SERVICE_CONFIGS ('photography' | 'invitation' | 'decor' | 'catering' |
// 'music' | 'makeup' | 'venue'), so the admin UI creating this service
// needs to send one of those values.
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    // category is optional (existing callers may not send one), but if
    // it's present it must be a value the frontend actually recognizes —
    // previously a typo or unsupported value here would insert silently
    // and only surface later as a vendor stuck in the "category not set"
    // fallback state.
    if (category != null && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    await pool.query(
      'INSERT INTO services (name, description, category) VALUES ($1, $2, $3)',
      [name, description || null, category || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle service active/inactive (admin)
router.patch('/:id/toggle', adminAuth, async (req, res) => {
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

// PATCH set/update a service's category (admin) — lets you fix any
// existing service rows that were created before this fix, or correct a
// miscategorized one, without touching the DB directly.
router.patch('/:id/category', adminAuth, async (req, res) => {
  try {
    const { category } = req.body;
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    await pool.query('UPDATE services SET category = $1 WHERE id = $2', [category, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE service (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;