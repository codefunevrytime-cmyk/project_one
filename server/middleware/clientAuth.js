// server/middleware/clientAuth.js
//
// Verifies the JWT sent as "Authorization: Bearer <token>" from routes/auth.js
// login/signup. That token only carries { id }, so this middleware looks up
// the user's email from the DB and attaches it to req — routes that need to
// check "does this event belong to this client" compare against req.clientEmail
// instead of trusting a query param or route param.

const jwt  = require('jsonwebtoken');
const pool = require('../db');
const { getToken } = require('../lib/session');

async function clientAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Do not treat an admin or vendor JWT as a client session merely because
    // their payload also happens to contain a numeric id.
    if (!payload.id || payload.role || payload.vendorUserId) {
      return res.status(403).json({ error: 'Client access required' });
    }
    const { id } = payload;

    const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });

    req.clientId    = result.rows[0].id;
    req.clientEmail = result.rows[0].email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = clientAuth;
