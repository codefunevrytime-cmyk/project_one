const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ensure vendor_id column exists (run once on startup)
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
}
ensureVendorIdColumn().catch(console.error);

// GET reviews
// ?all=true            → all reviews (admin, no vendor filter)
// ?vendor_id=5         → approved reviews for a specific vendor
// ?all=true&vendor_id=5→ all reviews for a vendor (admin manage view)
// (no params)          → all approved reviews site-wide (legacy)
router.get('/', async (req, res) => {
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
// Body: { client_name, message, rating, approved?, vendor_id? }
router.post('/', async (req, res) => {
  try {
    const { client_name, message, rating, approved, vendor_id } = req.body;
    await pool.query(
      `INSERT INTO reviews (client_name, message, rating, approved, vendor_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        client_name,
        message,
        rating,
        approved === true || approved === 'true',
        vendor_id ? Number(vendor_id) : null,
      ]
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