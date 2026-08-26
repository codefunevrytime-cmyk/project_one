function getToken(req) {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const bearer = authorization.slice(7).trim();
    if (bearer && bearer !== 'null' && bearer !== 'undefined') return bearer;
  }
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)celeste_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setSession(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append('Set-Cookie', `celeste_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`);
}

function clearSession(res) {
  res.append('Set-Cookie', 'celeste_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

module.exports = { getToken, setSession, clearSession };
