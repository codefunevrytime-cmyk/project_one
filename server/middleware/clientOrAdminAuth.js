const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getToken } = require('../lib/session');

// Authenticate an administrator, or a real client account. Routes still
// perform resource-specific ownership checks after this middleware.
async function clientOrAdminAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role === 'admin') {
      req.isAdmin = true;
      req.adminId = payload.id;
      return next();
    }
    if (!payload.id || payload.vendorUserId) {
      return res.status(403).json({ error: 'Client or admin access required' });
    }
    const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [payload.id]);
    if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });
    req.clientId = result.rows[0].id;
    req.clientEmail = result.rows[0].email;
    req.isAdmin = false;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = clientOrAdminAuth;
