const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

// ── Ensure vendor_users table ─────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password      TEXT NOT NULL,
      phone         TEXT,
      status        TEXT DEFAULT 'pending',  -- pending | approved | rejected
      vendor_id     INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_messages (
      id            SERIAL PRIMARY KEY,
      enquiry_id    INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
      sender_type   TEXT NOT NULL,  -- 'client' | 'vendor' | 'admin'
      sender_id     INTEGER,
      message       TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_contact_requests (
      id            SERIAL PRIMARY KEY,
      vendor_user_id INTEGER NOT NULL REFERENCES vendor_users(id) ON DELETE CASCADE,
      enquiry_id    INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
      status        TEXT DEFAULT 'pending',  -- pending | approved | denied
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add vendor_user_id to queries so enquiries can be linked to a vendor
  await pool.query(`
    ALTER TABLE queries ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL
  `);

  await pool.query(`
    ALTER TABLE queries ADD COLUMN IF NOT EXISTS contact_revealed BOOLEAN DEFAULT false
  `);
}
ensureTables().catch(console.error);

// ── Middleware: verify vendor JWT ─────────────────────────────────────────
function vendorAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.vendorUserId = payload.vendorUserId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/vendor-auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const exists = await pool.query('SELECT id FROM vendor_users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO vendor_users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, status',
      [name, email, hash, phone || null]
    );
    const user  = result.rows[0];
    const token = jwt.sign({ vendorUserId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor-auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM vendor_users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    const user  = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ vendorUserId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, status: user.status, vendor_id: user.vendor_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor-auth/me
router.get('/me', vendorAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, status, vendor_id, created_at FROM vendor_users WHERE id = $1',
      [req.vendorUserId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor-auth/enquiries  — enquiries linked to this vendor
router.get('/enquiries', vendorAuth, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT vendor_id FROM vendor_users WHERE id = $1', [req.vendorUserId]);
    const vendorId = userRes.rows[0]?.vendor_id;
    if (!vendorId) return res.json([]);

    const result = await pool.query(
      `SELECT q.id, q.client_name, q.message, q.created_at, q.replied, q.contact_revealed,
              CASE WHEN q.contact_revealed THEN q.email ELSE NULL END as email,
              CASE WHEN q.contact_revealed THEN q.phone ELSE NULL END as phone
       FROM queries q WHERE q.vendor_id = $1 ORDER BY q.created_at DESC`,
      [vendorId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor-auth/enquiries/:id/messages
router.get('/enquiries/:id/messages', vendorAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendor_messages WHERE enquiry_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor-auth/enquiries/:id/reply
router.post('/enquiries/:id/reply', vendorAuth, async (req, res) => {
  try {
    const { message } = req.body;
    await pool.query(
      'INSERT INTO vendor_messages (enquiry_id, sender_type, sender_id, message) VALUES ($1, $2, $3, $4)',
      [req.params.id, 'vendor', req.vendorUserId, message]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vendor-auth/enquiries/:id/request-contact
router.post('/enquiries/:id/request-contact', vendorAuth, async (req, res) => {
  try {
    // Check if already requested
    const existing = await pool.query(
      'SELECT id FROM vendor_contact_requests WHERE vendor_user_id = $1 AND enquiry_id = $2',
      [req.vendorUserId, req.params.id]
    );
    if (existing.rows.length > 0) return res.json({ success: true, already: true });

    await pool.query(
      'INSERT INTO vendor_contact_requests (vendor_user_id, enquiry_id) VALUES ($1, $2)',
      [req.vendorUserId, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor-auth/profile  — get linked vendor profile
router.get('/profile', vendorAuth, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT * FROM vendor_users WHERE id = $1', [req.vendorUserId]);
    const user = userRes.rows[0];
    if (!user.vendor_id) return res.json({ user, vendor: null, portfolio: [], tags: [] });

    const [vendorRes, portRes, tagsRes] = await Promise.all([
      pool.query('SELECT * FROM vendors WHERE id = $1', [user.vendor_id]),
      pool.query('SELECT * FROM vendor_portfolio WHERE vendor_id = $1 ORDER BY created_at DESC', [user.vendor_id]),
      pool.query('SELECT * FROM vendor_tags WHERE vendor_id = $1', [user.vendor_id]),
    ]);

    res.json({
      user,
      vendor: vendorRes.rows[0] || null,
      portfolio: portRes.rows,
      tags: tagsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, vendorAuth };

// PUT /api/vendor-auth/profile — vendor updates their own vendor record
const multer = require('multer');
const path   = require('path');
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1e9) + path.extname(file.originalname)),
});
const upload = multer({ storage: multerStorage });

router.put('/profile', vendorAuth, upload.single('photo'), async (req, res) => {
  try {
    const userRes = await pool.query('SELECT * FROM vendor_users WHERE id = $1', [req.vendorUserId]);
    const user = userRes.rows[0];

    let vendorId = user.vendor_id;
    const { name, specialty, contact, location, bio, travel_info, delivery_time, payment_terms } = req.body;
    const services    = req.body.services    ? JSON.parse(req.body.services)    : [];
    const event_types = req.body.event_types ? JSON.parse(req.body.event_types) : [];
    const prices      = req.body.prices      ? JSON.parse(req.body.prices)      : {};
    const photo_url   = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;

    // Ensure vendors table has these columns
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bio TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS travel_info TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS delivery_time TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS services JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS event_types JSONB`).catch(() => {});
    await pool.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS prices JSONB`).catch(() => {});

    if (!vendorId) {
      // Create new vendor record linked to this vendor user
      const ins = await pool.query(
        `INSERT INTO vendors (name, specialty, contact, location, bio, travel_info, delivery_time, payment_terms, services, event_types, prices, is_active, photo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12) RETURNING id`,
        [name, specialty, contact, location, bio, travel_info, delivery_time, payment_terms, JSON.stringify(services), JSON.stringify(event_types), JSON.stringify(prices), photo_url]
      );
      vendorId = ins.rows[0].id;
      await pool.query('UPDATE vendor_users SET vendor_id = $1 WHERE id = $2', [vendorId, req.vendorUserId]);
    } else {
      const photoClause = photo_url ? `, photo_url = '${photo_url}'` : '';
      await pool.query(
        `UPDATE vendors SET name=$1, specialty=$2, contact=$3, location=$4, bio=$5, travel_info=$6, delivery_time=$7, payment_terms=$8, services=$9, event_types=$10, prices=$11 ${photoClause} WHERE id=$12`,
        [name, specialty, contact, location, bio, travel_info, delivery_time, payment_terms, JSON.stringify(services), JSON.stringify(event_types), JSON.stringify(prices), vendorId]
      );
    }

    res.json({ success: true, vendor_id: vendorId });
  } catch (err) {
    console.error('Vendor profile update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor-auth/all — admin: get all vendor user applications
router.get('/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, phone, status, vendor_id, created_at FROM vendor_users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vendor-auth/:id/approve — admin approves vendor
router.patch('/:id/approve', async (req, res) => {
  try {
    await pool.query("UPDATE vendor_users SET status = 'approved' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vendor-auth/:id/reject — admin rejects vendor
router.patch('/:id/reject', async (req, res) => {
  try {
    await pool.query("UPDATE vendor_users SET status = 'rejected' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vendor-auth/contact-requests — admin: pending contact reveal requests
router.get('/contact-requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*, vu.name as vendor_name, q.client_name, q.message
      FROM vendor_contact_requests cr
      JOIN vendor_users vu ON cr.vendor_user_id = vu.id
      JOIN queries q ON cr.enquiry_id = q.id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vendor-auth/contact-requests/:id/approve
router.patch('/contact-requests/:id/approve', async (req, res) => {
  try {
    const crRes = await pool.query('SELECT * FROM vendor_contact_requests WHERE id = $1', [req.params.id]);
    const cr = crRes.rows[0];
    if (!cr) return res.status(404).json({ error: 'Not found' });
    await pool.query("UPDATE vendor_contact_requests SET status = 'approved' WHERE id = $1", [req.params.id]);
    await pool.query("UPDATE queries SET contact_revealed = true WHERE id = $1", [cr.enquiry_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vendor-auth/contact-requests/:id/deny
router.patch('/contact-requests/:id/deny', async (req, res) => {
  try {
    await pool.query("UPDATE vendor_contact_requests SET status = 'denied' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
