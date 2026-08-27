const jwt  = require('jsonwebtoken');
const pool = require('../db');
const { getToken } = require('../lib/session');

// Authenticates EITHER an admin token OR a vendor token, exposing a
// uniform shape on req so downstream route handlers can allow both:
//   req.isAdmin        - true if this was an admin token
//   req.vendorUserId    - the vendor_users.id, if this was a vendor token
//   req.vendorId        - the vendor_users' linked vendors.id, if any
//
// UPDATED: both branches now also require payload.type === 'access'.
// Admin and vendor logins both now issue short-lived access tokens
// (Bearer, 15 min) plus a separate long-lived refresh token that only
// ever lives in an HttpOnly cookie and is never accepted here. Without
// this check, a leaked refresh token (or a pre-migration 7-day token)
// could be used directly against every route this middleware guards.
async function vendorOrAdminAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (payload.type !== 'access') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (payload.role === 'admin') {
    req.isAdmin = true;
    req.adminId = payload.id;
    return next();
  }

  if (payload.vendorUserId) {
    req.isAdmin = false;
    req.vendorUserId = payload.vendorUserId;
    try {
      const result = await pool.query(
        'SELECT vendor_id FROM vendor_users WHERE id = $1',
        [payload.vendorUserId]
      );
      req.vendorId = result.rows[0]?.vendor_id || null;
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
    return next();
  }

  return res.status(403).json({ error: 'Forbidden' });
}

function ownsVendor(req, vendorId) {
  if (req.isAdmin) return true;
  return !!req.vendorId && String(req.vendorId) === String(vendorId);
}

module.exports = { vendorOrAdminAuth, ownsVendor };
