// server/routes/googleAuth.js
//
// Mounted under /api/auth in server.js:
//   app.use('/api/auth', require('./routes/googleAuth'));
// Exposes POST /api/auth/google, matching AuthContext.jsx's loginWithGoogle().
//
// Requires: npm install google-auth-library  (in server/)
// Requires env var: GOOGLE_CLIENT_ID (same value used on the frontend's
// GoogleOAuthProvider clientId prop — a mismatch here is a common cause of
// "Invalid Google token" even when the frontend button itself works fine).
//
// Matches the actual `users` table shape used by routes/auth.js:
//   id, name, email, password, phone, google_id
// (password is the existing bcrypt-hash column — NOT password_hash. A
// Google-only account has no password, so it's left NULL there.)
//
// UPDATED: issues the same access-token/refresh-token pair as
// routes/auth.js's login/signup, using the helpers exported from that
// file, rather than a separate single 7-day cookie token. Both routes are
// mounted at /api/auth, so their tokens must be interchangeable —
// duplicating the signing logic here was how the two could quietly drift
// apart (e.g. missing `type: 'access'`, different TTL).

const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const {
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_COOKIE_MAX_AGE,
} = require('./auth');
const { setRefreshCookie } = require('../lib/session');

// Keep the users table in sync — same self-healing pattern routes/auth.js
// already uses for `phone`, so this doesn't require a separate manual
// migration step against your live DB.
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE`);
  } catch (err) {
    // ignore if already exists
  }
})();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'No credential provided' });
  }

  try {
    // 1. Verify the ID token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name: googleName, given_name, family_name, sub: googleId, email_verified } = payload;
    const fullName = googleName || `${given_name || ''} ${family_name || ''}`.trim() || email.split('@')[0];

    if (!email_verified) {
      return res.status(400).json({ error: 'Google email not verified' });
    }

    // 2. Look up existing user by email
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userResult.rows[0];

    if (!user) {
      // 3. No account yet -> create one via Google signup.
      //    `password` stays NULL — this account can only sign in via Google
      //    until/unless you add a "set a password" flow later.
      const insertResult = await pool.query(
        `INSERT INTO users (name, email, google_id, password)
         VALUES ($1, $2, $3, NULL)
         RETURNING id, name, email, phone, google_id`,
        [fullName, email, googleId]
      );
      user = insertResult.rows[0];
    } else if (!user.google_id) {
      // Existing email/password account signing in with Google for the first time -> link it
      await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
      user.google_id = googleId;
    }

    // 4. Issue the same access+refresh pair as routes/auth.js's own
    //    login/signup, so /api/auth/me and /api/auth/refresh work
    //    identically no matter which route the user signed in through.
    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_PATH, REFRESH_COOKIE_MAX_AGE);

    return res.json({
      token: accessToken,
      expiresIn: 15 * 60,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
      },
    });
  } catch (err) {
    // NOTE: this catch covers BOTH a bad/expired Google token AND any
    // unrelated server error (e.g. a DB query failure). If you see
    // "Invalid Google token" on the frontend, check this log line first —
    // it may not be a token problem at all.
    console.error('Google auth error:', err);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
});

module.exports = router;