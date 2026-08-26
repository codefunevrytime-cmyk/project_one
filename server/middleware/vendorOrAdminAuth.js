const jwt  = require('jsonwebtoken');
const pool = require('../db');
const { getToken } = require('../lib/session');

// Authenticates EITHER an admin token OR a vendor token, exposing a
// uniform shape on req so downstream route handlers can allow both:
//   req.isAdmin        - true if this was an admin token
//   req.vendorUserId    - the vendor_users.id, if this was a vendor token
//   req.vendorId        - the vendor_users' linked vendors.id, if any
//
// NOTE: this middleware only AUTHENTICATES. It does not by itself check
// that a vendor "owns" the resource being touched — that's necessarily
// route-specific (e.g. comparing req.vendorId to a :id param, or to a
// vendor_id column looked up from the target row). Each route below
// does that comparison itself via ownsVendor().
//
// ASSUMPTION: mirrors the shape described for middleware/adminAuth.js —
// an admin JWT has `role: 'admin'` in its payload. If adminAuth actually
// checks something else (a DB-backed admin flag, a different claim
// name, etc.), update the `payload.role === 'admin'` check below to
// match.
async function vendorOrAdminAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
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

// Returns true if the authenticated caller (admin or vendor) is allowed
// to act on the given vendorId. Admins can act on any vendor; a vendor
// can only act on their own linked vendor_id.
function ownsVendor(req, vendorId) {
  if (req.isAdmin) return true;
  return !!req.vendorId && String(req.vendorId) === String(vendorId);
}

module.exports = { vendorOrAdminAuth, ownsVendor };
