// In dev, use a relative path so requests go through Vite's proxy
// (no second ngrok tunnel needed). In production, use the real API URL.
export const API_BASE = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  : '';

export const API_URL = `${API_BASE}/api`;

// Uploaded images (gallery photos, reference images etc.) also live on
// the backend, served at /uploads. Same pattern as API_BASE — relative
// in dev (goes through Vite proxy), real backend URL in production.
export const UPLOADS_URL = `${API_BASE}/uploads`;

// ── Shared placeholder image ────────────────────────────────────────────
// server/server.js mounts a catch-all handler right after the static
// `/uploads` middleware: any request to /uploads/<anything> that ISN'T a
// real file on disk falls through to a hand-drawn "Lumière Visual Studio /
// IMAGE UNAVAILABLE" SVG instead of a browser 404. That's why a vendor's
// deleted/missing photo already shows a branded placeholder instead of a
// broken-image icon — it's happening automatically on the server for any
// `/uploads/...` path.
//
// This constant deliberately points at a path that will never exist on
// disk, so it always falls through to that same SVG. Use it as the
// fallback `src` for ANY image anywhere in the app (vendor covers,
// gallery/event photos, portfolio images, bookmarks thumbnails, etc.) so
// every image — not just ones that happen to reference `/uploads/...` —
// gets the same consistent placeholder instead of:
//   1. a native broken-image icon (when src is '' / null / undefined), or
//   2. a broken-image icon (when src is an external URL, e.g. Unsplash,
//      that 404s or fails to load).
//
// See components/SafeImage.jsx for the <img> wrapper that wires this up
// automatically via onError + an empty-src fallback.
export const PLACEHOLDER_IMAGE = `${UPLOADS_URL}/__placeholder__`;