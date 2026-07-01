// server/routes/messages.js
// Three-way messaging: client <-> vendor <-> admin
// All messages are stored in a single table with thread grouping by enquiry/conversation

const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const jwt     = require('jsonwebtoken');

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

// ── CLIENT: start or find a conversation with a vendor ────────────────────
// POST /api/messages/start
// Body: { client_name, client_email, client_phone, vendor_id, subject, message }
router.post('/start', async (req, res) => {
  try {
    const { client_name, client_email, client_phone, vendor_id, subject, message } = req.body;
    if (!client_name || !message || !vendor_id) {
      return res.status(400).json({ error: 'client_name, vendor_id, and message are required' });
    }

    // Check if an open conversation already exists for this client+vendor
    let conv = null;
    if (client_email) {
      const existing = await pool.query(
        `SELECT * FROM conversations
         WHERE client_email = $1 AND vendor_id = $2 AND status = 'open'
         ORDER BY updated_at DESC LIMIT 1`,
        [client_email, vendor_id]
      );
      conv = existing.rows[0] || null;
    }

    if (!conv) {
      const ins = await pool.query(
        `INSERT INTO conversations (client_name, client_email, client_phone, vendor_id, subject)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [client_name, client_email || null, client_phone || null, vendor_id, subject || `Message from ${client_name}`]
      );
      conv = ins.rows[0];
    }

    // Insert the first message
    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message)
       VALUES ($1, 'client', $2, $3)`,
      [conv.id, client_name, message]
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
router.get('/client/:convId', async (req, res) => {
  try {
    const { email } = req.query;
    const conv = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [req.params.convId]);
    if (!conv.rows[0]) return res.status(404).json({ error: 'Conversation not found' });

    // Minimal auth: check email matches
    if (email && conv.rows[0].client_email && conv.rows[0].client_email !== email) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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
router.post('/client/:convId', async (req, res) => {
  try {
    const { client_name, message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message)
       VALUES ($1, 'client', $2, $3)`,
      [req.params.convId, client_name || 'Client', message]
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
router.get('/vendor/:convId', async (req, res) => {
  try {
    const payload = verifyJWT(getToken(req));
    if (!payload?.vendorUserId) return res.status(401).json({ error: 'Unauthorized' });

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

    const conv = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [req.params.convId]);

    res.json({ conversation: conv.rows[0], messages: msgs.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VENDOR: send a message ────────────────────────────────────────────────
// POST /api/messages/vendor/:convId
// Body: { message }
router.post('/vendor/:convId', async (req, res) => {
  try {
    const payload = verifyJWT(getToken(req));
    if (!payload?.vendorUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const vuRes = await pool.query(`SELECT name FROM vendor_users WHERE id = $1`, [payload.vendorUserId]);
    const senderName = vuRes.rows[0]?.name || 'Vendor';

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
router.get('/admin', async (req, res) => {
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
router.get('/admin/:convId', async (req, res) => {
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
router.post('/admin/:convId', async (req, res) => {
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
router.patch('/admin/:convId/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(`UPDATE conversations SET status = $1 WHERE id = $2`, [status, req.params.convId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


// ── CLIENT → ADMIN CHAT ───────────────────────────────────────────────────
// These routes create conversations with vendor_id = NULL (admin-only threads)

// POST /api/messages/admin-chat/start
// Body: { client_name, client_email, client_phone, subject, message }
router.post('/admin-chat/start', async (req, res) => {
  try {
    const { client_name, client_email, client_phone, subject, message } = req.body;
    if (!client_name || !message) {
      return res.status(400).json({ error: 'client_name and message are required' });
    }

    // Check if open admin conversation already exists for this client email
    let conv = null;
    if (client_email) {
      const existing = await pool.query(
        `SELECT * FROM conversations
         WHERE client_email = $1 AND vendor_id IS NULL AND status = 'open'
         ORDER BY updated_at DESC LIMIT 1`,
        [client_email]
      );
      conv = existing.rows[0] || null;
    }

    if (!conv) {
      const ins = await pool.query(
        `INSERT INTO conversations (client_name, client_email, client_phone, vendor_id, subject)
         VALUES ($1, $2, $3, NULL, $4) RETURNING *`,
        [client_name, client_email || null, client_phone || null,
         subject || `Enquiry from ${client_name}`]
      );
      conv = ins.rows[0];
    }

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message)
       VALUES ($1, 'client', $2, $3)`,
      [conv.id, client_name, message]
    );
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [conv.id]);

    res.json({ success: true, conversation_id: conv.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/admin-chat/:convId?email=
router.get('/admin-chat/:convId', async (req, res) => {
  try {
    const { email } = req.query;
    const conv = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [req.params.convId]);
    if (!conv.rows[0]) return res.status(404).json({ error: 'Not found' });

    if (email && conv.rows[0].client_email && conv.rows[0].client_email !== email) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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
router.post('/admin-chat/:convId', async (req, res) => {
  try {
    const { client_name, message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_type, sender_name, message)
       VALUES ($1, 'client', $2, $3)`,
      [req.params.convId, client_name || 'Client', message]
    );
    await pool.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [req.params.convId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});