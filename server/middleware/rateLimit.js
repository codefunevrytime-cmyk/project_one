// Small dependency-free limiter. Use a shared reverse-proxy limiter in a
// multi-instance deployment; this protects the single-process deployment.
//
// DISABLED IN DEV: outside NODE_ENV === 'production' this middleware is a
// pure no-op (skips straight to next()). React StrictMode double-invoking
// effects, Vite HMR remounts, and auto-refresh-and-retry logic in
// vendorApi.js/adminApi.js/AuthContext.jsx all generate far more requests
// per session than any real user would, so any fixed limit low enough to
// matter in production is too low to survive normal local development.
// Remove this early-return (or gate it behind an explicit env var) before
// relying on this in a staging/prod-like environment.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 60 } = {}) {
  const hits = new Map();
  let lastCleanup = 0;
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') return next();

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