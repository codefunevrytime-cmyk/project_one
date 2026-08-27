// server/lib/session.js
//
// Bearer-only from here on. The old celeste_session cookie (SameSite=Lax,
// Path=/) was the root cause of the earlier bug: Lax cookies are NOT sent
// on cross-origin fetch()/XHR (only on top-level navigations), so once the
// frontend and backend stopped being same-origin (ngrok, then production),
// that cookie silently never reached the server on API calls. vendor-auth
// had already worked around this by moving to Bearer; this brings
// client/admin auth (routes/auth.js, routes/googleAuth.js) in line with it.
//
// getToken() now ONLY reads the Authorization header. Refresh tokens are
// the one thing that still uses a cookie, and only because that's a
// deliberate security choice (HttpOnly, so JS/XSS can't read it) — not a
// same-origin assumption. Each refresh cookie is scoped via `path` to its
// own single refresh endpoint, so it's never sent anywhere else and
// SameSite=Strict on it is fine (it's only ever needed on a same-site
// call your own frontend makes to your own backend's refresh endpoint).

function getToken(req) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const bearer = authorization.slice(7).trim();
    if (bearer && bearer !== 'null' && bearer !== 'undefined') return bearer;
  }
  return null;
}

// Generic named-cookie reader (this project doesn't run cookie-parser, so
// req.cookies isn't available — manual parse keeps it dependency-free).
// Used only for reading refresh-token cookies (clientRefreshToken,
// vendorRefreshToken, adminRefreshToken, ...) — never for access tokens.
function getCookie(req, name) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Shared refresh-cookie writer so every *-auth router sets the same
// options (HttpOnly, Secure, SameSite=Strict, scoped path) instead of each
// hand-rolling Set-Cookie / res.cookie() slightly differently.
function setRefreshCookie(res, name, token, path, maxAgeMs) {
  res.cookie(name, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path,
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(res, name, path) {
  res.clearCookie(name, { path });
}

module.exports = { getToken, getCookie, setRefreshCookie, clearRefreshCookie };