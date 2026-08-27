const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const rateLimit = require('../middleware/rateLimit');
const { isEmail, isPassword, text } = require('../lib/validation');
const { getToken, getCookie, setRefreshCookie, clearRefreshCookie } = require('../lib/session');
const { sendMail } = require('../lib/mailer');
router.use(rateLimit({ max: 20 }));

// ── Access / refresh token config ──────────────────────────────────────
// Same split as routes/vendorAuth.js: short-lived access token returned in
// JSON (used as the Bearer token), long-lived refresh token ONLY as an
// HttpOnly cookie scoped to this router's own /refresh route.
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_COOKIE_NAME = 'clientRefreshToken';
const REFRESH_COOKIE_PATH = '/api/auth/refresh';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// `type: 'access' | 'refresh'` lets middleware/clientAuth.js (and this
// file's own /refresh handler) reject a refresh token presented as an
// access token, same guard vendorAuth() already has.
function signAccessToken(id) {
  return jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}
function signRefreshToken(id) {
  return jwt.sign(
    { id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
}

// Ensure users table has a phone column so client contact info (used in
// ClientMessaging) can be pulled straight from the logged-in profile
// instead of asking for it again in the chat box every time.
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);
  } catch (err) {
    // ignore if already exists
  }
})();

// Reset-token storage: hashed token + expiry, used by forgot/reset password
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`);
  } catch (err) {
    // ignore if already exists
  }
})();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!text(name, 120) || !isEmail(email) || !isPassword(password)) {
      return res.status(400).json({ error: 'Provide a name, valid email, and password of at least 8 characters' });
    }
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone',
      [name, email, hash, phone || null]
    );
    const user = result.rows[0];

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_PATH, REFRESH_COOKIE_MAX_AGE);
    res.json({ token: accessToken, expiresIn: 15 * 60, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isEmail(email) || typeof password !== 'string') return res.status(400).json({ error: 'Invalid email or password' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    const user  = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_PATH, REFRESH_COOKIE_MAX_AGE);
    res.json({
      token: accessToken,
      expiresIn: 15 * 60,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone || null }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
// Reads the HttpOnly refresh cookie and mints a fresh 15-min access token.
// Call this silently on app load and whenever a request comes back 401 —
// same pattern as VendorAuthContext.jsx already uses for vendor-auth.
router.post('/refresh', async (req, res) => {
  const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (payload.type !== 'refresh' || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Re-check the account still exists, so a deleted user can't silently
    // keep refreshing forever.
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [payload.id]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });

    const accessToken = signAccessToken(result.rows[0].id);
    res.json({ token: accessToken, expiresIn: 15 * 60 });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// GET /api/auth/me  (restore session)
router.get('/me', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'access' || !payload.id) return res.status(401).json({ error: 'Invalid token' });
    const result = await pool.query('SELECT id, name, email, phone FROM users WHERE id = $1', [payload.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/logout
// Clears the refresh cookie so the session can't be silently renewed.
// There's no access token to "revoke" server-side — it just expires
// within 15 minutes on its own, same tradeoff vendor-auth already accepts.
router.post('/logout', (req, res) => {
  clearRefreshCookie(res, REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH);
  res.status(204).end();
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!isEmail(email)) return res.status(400).json({ error: 'Provide a valid email' });

    const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);

    // Always respond the same way whether or not the email exists —
    // prevents leaking which emails are registered
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [hashedToken, expires, user.id]
      );

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

      await sendMail({
        to: email,
        subject: 'Reset your Celeste password',
        html: `<p>Hi ${user.name || ''},</p>
               <p>Click below to reset your password. This link expires in 1 hour.</p>
               <p><a href="${resetLink}">${resetLink}</a></p>
               <p>If you didn't request this, you can ignore this email.</p>`
      });
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!isEmail(email) || !token || !isPassword(password)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      'SELECT id, reset_token_expires FROM users WHERE email = $1 AND reset_token = $2',
      [email, hashedToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const user = result.rows[0];
    if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, user.id]
    );

    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exported alongside the router so googleAuth.js (mounted at the same
// /api/auth path) can issue tokens in the exact same shape instead of
// hand-rolling its own signing logic.
module.exports = router;
module.exports.signAccessToken = signAccessToken;
module.exports.signRefreshToken = signRefreshToken;
module.exports.REFRESH_COOKIE_NAME = REFRESH_COOKIE_NAME;
module.exports.REFRESH_COOKIE_PATH = REFRESH_COOKIE_PATH;
module.exports.REFRESH_COOKIE_MAX_AGE = REFRESH_COOKIE_MAX_AGE;