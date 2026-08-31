// server/routes/geocode.js
//
// Thin server-side proxy for OpenStreetMap's Nominatim reverse-geocoding
// API. LocationPicker.jsx used to call nominatim.openstreetmap.org
// directly from the browser — Nominatim's usage policy restricts raw
// client-side/browser requests (no real User-Agent, easy to accidentally
// burst past their ~1 req/sec limit), and it was rejecting those calls
// without CORS headers, which the browser then reports as a generic CORS
// error rather than the real cause.
//
// Routing through our own backend fixes both problems at once:
//   - It's same-origin from the browser's point of view, so no CORS issue.
//   - We can set a real, descriptive User-Agent (browsers block scripts
//     from overriding this header client-side), which is what Nominatim's
//     policy actually asks for.
//
// No auth required — this only forwards a lat/lng to a public geocoder and
// returns a display name, nothing user- or account-specific.

const express = require('express');
const router = express.Router();
const rateLimit = require('../middleware/rateLimit');

// Same per-IP throttle pattern used elsewhere in this app. Keeps us well
// under Nominatim's ~1 req/sec usage-policy limit even if many users hit
// this at once, and protects Nominatim (and us) from being accidentally
// hammered by a buggy frontend retry loop.
router.use(rateLimit({ max: 20 }));

// GET /api/geocode/reverse?lat=..&lng=..
router.get('/reverse', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required and must be numbers' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`;

    const upstream = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        // Nominatim's usage policy asks for a descriptive User-Agent
        // identifying the application — replace the domain/contact below
        // with your actual production domain/email before shipping.
        'User-Agent': 'CelesteEventPlanner/1.0 (ibmshubh@gmail.com)',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Nominatim returned ${upstream.status}` });
    }

    const data = await upstream.json();
    res.json({ display_name: data?.display_name || null });
  } catch (err) {
    console.error('GET /api/geocode/reverse error:', err.message);
    res.status(500).json({ error: 'Could not reach geocoding service' });
  }
});

module.exports = router;