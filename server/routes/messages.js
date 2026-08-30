// server/routes/messages.js
// Three-way messaging: client <-> vendor <-> admin
// All messages are stored in a single table with thread grouping by enquiry/conversation

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const adminAuth = require('../middleware/adminAuth');
const clientAuth = require('../middleware/clientAuth');
const rateLimit = require('../middleware/rateLimit');
const { finalizeImageUpload } = require('../lib/imageUpload');
router.use(rateLimit({ max: 120 }));

// ── Chat image attachments ──────────────────────────────────────────────
// Same pattern as vendors.js / gallery.js / decorationVenues.js: write a
// neutral temp filename (never file.originalname — client-controlled,
// see lib/imageUpload.js for the stored-XSS this avoids), then
// finalizeImageUpload() verifies the real magic bytes and renames to an
// extension it derives itself before the URL is ever handed back.
const chatUploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(chatUploadDir, { recursive: true });
const chatImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '.tmp'),
});
const chatImageUpload = multer({
  storage: chatImageStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

// POST /api/messages/upload-image — client attaches a reference/decor
// photo to a chat message. Returns a relative URL (same reasoning as
// every other upload route in this codebase: a relative path resolves
// against whatever host is currently serving the frontend, not whatever
// host happened to receive this particular upload request).
router.post('/upload-image', clientAuth, chatImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A JPEG, PNG, or WebP image is required' });
    const finalFilename = await finalizeImageUpload(req.file);
    if (!finalFilename) return res.status(400).json({ error: 'Uploaded file is not a valid JPEG, PNG, or WebP image' });
    res.json({ image_url: `/uploads/${finalFilename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auto-migrate tables ───────────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id            SERIAL PRIMARY KEY,
      client_name   TEXT NOT NULL,
      client_email  TEXT,
      client_phone  TEXT,
      vendor_id     INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      subject       TEXT,
      status        TEXT DEFAULT 'open',        -- open | closed | archived
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id              SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_type     TEXT NOT NULL,   -- 'client' | 'vendor' | 'admin'
      sender_id       INTEGER,         -- vendor_user.id or admin.id; NULL for client
      sender_name     TEXT NOT NULL,
      message         TEXT NOT NULL,
      is_read         BOOLEAN DEFAULT false,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Chat attachments: an image (reference photo, decor inspiration, etc.)
  // and/or a dropped map pin (event location). Both optional and
  // independent — a message can carry either, both, or neither alongside
  // its text. Added via ALTER so existing rows/tables aren't disturbed.
  await pool.query(`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS image_url TEXT`);
  await pool.query(`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`);
  await pool.query(`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);
  await pool.query(`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS location_label TEXT`);
}
ensureTables().catch(console.error);

// ── Auth helpers ──────────────────────────────────────────────────────────
function verifyJWT(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

function getToken(req) {
  const h = req.headers.authorization;
  return h ? h.replace('Bearer ', '') : null;
}

// Resolve the vendor_id linked to a vendor_user, and confirm a given
// conversation actually belongs to that vendor. Centralizes the ownership
// check that the /vendor/:convId routes below were previously missing
// (they verified the JWT was valid, but never that the token's owner
// was the vendor attached to the conversation being read/replied to —
// an IDOR letting any vendor read/send messages on any other vendor's
// conversations by guessing/iterating convId).
async function getOwnedConversation(vendorUserId, convId) {
  const vuRes = await pool.query('SELECT vendor_id, name FROM vendor_users WHERE id = $1', [vendorUserId]);
  const vendorId = vuRes.rows[0]?.vendor_id;
  const senderName = vuRes.rows[0]?.name || 'Vendor';
  if (!vendorId) return { vendorId: null, senderName, conversation: null };

  const convRes = await pool.query('SELECT * FROM conversations WHERE id = $1', [convId]);
  const conv = convRes.rows[0];
  if (!conv || conv.vendor_id !== vendorId) return { vendorId, senderName, conversation: null };

  return { vendorId, senderName, conversation: conv };
}

// ── CLIENT: start or find a conversation with a vendor ────────────────────
// POST /api/messages/start
// Body: { client_name, client_email, client_phone, vendor_id, subject, message }
router.post('/start', clientAuth, async (req, res) => {
  try {
    const { client_phone, vendor_id, subject, message } = req.body;
    if (!message || !vendor_id) {
      return res.status(400).json({ error: 'vendor_id and message are required' });
    }
    const clientName = req.body.client_name || req.clientEmail;

    // Check if an open conversation already exists for this client+vendor
    let conv = null;
    if (req.clientEmail) {
      const existing = await pool.query(
        `SELECT * FROM conversations
         WHERE client_email = $1 AND vendor_id = $2 AND status = 'open'
         ORDER BY updated_at DESC LIMIT 1`,
        [req.clientEmail, vendor_id]
      );
      conv = existing.rows[0] || null;
    }

    if (!conv) {
      const ins = await pool.query(
        `INSERT INTO conversations (client_name, client_email, client_phone, vendor_id, subject)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [clientName, req.clientEmail, client_phone || null, vendor_id, subject || `Message from ${clientName}`]
      );
      conv = ins.rows[0];
    }

    // Insert the first message
    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message)
       VALUES ($1, 'client', $2, $3)`,
      [conv.id, clientName, message]
    );

    // Bump updated_at
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [conv.id]);

    res.json({ success: true, conversation_id: conv.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CLIENT: get messages for their conversation ───────────────────────────
// GET /api/messages/client/:convId?email=
router.get('/client/:convId', clientAuth, async (req, res) => {
  try {
    const conv = await pool.query(`SELECT * FROM conversations WHERE id = $1 AND client_email = $2`, [req.params.convId, req.clientEmail]);
    if (!conv.rows[0]) return res.status(404).json({ error: 'Conversation not found' });

    const msgs = await pool.query(
      `SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.convId]
    );

    // Mark messages sent by vendor/admin as read for client
    await pool.query(
      `UPDATE conversation_messages SET is_read = true
       WHERE conversation_id = $1 AND sender_type != 'client'`,
      [req.params.convId]
    );

    res.json({ conversation: conv.rows[0], messages: msgs.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CLIENT: send a message into existing conversation ─────────────────────
// POST /api/messages/client/:convId
// Body: { client_name, message }
router.post('/client/:convId', clientAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const owner = await pool.query('SELECT id FROM conversations WHERE id = $1 AND client_email = $2', [req.params.convId, req.clientEmail]);
    if (!owner.rows[0]) return res.status(404).json({ error: 'Conversation not found' });

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message)
       VALUES ($1, 'client', $2, $3)`,
      [req.params.convId, req.body.client_name || req.clientEmail, message]
    );
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [req.params.convId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VENDOR: get all conversations for their vendor account ────────────────
// GET /api/messages/vendor
router.get('/vendor', async (req, res) => {
  try {
    const payload = verifyJWT(getToken(req));
    if (!payload?.vendorUserId) return res.status(401).json({ error: 'Unauthorized' });

    // Get vendor_id linked to this vendor user
    const vuRes = await pool.query(`SELECT vendor_id FROM vendor_users WHERE id = $1`, [payload.vendorUserId]);
    const vendorId = vuRes.rows[0]?.vendor_id;
    if (!vendorId) return res.json([]);

    const result = await pool.query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM conversation_messages cm
          WHERE cm.conversation_id = c.id AND cm.is_read = false AND cm.sender_type = 'client') as unread_count,
         (SELECT message FROM conversation_messages cm2
          WHERE cm2.conversation_id = c.id ORDER BY cm2.created_at DESC LIMIT 1) as last_message
       FROM conversations c
       WHERE c.vendor_id = $1
       ORDER BY c.updated_at DESC`,
      [vendorId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VENDOR: get messages for a specific conversation ──────────────────────
// GET /api/messages/vendor/:convId
// FIXED (IDOR): previously only checked that the JWT was valid, never
// that the conversation's vendor_id matched the calling vendor — any
// vendor could read another vendor's private client conversation by
// iterating convId. Now scoped via getOwnedConversation().
router.get('/vendor/:convId', async (req, res) => {
  try {
    const payload = verifyJWT(getToken(req));
    if (!payload?.vendorUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { vendorId, conversation } = await getOwnedConversation(payload.vendorUserId, req.params.convId);
    if (!vendorId) return res.status(403).json({ error: 'No vendor profile linked to this account' });
    if (!conversation) return res.status(404).json({ error: 'Not found' });

    const msgs = await pool.query(
      `SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.convId]
    );

    // Mark client messages as read for vendor
    await pool.query(
      `UPDATE conversation_messages SET is_read = true
       WHERE conversation_id = $1 AND sender_type = 'client'`,
      [req.params.convId]
    );

    res.json({ conversation, messages: msgs.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VENDOR: send a message ────────────────────────────────────────────────
// POST /api/messages/vendor/:convId
// Body: { message }
// FIXED (IDOR): same missing ownership check as the GET route above — a
// vendor could previously send messages into another vendor's
// conversation with a client.
router.post('/vendor/:convId', async (req, res) => {
  try {
    const payload = verifyJWT(getToken(req));
    if (!payload?.vendorUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const { vendorId, senderName, conversation } = await getOwnedConversation(payload.vendorUserId, req.params.convId);
    if (!vendorId) return res.status(403).json({ error: 'No vendor profile linked to this account' });
    if (!conversation) return res.status(404).json({ error: 'Not found' });

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_id, sender_name, message)
       VALUES ($1, 'vendor', $2, $3, $4)`,
      [req.params.convId, payload.vendorUserId, senderName, message]
    );
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [req.params.convId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: get all conversations ──────────────────────────────────────────
// GET /api/messages/admin
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
         v.name as vendor_name,
         (SELECT COUNT(*) FROM conversation_messages cm
          WHERE cm.conversation_id = c.id AND cm.is_read = false) as unread_count,
         (SELECT message FROM conversation_messages cm2
          WHERE cm2.conversation_id = c.id ORDER BY cm2.created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM conversation_messages cm3
          WHERE cm3.conversation_id = c.id ORDER BY cm3.created_at DESC LIMIT 1) as last_message_at
       FROM conversations c
       LEFT JOIN vendors v ON c.vendor_id = v.id
       ORDER BY c.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: get messages for a conversation ────────────────────────────────
// GET /api/messages/admin/:convId
router.get('/admin/:convId', adminAuth, async (req, res) => {
  try {
    const msgs = await pool.query(
      `SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.convId]
    );
    const conv = await pool.query(
      `SELECT c.*, v.name as vendor_name FROM conversations c
       LEFT JOIN vendors v ON c.vendor_id = v.id
       WHERE c.id = $1`,
      [req.params.convId]
    );
    res.json({ conversation: conv.rows[0], messages: msgs.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: send a message into any conversation ───────────────────────────
// POST /api/messages/admin/:convId
// Body: { message }
router.post('/admin/:convId', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message)
       VALUES ($1, 'admin', $2, $3)`,
      [req.params.convId, 'Admin', message]
    );
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [req.params.convId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: close / reopen conversation ────────────────────────────────────
// PATCH /api/messages/admin/:convId/status
// Body: { status }
router.patch('/admin/:convId/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(`UPDATE conversations SET status = $1 WHERE id = $2`, [status, req.params.convId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CLIENT → ADMIN CHAT ───────────────────────────────────────────────────
// These routes create conversations with vendor_id = NULL (admin-only threads)

// POST /api/messages/admin-chat/start
// Body: { client_name, client_email, client_phone, subject, message }
router.post('/admin-chat/start', clientAuth, async (req, res) => {
  try {
    const { client_phone, subject, message, image_url, latitude, longitude, location_label } = req.body;
    if (!message && !image_url && latitude == null) {
      return res.status(400).json({ error: 'message, image, or location is required' });
    }
    const clientName = req.body.client_name || req.clientEmail;

    // Check if open admin conversation already exists for this client email
    let conv = null;
    if (req.clientEmail) {
      const existing = await pool.query(
        `SELECT * FROM conversations
         WHERE client_email = $1 AND vendor_id IS NULL AND status = 'open'
         ORDER BY updated_at DESC LIMIT 1`,
        [req.clientEmail]
      );
      conv = existing.rows[0] || null;
    }

    if (!conv) {
      const ins = await pool.query(
        `INSERT INTO conversations (client_name, client_email, client_phone, vendor_id, subject)
         VALUES ($1, $2, $3, NULL, $4) RETURNING *`,
        [clientName, req.clientEmail, client_phone || null,
         subject || `Enquiry from ${clientName}`]
      );
      conv = ins.rows[0];
    }

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message, image_url, latitude, longitude, location_label)
       VALUES ($1, 'client', $2, $3, $4, $5, $6, $7)`,
      [conv.id, clientName, message || '', image_url || null, latitude ?? null, longitude ?? null, location_label || null]
    );
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [conv.id]);

    res.json({ success: true, conversation_id: conv.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/admin-chat/:convId?email=
router.get('/admin-chat/:convId', clientAuth, async (req, res) => {
  try {
    const conv = await pool.query(`SELECT * FROM conversations WHERE id = $1 AND vendor_id IS NULL AND client_email = $2`, [req.params.convId, req.clientEmail]);
    if (!conv.rows[0]) return res.status(404).json({ error: 'Not found' });

    const msgs = await pool.query(
      `SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.convId]
    );

    // Mark admin messages as read
    await pool.query(
      `UPDATE conversation_messages SET is_read = true
       WHERE conversation_id = $1 AND sender_type = 'admin'`,
      [req.params.convId]
    );

    res.json({ conversation: conv.rows[0], messages: msgs.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/admin-chat/:convId
// Body: { client_name, message }
router.post('/admin-chat/:convId', clientAuth, async (req, res) => {
  try {
    const { message, image_url, latitude, longitude, location_label } = req.body;
    if (!message && !image_url && latitude == null) {
      return res.status(400).json({ error: 'message, image, or location is required' });
    }
    const owner = await pool.query('SELECT id FROM conversations WHERE id = $1 AND vendor_id IS NULL AND client_email = $2', [req.params.convId, req.clientEmail]);
    if (!owner.rows[0]) return res.status(404).json({ error: 'Not found' });

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message, image_url, latitude, longitude, location_label)
       VALUES ($1, 'client', $2, $3, $4, $5, $6, $7)`,
      [req.params.convId, req.body.client_name || req.clientEmail, message || '', image_url || null, latitude ?? null, longitude ?? null, location_label || null]
    );
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [req.params.convId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;