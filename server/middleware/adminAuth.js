// server/middleware/adminAuth.js
//
// Verifies the JWT sent as "Authorization: Bearer <adminToken>" and checks
// that the decoded payload has role === 'admin'. Mirrors the pattern
// vendorAuth() already uses in routes/vendorAuth.js.
//
// UPDATED: now also requires payload.type === 'access'. Since the
// admin login route (routes/admin.js) started issuing a short-lived
// access token (15 min, Bearer) separate from a long-lived refresh
// token (7 days, HttpOnly cookie only), this check is what stops a
// leaked/exfiltrated refresh token from being usable directly against
// admin-only routes.

const { getToken } = require('../lib/session');
const { safeVerify } = require('../lib/jwt');

function adminAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = safeVerify(token);

    if (payload.role !== 'admin' || payload.type !== 'access') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminId = payload.id;
    next();
  } catch (err) {
    // Provide more specific error messages based on the error type
    if (err.message.includes('Server configuration error')) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = adminAuth;
