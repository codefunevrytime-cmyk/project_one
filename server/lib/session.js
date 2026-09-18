// server/lib/session.js
//
// Bearer-only access tokens. Refresh tokens remain HttpOnly cookies scoped to
// their individual refresh endpoints.

function getToken(req) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const bearer = authorization.slice(7).trim();
    if (bearer && bearer !== 'null' && bearer !== 'undefined') return bearer;
  }
  return null;
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

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
