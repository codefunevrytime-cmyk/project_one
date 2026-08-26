const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('../middleware/rateLimit');
const { text } = require('../lib/validation');
router.use(rateLimit({ max: 60 }));

// GET /?all=true also returns unapproved reviews (pending moderation) —
// that's admin-only data, so this route can't just take the adminAuth
// middleware wholesale (it's also the public "approved reviews" endpoint).
// Instead, only require+verify the admin token when ?all=true is used.
function requireAdminIfAll(req, res, next) {
  if (req.query.all !== 'true') return next();
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Decodes the Authorization token if present, but never rejects the request.
// Used only to decide whether a POSTed review is auto-approved — the POST
// route itself stays open to unauthenticated (public) submitters.
function getAdminIfPresent(req) {
  const auth = req.headers.authorization;
  if (!auth) return false;
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

// Ensure vendor_id and sub_service columns exist (run once on startup)
async function ensureVendorIdColumn() {
  try {
    await pool.query(`
      ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE
    `);
  } catch (err) {
    // Column may already exist with different constraint — ignore
    console.warn('reviews migration note:', err.message);
  }

  try {
    // Which specific service the client is reviewing, e.g. "Box Invitations"
    // — populated from a dropdown on the client review form, sourced from
    // the vendor's own "Services Offered" list.
    await pool.query(`
      ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS sub_service TEXT
    `);
  } catch (err) {
    console.warn('reviews migration note:', err.message);
  }
}
ensureVendorIdColumn().catch(console.error);

// GET reviews
// ?all=true            → all reviews (admin, no vendor filter)
// ?vendor_id=5         → approved reviews for a specific vendor
// ?all=true&vendor_id=5→ all reviews for a vendor (admin manage view)
// (no params)          → all approved reviews site-wide (legacy)
router.get('/', requireAdminIfAll, async (req, res) => {
  try {
    const { all, vendor_id } = req.query;
    const params = [];
    let where = [];

    if (all !== 'true') {
      where.push('approved = true');
    }

    if (vendor_id) {
      params.push(Number(vendor_id));
      where.push(`vendor_id = $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT r.*, v.name AS vendor_name
      FROM reviews r
      LEFT JOIN vendors v ON r.vendor_id = v.id
      ${whereClause}
      ORDER BY r.approved ASC, r.created_at DESC
    `;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new review
// Body: { client_name, message, rating, vendor_id?, sub_service? }
// NOTE: `approved` is intentionally NOT read from the request body.
// The server decides it: true only when a verified admin JWT is present
// (used by AdminReviews.jsx's "Add Review Manually" form), false for
// every public submission so it lands in the moderation queue.
router.post('/', async (req, res) => {
  try {
    const { client_name, message, rating, vendor_id, sub_service } = req.body;

    if (!text(client_name, 120) || !text(message, 2000)) {
      return res.status(400).json({ error: 'client_name and message are required' });
    }
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ error: 'rating must be an integer from 1 to 5' });
    }

    let vendorIdNum = null;
    if (vendor_id) {
      vendorIdNum = Number(vendor_id);
      if (!Number.isInteger(vendorIdNum)) {
        return res.status(400).json({ error: 'vendor_id must be a valid integer' });
      }
      const vendorCheck = await pool.query(
        'SELECT id FROM vendors WHERE id = $1 AND is_active = true',
        [vendorIdNum]
      );
      if (vendorCheck.rowCount === 0) {
        return res.status(400).json({ error: 'vendor_id does not refer to an active vendor' });
      }
    }

    const approved = getAdminIfPresent(req);

    await pool.query(
      `INSERT INTO reviews (client_name, message, rating, approved, vendor_id, sub_service)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        client_name,
        message,
        rating,
        approved,
        vendorIdNum,
        sub_service || null,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH approve a review
router.patch('/:id/approve', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE reviews SET approved = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a review
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
