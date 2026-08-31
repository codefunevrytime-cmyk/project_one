const pool = require('./db');
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const { getToken } = require('./lib/session');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
// Baseline browser hardening without relying on a reverse proxy.
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── CORS origins ─────────────────────────────────────────────────────────
// Read from FRONTEND_ORIGINS (comma-separated) instead of hardcoding.
// Free ngrok tunnel URLs rotate on every restart — before this change, the
// tunnel URL was hardcoded in two places (Express cors() below and the
// Socket.IO Server config further down), so a restart silently broke
// cross-origin requests until someone noticed and edited both spots by hand.
// Now: update .env, restart the process, done — one source of truth.
//
// Example .env line:
//   FRONTEND_ORIGINS=http://localhost:5173,http://localhost:5174,https://sharpie-pasty-equity.ngrok-free.dev
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn('[cors] WARNING: FRONTEND_ORIGINS is empty — no origins will be allowed. Set it in .env.');
}

const corsOptions = {
  origin: allowedOrigins,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Some legacy database rows reference images that were removed from local
// storage. Keep the record intact, but return an image placeholder instead of
// a browser-visible broken image and repeated 404 errors. Real files above are
// always served first.
app.use('/uploads', (req, res) => {
  res.type('image/svg+xml').send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#241b0d"/><stop offset="1" stop-color="#5b4216"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bg)"/>
      <circle cx="600" cy="340" r="100" fill="#c9a84c" opacity=".25"/>
      <path d="M500 440l72-86 58 62 72-96 98 120H500z" fill="#ead9a7" opacity=".78"/>
      <text x="600" y="570" fill="#f4e7be" font-family="serif" font-size="38" text-anchor="middle">Lumière Visual Studio</text>
      <text x="600" y="615" fill="#d7bd73" font-family="sans-serif" font-size="20" text-anchor="middle" letter-spacing="4">IMAGE UNAVAILABLE</text>
    </svg>
  `);
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.use('/api/reviews',        require('./routes/reviews'));
app.use('/api/availability',   require('./routes/availability'));
app.use('/api/gallery',        require('./routes/gallery'));
app.use('/api/queries',        require('./routes/queries'));
app.use('/api/admin',          require('./routes/admin'));
app.use('/api/vendors',        require('./routes/vendors'));
app.use('/api/services',       require('./routes/services'));
app.use('/api/payments',       require('./routes/payments'));
app.use('/api/vendor-payouts', require('./routes/vendorPayouts'));
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/auth',           require('./routes/googleAuth'));
app.use('/api/messages',       require('./routes/messages'));
app.use('/api/geocode',        require('./routes/geocode'));
// NEW — real venue photos for the Create Event "decoration location"
// secondary-screen picker (replaces the emoji-only dropdown). See
// routes/decorationVenues.js for the table + admin upload endpoints.
//
// MUST be required before ./routes/events: events.js's ensureTables()
// runs `ALTER TABLE event_requests ADD COLUMN decoration_venue_id
// INTEGER REFERENCES decoration_venues(id)` at module-load time, and
// Postgres will refuse to create a FK against a table that doesn't exist
// yet. That failure was being silently swallowed by the `.catch(() =>
// {})` around each ALTER, so on a fresh DB decoration_venue_id never got
// created — requiring this router first guarantees decoration_venues
// exists before events.js's migration runs.
app.use('/api/decoration-venues', require('./routes/decorationVenues'));
app.use('/api/events',         require('./routes/events'));
app.use('/api/upload',         require('./routes/upload'));
app.use('/api/analytics',      require('./routes/analytics'));

const { router: vendorAuthRouter } = require('./routes/vendorAuth');
app.use('/api/vendor-auth', vendorAuthRouter);

// ── Socket.IO ────────────────────────────────────────────────────────────
// app.listen(...) is replaced by http.createServer(app) + server.listen(...)
// so the same port can serve both the REST API and the WebSocket upgrade.
const server = http.createServer(app);

// Reuses the exact same corsOptions object as the Express cors() middleware
// above, so there's only one place to update the allowed origins list.
const io = new Server(server, {
  cors: corsOptions
});

// Identify each connecting socket from its JWT (same token the client
// already sends as "Authorization: Bearer <token>" on REST calls).
// Two token shapes exist in this app:
//   - client/admin tokens: { id, role }        (see routes/auth.js)
//   - vendor tokens:       { vendorUserId }     (see routes/vendorAuth.js)
// Both are read here so every connection type lands in the right room.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || getToken({ headers: socket.handshake.headers });
  if (!token) {
    console.log('[socket] connection with NO token — will not join any room');
    return next(); // allow unauthenticated connection; just won't join any room
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.isAdmin = decoded.role === 'admin';
    socket.vendorUserId = decoded.vendorUserId; // vendor tokens carry this instead of id/role
    console.log(`[socket] token verified — id=${decoded.id || '(none)'} role=${decoded.role || '(none)'} vendorUserId=${decoded.vendorUserId || '(none)'}`);
  } catch (err) {
    console.warn('[socket] auth FAILED — invalid/expired token:', err.message);
  }
  next();
});

io.on('connection', (socket) => {
  if (socket.isAdmin) {
    socket.join('admin');
    console.log(`[socket] ${socket.id} joined room "admin"`);
  }
  if (socket.userId) {
    socket.join(`client:${socket.userId}`);
    console.log(`[socket] ${socket.id} joined room "client:${socket.userId}"`);
  }
  if (socket.vendorUserId) {
    socket.join(`vendor:${socket.vendorUserId}`);
    console.log(`[socket] ${socket.id} joined room "vendor:${socket.vendorUserId}"`);
  }
  if (!socket.isAdmin && !socket.userId && !socket.vendorUserId) {
    console.log(`[socket] ${socket.id} connected but joined NO room (no valid token)`);
  }

  socket.on('disconnect', () => {
    console.log(`[socket] ${socket.id} disconnected`);
  });
});

// Make io reachable from route handlers via req.app.get('io')
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});