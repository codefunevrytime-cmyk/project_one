const express = require('express');
const router = express.Router();
const pool = require('../db');
const { vendorOrAdminAuth } = require('../middleware/vendorOrAdminAuth');

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

// GET availability — optionally scoped to one vendor via ?vendor_id=.
// When vendor_id is given, returns that vendor's own rows PLUS any
// studio-wide rows (vendor_id IS NULL), since a studio closure makes
// every vendor unavailable too. Without vendor_id, returns everything
// (kept for any other caller of this route we can't see from here).
router.get('/', async (req, res) => {
  try {
    const { vendor_id } = req.query;
    const result = vendor_id
      ? await pool.query(
          'SELECT * FROM availability WHERE vendor_id = $1 OR vendor_id IS NULL ORDER BY date ASC',
          [vendor_id]
        )
      : await pool.query('SELECT * FROM availability ORDER BY date ASC');
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

module.exports = router;