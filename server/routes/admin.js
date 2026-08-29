const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('../middleware/rateLimit');
const { isEmail } = require('../lib/validation');
const { getCookie, clearSession } = require('../lib/session');
router.use(rateLimit({ max: process.env.NODE_ENV === 'production' ? 20 : 1000 }));
// Access token: short-lived, sent in JSON, kept in memory on the frontend.
const ACCESS_TOKEN_TTL = '15m';
// Refresh token: long-lived, NEVER sent in JSON, only ever set as an HttpOnly cookie.
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_COOKIE_NAME = 'adminRefreshToken';

function signAccessToken(admin) {
  return jwt.sign(
    { id: admin.id, role: 'admin', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(admin) {
  return jwt.sign(
    { id: admin.id, role: 'admin', type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,        // HTTPS only — set false only in local dev over http
    sameSite: 'strict',  // change to 'none' + secure:true if truly cross-origin
    path: '/api/admin/refresh', // cookie only ever sent to the refresh endpoint
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isEmail(email) || typeof password !== 'string') return res.status(400).json({ error: 'Invalid credentials' });
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = signAccessToken(admin);
    const refreshToken = signRefreshToken(admin);

    setRefreshCookie(res, refreshToken);
    // Only the short-lived access token goes in the body now.
    res.json({ token: accessToken, expiresIn: 15 * 60 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/refresh
// Called silently by the frontend (e.g. on app load, or when a request gets 401)
// to mint a new access token without asking the admin to log in again.
router.post('/refresh', async (req, res) => {
  const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (payload.type !== 'refresh' || payload.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Re-fetch the admin so a deleted/deactivated account can't refresh forever.
    const result = await pool.query('SELECT * FROM admins WHERE id = $1', [payload.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });

    const accessToken = signAccessToken(result.rows[0]);
    res.json({ token: accessToken, expiresIn: 15 * 60 });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/admin/refresh' });
  // Belt-and-suspenders: also clear the legacy celeste_session cookie
  // (set by the old setSession() flow) in case this admin logged in
  // before the refresh-token migration and still has one.
  clearSession(res);
  res.json({ ok: true });
});

module.exports = router;
