// Small dependency-free limiter. Use a shared reverse-proxy limiter in a
// multi-instance deployment; this protects the single-process deployment.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 60 } = {}) {
  const hits = new Map();
  let lastCleanup = 0;
  return (req, res, next) => {
    const now = Date.now();
    // Avoid unbounded memory use when many one-off IPs hit a public endpoint.
    if (now - lastCleanup >= windowMs) {
      for (const [ip, value] of hits) {
        if (value.resetAt <= now) hits.delete(ip);
      }
      lastCleanup = now;
    }
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

module.exports = rateLimit;
