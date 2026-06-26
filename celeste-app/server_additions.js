// ── ADD THESE LINES TO YOUR server/server.js ──────────────────────────────
// Place after your existing route registrations

// Vendor auth portal routes
const { router: vendorAuthRouter } = require('./routes/vendorAuth');
app.use('/api/vendor-auth', vendorAuthRouter);

// ── END OF ADDITIONS ───────────────────────────────────────────────────────
