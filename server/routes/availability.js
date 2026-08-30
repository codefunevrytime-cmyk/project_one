const express = require('express');
const router = express.Router();
const pool = require('../db');
const { vendorOrAdminAuth } = require('../middleware/vendorOrAdminAuth');
const adminAuth = require('../middleware/adminAuth');

// ── Migration: scope availability to a vendor, with studio-wide rows ─────
// FIXED: this table previously had no vendor_id column at all — the
// original `ON CONFLICT (date)` implies a single UNIQUE constraint on
// `date` alone, i.e. one shared global calendar, and every vendor's
// busy/free dates were being merged into (and could overwrite) the same
// rows.
//
// Design: vendor_id INTEGER, NULLABLE.
//   - vendor_id = <id>  → applies to that vendor only.
//   - vendor_id = NULL  → studio-wide (e.g. the whole studio is closed
//                          that day), applies to every vendor.
// Two separate uniqueness rules are needed because Postgres does NOT
// treat two NULLs as equal in a normal UNIQUE constraint — without the
// partial index below, an admin could create duplicate studio-wide rows
// for the same date with no conflict ever firing.
async function ensureVendorScoping() {
  await pool.query(
    `ALTER TABLE availability ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE`
  ).catch(() => {});

  // Drop whatever unique constraint currently sits on `date` alone
  // (name unknown to us — this table isn't created in this file — so
  // find it dynamically rather than guessing a constraint name).
  await pool.query(`
    DO $$
    DECLARE
      con RECORD;
    BEGIN
      FOR con IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'availability'
          AND tc.constraint_type = 'UNIQUE'
          AND kcu.column_name = 'date'
      LOOP
        EXECUTE format('ALTER TABLE availability DROP CONSTRAINT %I', con.constraint_name);
      END LOOP;
    END $$;
  `).catch(() => {});

  // One (date, status, note) per named vendor.
  await pool.query(
    `ALTER TABLE availability ADD CONSTRAINT availability_vendor_date_key UNIQUE (vendor_id, date)`
  ).catch(() => {});

  // One studio-wide row per date. A plain UNIQUE(vendor_id, date) does
  // NOT cover this — NULL <> NULL in Postgres uniqueness semantics — so
  // this needs its own partial index.
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS availability_studio_wide_date_idx
     ON availability (date) WHERE vendor_id IS NULL`
  ).catch(() => {});
}
ensureVendorScoping().catch(console.error);

// GET availability — three modes via query params:
//   ?vendor_id=<id>  → that vendor's own rows PLUS studio-wide rows
//                       (vendor_id IS NULL), since a studio closure makes
//                       every vendor unavailable too.
//   ?studio_only=true → ONLY studio-wide rows (vendor_id IS NULL). For
//                       callers that show a single shared calendar before
//                       any vendor is picked (e.g. CreateEventPage.jsx's
//                       Step-1 event-date picker) — they have no vendor_id
//                       yet and should never see any individual vendor's
//                       personal busy dates mixed in.
//   (neither)         → everything, unscoped (kept for any other caller
//                       of this route we can't see from here, e.g. an
//                       admin availability-management screen that needs
//                       to list/edit every row across every vendor).
//
// FIXED: CreateEventPage.jsx's Step-1 AvailabilityCalendar was calling
// this route with no params at all, landing in the "everything" branch.
// That merges every individual vendor's own busy dates into what's meant
// to be a studio-wide "is this day even open" picker — so a date could
// show as unavailable to the client purely because one specific vendor
// (who may not even end up being booked) was busy that day, while the
// studio itself and every other vendor were free. Row data was correct;
// only the query scoping was wrong, so nothing errored — the date just
// silently greyed out. `studio_only=true` gives that caller a route to
// the subset it actually wants.
// FIXED (timezone bug): every branch below now selects
// `TO_CHAR(date, 'YYYY-MM-DD') AS date` instead of `SELECT *`. With
// `SELECT *`, the pg driver parses the `date` column into a JS Date
// object using the Node process's local timezone, which then serializes
// to UTC when res.json() calls toISOString() — on a server running in
// IST (UTC+5:30), a stored '2026-08-31' comes back as
// '2026-08-30T18:30:00.000Z'. Any frontend code comparing that against
// the plain date string the client picked (e.g. VendorListingPage.jsx's
// `row.date.slice(0,10) === pickContext.eventDate`) silently fails —
// no error, the date just never matches, so nothing ever showed as
// busy even when a real, correctly-scoped row existed (this is exactly
// what was happening: the row was there, `raw rows` had 11 entries, but
// the date-matching filter still returned 0). TO_CHAR formats the date
// as text inside Postgres itself, before the pg driver's type parser
// (and its local-timezone assumption) ever touches it, so the value
// leaving this route is always the literal stored date, unambiguous
// regardless of what timezone the Node process happens to run in.
router.get('/', async (req, res) => {
  try {
    const { vendor_id, studio_only } = req.query;
    let result;
    if (vendor_id) {
      result = await pool.query(
        `SELECT id, vendor_id, TO_CHAR(date, 'YYYY-MM-DD') AS date, status, note
         FROM availability WHERE vendor_id = $1 OR vendor_id IS NULL ORDER BY date ASC`,
        [vendor_id]
      );
    } else if (studio_only === 'true' || studio_only === '1') {
      result = await pool.query(
        `SELECT id, vendor_id, TO_CHAR(date, 'YYYY-MM-DD') AS date, status, note
         FROM availability WHERE vendor_id IS NULL ORDER BY date ASC`
      );
    } else {
      result = await pool.query(
        `SELECT id, vendor_id, TO_CHAR(date, 'YYYY-MM-DD') AS date, status, note
         FROM availability ORDER BY date ASC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST set a date status
// Accepts either token:
//  - vendor token → always scoped to that vendor's own vendor_id; a
//    vendor can never set a studio-wide date or another vendor's date.
//  - admin token → vendor_id in the body is OPTIONAL.
//      - { vendor_id: 5, ... } → sets that vendor's date only.
//      - vendor_id omitted/null → sets a studio-wide date (blocks every
//        vendor for that date on the frontend, since GET merges it in).
router.post('/', vendorOrAdminAuth, async (req, res) => {
  try {
    const { date, status, note } = req.body;

    let vendorId;
    if (req.isAdmin) {
      // undefined/'' both mean "studio-wide" — normalize to null.
      vendorId = req.body.vendor_id || null;
    } else {
      vendorId = req.vendorId;
      if (!vendorId) return res.status(403).json({ error: 'No vendor profile linked to this account' });
    }

    if (vendorId === null) {
      await pool.query(
        `INSERT INTO availability (vendor_id, date, status, note)
         VALUES (NULL, $1, $2, $3)
         ON CONFLICT (date) WHERE vendor_id IS NULL DO UPDATE SET status = $2, note = $3`,
        [date, status, note]
      );
    } else {
      await pool.query(
        `INSERT INTO availability (vendor_id, date, status, note)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (vendor_id, date) DO UPDATE SET status = $3, note = $4`,
        [vendorId, date, status, note]
      );
    }
    res.json({ success: true, vendor_id: vendorId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an availability row — admin only.
// NEW: this route didn't exist before. AdminAvailability.jsx's POST form
// had no vendor_id field, so every row it ever created landed as
// studio-wide (vendor_id NULL) regardless of what the admin meant — see
// the comment on the POST route above. Without a way to delete those
// mis-scoped rows, there was no way to correct that data short of a
// direct DB query. Admin-only, matching every other admin-side mutation
// on this router (vendors.js's /toggle, /:id/price, etc.).
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM availability WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;