// server/middleware/adminAuth.js
//
// Verifies the JWT sent as "Authorization: Bearer <adminToken>" and checks
// that the decoded payload has role === 'admin'. Mirrors the pattern
// vendorAuth() already uses in routes/vendorAuth.js.
//
// The admin login route (routes/admin.js) already signs { id, role: 'admin' }
// into the token — this middleware is just the missing "verify it on every
// admin-only route" half of that.

const jwt = require('jsonwebtoken');
const { getToken } = require('../lib/session');

function adminAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = adminAuth;
