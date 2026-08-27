const express  = require('express');
const router   = express.Router();
const pool     = require('../db');
const Razorpay = require('razorpay');
const clientAuth = require('../middleware/clientAuth');
const clientOrAdminAuth = require('../middleware/clientOrAdminAuth');
const crypto   = require('crypto');
const { emitEventUpdate, emitAddonsUpdate } = require('../lib/emitEventUpdate');
const adminAuth = require('../middleware/adminAuth');
const { vendorOrAdminAuth, ownsVendor } = require('../middleware/vendorOrAdminAuth');
const rateLimit = require('../middleware/rateLimit');
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Same per-IP throttle pattern used in auth.js / admin.js / etc. This
// router was previously unthrottled — Razorpay order-creation routes
// (advance/balance/addon/deposit topup) and the deposit admin actions
// were all callable at unlimited rate per IP.
router.use(rateLimit({ max: 30 }));

// Default platform commission — now a FLAT percentage of each vendor's
// FULL quoted price, taken once, regardless of how many payments (advance/
// balance) that vendor's money moves across. See computeAdvanceSplit /
// computeBalanceSplit below for exactly how this gets front-loaded onto
// the advance payment.
const DEFAULT_COMMISSION_PCT = 10;

// Flat advance percentage for the event's own cost (reference event price +
// contingency buffer) — same for every event type, per your requirement.
// This is entirely separate from any vendor's own advance terms.
const EVENT_ADVANCE_PCT = 20;

// Fallback advance % for a vendor whose payment_terms field is empty or
// doesn't contain a parseable percentage — keeps every vendor working even
// if they never filled this field in.
const DEFAULT_VENDOR_ADVANCE_PCT = 30;

// ── Deposit system constants ─────────────────────────────────────────────
const DEPOSIT_TARGET_PAISE   = 100000; // ₹1000, in paise
const TRIAL_MONTHS           = 2;
const MIN_MONTHLY_COMMISSION_PAISE = 100000; // ₹1000/month commission floor
const INACTIVE_GRACE_DAYS    = 15; // days inactive in a month => no deduction

// ── Auto-migrate: payments table ────────────────────────────────────────
async function ensureColumns() {
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'advance'`).catch(() => {});
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'razorpay'`).catch(() => {});
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_commission DECIMAL`).catch(() => {});
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS vendor_share DECIMAL`).catch(() => {});
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE event_requests ADD COLUMN IF NOT EXISTS admin_commission_pct NUMERIC`).catch(() => {});
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS event_id INTEGER`).catch(() => {});
}
ensureColumns().catch(console.error);

// ── Auto-migrate: add-on charges table ──────────────────────────────────
async function ensureAddonsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_addons (
      id          SERIAL PRIMARY KEY,
      event_id    INTEGER NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
      label       TEXT NOT NULL,
      amount      NUMERIC NOT NULL,
      status      TEXT DEFAULT 'pending',   -- pending | paid | cancelled
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS addon_id INTEGER REFERENCES event_addons(id) ON DELETE SET NULL`).catch(() => {});
  await pool.query(`ALTER TABLE payments ALTER COLUMN razorpay_order_id DROP NOT NULL`).catch(() => {});
}
ensureAddonsTable().catch(console.error);

// ── Auto-migrate: vendor payouts ledger ─────────────────────────────────
async function ensureVendorPayoutsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_payouts (
      id                 SERIAL PRIMARY KEY,
      payment_id         INTEGER REFERENCES payments(id) ON DELETE CASCADE,
      event_id           INTEGER NOT NULL REFERENCES event_requests(id) ON DELETE CASCADE,
      vendor_id          INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
      amount             NUMERIC NOT NULL,   -- paise, vendor's net share (commission already deducted)
      commission_amount  NUMERIC NOT NULL DEFAULT 0, -- paise, platform commission taken off THIS vendor's slot for THIS payment
      status             TEXT DEFAULT 'pending', -- pending | paid | cancelled
      paid_at            TIMESTAMPTZ,
      reference_note     TEXT,
      marked_by_admin_id INTEGER,
      created_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS commission_amount NUMERIC NOT NULL DEFAULT 0`).catch(() => {});
}
ensureVendorPayoutsTable().catch(console.error);

// ── Auto-migrate: vendor security deposit system ─────────────────────────
async function ensureVendorDepositsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_deposits (
      id                  SERIAL PRIMARY KEY,
      vendor_id           INTEGER NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
      balance_paise       NUMERIC NOT NULL DEFAULT 0,
      target_paise        NUMERIC NOT NULL DEFAULT ${DEPOSIT_TARGET_PAISE},
      trial_started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      trial_ends_at       TIMESTAMPTZ NOT NULL,
      deposit_active       BOOLEAN NOT NULL DEFAULT false,
      status               TEXT NOT NULL DEFAULT 'trial',
      last_settled_month   TEXT,
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_deposit_ledger (
      id             SERIAL PRIMARY KEY,
      vendor_id      INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      type           TEXT NOT NULL,
      amount_paise   NUMERIC NOT NULL,
      balance_after  NUMERIC NOT NULL,
      month          TEXT,
      razorpay_payment_id TEXT,
      notes          TEXT,
      created_by     TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_status_log (
      id          SERIAL PRIMARY KEY,
      vendor_id   INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      is_online   BOOLEAN NOT NULL,
      started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at    TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendor_status_log_vendor ON vendor_status_log (vendor_id, started_at)`).catch(() => {});
}
ensureVendorDepositsTable().catch(console.error);

// ── Deposit helpers ────────────────────────────────────────────────────────
async function ensureVendorDepositRow(vendorId) {
  const existing = await pool.query(`SELECT * FROM vendor_deposits WHERE vendor_id = $1`, [vendorId]);
  if (existing.rows.length > 0) return existing.rows[0];

  const trialEndsAt = new Date();
  trialEndsAt.setMonth(trialEndsAt.getMonth() + TRIAL_MONTHS);

  const inserted = await pool.query(
    `INSERT INTO vendor_deposits (vendor_id, balance_paise, trial_ends_at, status)
     VALUES ($1, 0, $2, 'trial')
     RETURNING *`,
    [vendorId, trialEndsAt]
  );
  return inserted.rows[0];
}

async function logDepositEvent(vendorId, type, amountPaise, balanceAfter, { month = null, razorpayPaymentId = null, notes = null, createdBy = 'system' } = {}) {
  await pool.query(
    `INSERT INTO vendor_deposit_ledger
       (vendor_id, type, amount_paise, balance_after, month, razorpay_payment_id, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [vendorId, type, amountPaise, balanceAfter, month, razorpayPaymentId, notes, createdBy]
  );
}

async function logVendorStatusChange(vendorId, isOnline) {
  const last = await pool.query(
    `SELECT * FROM vendor_status_log WHERE vendor_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
    [vendorId]
  );
  if (last.rows.length > 0 && last.rows[0].is_online === isOnline) return;
  if (last.rows.length > 0) {
    await pool.query(`UPDATE vendor_status_log SET ended_at = NOW() WHERE id = $1`, [last.rows[0].id]);
  }
  await pool.query(
    `INSERT INTO vendor_status_log (vendor_id, is_online, started_at, ended_at) VALUES ($1, $2, NOW(), NULL)`,
    [vendorId, isOnline]
  );
}

async function getVendorMonthlyCommissionPaise(vendorId, monthStart, monthEnd) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(commission_amount), 0) AS total
     FROM vendor_payouts
     WHERE vendor_id = $1
       AND status IN ('pending','paid')
       AND created_at >= $2 AND created_at < $3`,
    [vendorId, monthStart, monthEnd]
  );
  return Math.round(Number(r.rows[0].total));
}

async function getInactiveDaysInMonth(vendorId, monthStart, monthEnd) {
  const r = await pool.query(
    `SELECT is_online, started_at, ended_at
     FROM vendor_status_log
     WHERE vendor_id = $1
       AND started_at < $3
       AND (ended_at IS NULL OR ended_at > $2)
     ORDER BY started_at ASC`,
    [vendorId, monthStart, monthEnd]
  );
  if (r.rows.length === 0) return 0;

  let inactiveMs = 0;
  const now = new Date();
  for (const row of r.rows) {
    if (row.is_online) continue;
    const rowStart = new Date(row.started_at);
    const periodStart = rowStart < monthStart ? monthStart : rowStart;
    const rowEndRaw = row.ended_at ? new Date(row.ended_at) : now;
    const periodEnd = rowEndRaw > monthEnd ? monthEnd : rowEndRaw;
    if (periodEnd > periodStart) inactiveMs += (periodEnd - periodStart);
  }
  return inactiveMs / 86400000;
}

async function settleVendorMonth(vendorId, monthStr) {
  const deposit = await ensureVendorDepositRow(vendorId);
  const now = new Date();
  if (deposit.status === 'trial' && now < new Date(deposit.trial_ends_at)) {
    return { skipped: true, reason: 'in_trial' };
  }
  if (deposit.status === 'exited') {
    return { skipped: true, reason: 'exited' };
  }

  const already = await pool.query(
    `SELECT 1 FROM vendor_deposit_ledger WHERE vendor_id = $1 AND type = 'monthly_shortfall' AND month = $2`,
    [vendorId, monthStr]
  );
  if (already.rows.length > 0) return { skipped: true, reason: 'already_settled' };

  const [y, m] = monthStr.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd   = new Date(y, m, 1);

  const inactiveDays = await getInactiveDaysInMonth(vendorId, monthStart, monthEnd);
  if (inactiveDays >= INACTIVE_GRACE_DAYS) {
    await pool.query(
      `UPDATE vendor_deposits SET last_settled_month = $1, updated_at = NOW() WHERE vendor_id = $2`,
      [monthStr, vendorId]
    );
    await logDepositEvent(vendorId, 'monthly_shortfall', 0, Number(deposit.balance_paise), {
      month: monthStr, notes: `No deduction — vendor inactive ${inactiveDays.toFixed(1)} days this month (protected, threshold ${INACTIVE_GRACE_DAYS}d).`,
    });
    return { skipped: true, reason: 'inactive_protected', inactiveDays };
  }

  const commissionPaise = await getVendorMonthlyCommissionPaise(vendorId, monthStart, monthEnd);
  const shortfallPaise  = Math.max(0, MIN_MONTHLY_COMMISSION_PAISE - commissionPaise);

  if (shortfallPaise <= 0) {
    await pool.query(
      `UPDATE vendor_deposits SET last_settled_month = $1, updated_at = NOW() WHERE vendor_id = $2`,
      [monthStr, vendorId]
    );
    await logDepositEvent(vendorId, 'monthly_shortfall', 0, Number(deposit.balance_paise), {
      month: monthStr, notes: `No shortfall — earned ₹${(commissionPaise/100).toFixed(2)} commission this month.`,
    });
    return { deducted: 0, commissionPaise, inactiveDays };
  }

  const currentBalance = Number(deposit.balance_paise);
  const actualDeduction = Math.min(shortfallPaise, currentBalance);
  const newBalance = currentBalance - actualDeduction;
  const newStatus = newBalance <= 0 ? 'depleted' : deposit.status;

  await pool.query(
    `UPDATE vendor_deposits SET balance_paise = $1, status = $2, last_settled_month = $3, updated_at = NOW() WHERE vendor_id = $4`,
    [newBalance, newStatus, monthStr, vendorId]
  );

  await logDepositEvent(vendorId, 'monthly_shortfall', -actualDeduction, newBalance, {
    month: monthStr,
    notes: `Commission ₹${(commissionPaise/100).toFixed(2)} < ₹1000 minimum. Shortfall ₹${(shortfallPaise/100).toFixed(2)} deducted (₹${(actualDeduction/100).toFixed(2)} actually taken from balance).`,
  });

  return { deducted: actualDeduction, commissionPaise, newBalance, depleted: newBalance <= 0, inactiveDays };
}

// ── Helpers ──────────────────────────────────────────────────────────────
async function getTotalPaidPaise(eventId) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM payments
     WHERE booking_id = $1 AND status = 'paid' AND payment_type IN ('advance','balance','addon')`,
    [eventId]
  );
  return Number(r.rows[0].total);
}

async function getTotalRefundedPaise(eventId) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(refund_amount), 0) AS refunded
     FROM payments
     WHERE booking_id = $1 AND status = 'refunded'`,
    [eventId]
  );
  return Number(r.rows[0].refunded);
}

// Sum of every active (non-replaced) vendor slot's quoted_price, in paise —
// the ONLY portion of budget_estimate that is a vendor's money.
async function getVendorCostsTotalPaise(eventId) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(quoted_price), 0) AS total
     FROM event_vendor_slots
     WHERE event_id = $1 AND status != 'replaced' AND vendor_id IS NOT NULL`,
    [eventId]
  );
  return Math.round(Number(r.rows[0].total) * 100);
}

// The non-vendor portion of budget_estimate — reference event price +
// contingency buffer. This is what used to be shown as "Other charges" on
// checkout; it's now the ONLY thing the flat 20% event-advance applies to.
async function getEventOnlyCostPaise(eventId, totalBudgetRupees) {
  const totalBudgetPaise = Math.round(Number(totalBudgetRupees || 0) * 100);
  const vendorCostsTotalPaise = await getVendorCostsTotalPaise(eventId);
  return Math.max(0, totalBudgetPaise - vendorCostsTotalPaise);
}

// Pulls a percentage out of a vendor's free-text payment_terms field
// (e.g. "20% adv" -> 20). Falls back to DEFAULT_VENDOR_ADVANCE_PCT if the
// field is empty, unparseable, or out of a sane 1-100 range.
function parseAdvancePct(paymentTermsText) {
  if (!paymentTermsText) return DEFAULT_VENDOR_ADVANCE_PCT;
  const match = String(paymentTermsText).match(/(\d+(\.\d+)?)\s*%/);
  if (!match) return DEFAULT_VENDOR_ADVANCE_PCT;
  const pct = Number(match[1]);
  if (!pct || pct <= 0 || pct > 100) return DEFAULT_VENDOR_ADVANCE_PCT;
  return pct;
}

// Every active vendor slot on an event, enriched with that vendor's own
// advance % (from their payment_terms) and their FIXED total commission
// owed — commissionPct × their full quoted_price, computed once and never
// recalculated differently at balance time. This fixed number is what lets
// commission always add up to exactly commissionPct% of the vendor's total,
// no matter how it gets front-loaded across advance/balance payments.
async function getVendorSlotsWithTerms(eventId, commissionPct) {
  const r = await pool.query(
    `SELECT evs.vendor_id, evs.service_type, evs.quoted_price,
            v.name AS vendor_name, v.payment_terms
     FROM event_vendor_slots evs
     JOIN vendors v ON v.id = evs.vendor_id
     WHERE evs.event_id = $1 AND evs.status != 'replaced' AND evs.vendor_id IS NOT NULL`,
    [eventId]
  );

  return r.rows.map(row => {
    const quotedPricePaise = Math.round(Number(row.quoted_price) * 100);
    const advancePct = parseAdvancePct(row.payment_terms);
    return {
      vendor_id: row.vendor_id,
      vendor_name: row.vendor_name,
      service_type: row.service_type,
      quoted_price: Number(row.quoted_price),
      quoted_price_paise: quotedPricePaise,
      advance_pct: advancePct,
      advance_amount_paise: Math.round(quotedPricePaise * (advancePct / 100)),
      commission_owed_paise: Math.round(quotedPricePaise * (commissionPct / 100)),
      payment_terms_raw: row.payment_terms || null,
    };
  });
}

// ── computeAdvanceSplit ───────────────────────────────────────────────────
// The advance payment = flat 20% of the event-only cost (reference event +
// contingency) PLUS each vendor's own advance% of their full quoted price.
// Commission is taken here, upfront, off each vendor's advance slice —
// capped at that slice (a vendor with a very low advance % simply carries
// any remaining commission over to be settled at balance time instead).
async function computeAdvanceSplit(eventId, totalBudgetRupees, commissionPct) {
  const eventOnlyPaise = await getEventOnlyCostPaise(eventId, totalBudgetRupees);
  const eventAdvancePaise = Math.round(eventOnlyPaise * (EVENT_ADVANCE_PCT / 100));

  const slots = await getVendorSlotsWithTerms(eventId, commissionPct);

  let vendorShareTotal = 0;
  let commissionFromVendorsTotal = 0;
  const perVendorPayouts = [];

  for (const slot of slots) {
    const commissionTakenNow = Math.min(slot.commission_owed_paise, slot.advance_amount_paise);
    const vendorShareNow = slot.advance_amount_paise - commissionTakenNow;
    vendorShareTotal += vendorShareNow;
    commissionFromVendorsTotal += commissionTakenNow;
    perVendorPayouts.push({
      vendor_id: slot.vendor_id,
      amount: vendorShareNow,
      commission_amount: commissionTakenNow,
    });
  }

  const vendorAdvanceTotalPaise = slots.reduce((s, x) => s + x.advance_amount_paise, 0);
  const totalAmountPaise = eventAdvancePaise + vendorAdvanceTotalPaise;
  const adminCommission = eventAdvancePaise + commissionFromVendorsTotal;

  return { totalAmountPaise, adminCommission, vendorShare: vendorShareTotal, perVendorPayouts, slots, eventAdvancePaise };
}

// ── computeBalanceSplit ───────────────────────────────────────────────────
// balancePaise is whatever's left of the total budget (server-computed the
// same way it always was: total - alreadyPaid - refunded). Per vendor slot,
// the balance owed is the remaining (100 - advance%) portion of their
// quoted price, minus whatever commission wasn't already collected during
// the advance (normally ₹0 extra here, since advance % almost always
// exceeds the commission %, but this correctly carries over the remainder
// on any vendor whose advance was smaller than their commission owed).
async function computeBalanceSplit(eventId, balancePaise, commissionPct) {
  const slots = await getVendorSlotsWithTerms(eventId, commissionPct);

  const alreadyRes = await pool.query(
    `SELECT vendor_id, COALESCE(SUM(commission_amount), 0) AS taken
     FROM vendor_payouts WHERE event_id = $1 AND status != 'cancelled'
     GROUP BY vendor_id`,
    [eventId]
  );
  const takenMap = {};
  alreadyRes.rows.forEach(r => { takenMap[r.vendor_id] = Number(r.taken); });

  let vendorShareTotal = 0;
  const perVendorPayouts = [];

  for (const slot of slots) {
    const remainingOwedPaise = slot.quoted_price_paise - slot.advance_amount_paise;
    const alreadyTaken = takenMap[slot.vendor_id] || 0;
    const remainingCommission = Math.max(0, slot.commission_owed_paise - alreadyTaken);
    const commissionNow = Math.min(remainingCommission, remainingOwedPaise);
    const vendorShareNow = remainingOwedPaise - commissionNow;
    vendorShareTotal += vendorShareNow;
    perVendorPayouts.push({
      vendor_id: slot.vendor_id,
      amount: vendorShareNow,
      commission_amount: commissionNow,
    });
  }

  // Whatever of the balance isn't vendor money is admin's — this covers any
  // leftover event-only balance (reference event/contingency remainder)
  // plus any commission shortfall just carried over above.
  const adminCommission = balancePaise - vendorShareTotal;

  return { adminCommission, vendorShare: vendorShareTotal, perVendorPayouts };
}

// ── Proportional split — RETAINED, addon payments only ───────────────────
// Add-on charges (extra costs raised mid-event) aren't tied to any single
// vendor's own quoted price/advance terms, so they keep the original
// proportional-split behavior: split across active vendor slots by their
// share of total vendor cost, commission taken proportionally. This is
// unrelated to the advance/balance restructuring above.
async function splitPaymentProportional(eventId, totalBudgetRupees, paymentAmountPaise, commissionPct) {
  const totalBudgetPaise = Math.round(Number(totalBudgetRupees || 0) * 100);
  const vendorCostsTotalPaise = await getVendorCostsTotalPaise(eventId);

  const vendorAttributablePaise = totalBudgetPaise > 0
    ? Math.round(paymentAmountPaise * (vendorCostsTotalPaise / totalBudgetPaise))
    : 0;

  const commissionOnVendorPortion = Math.round(vendorAttributablePaise * (commissionPct / 100));
  const vendorShare      = vendorAttributablePaise - commissionOnVendorPortion;
  const adminCommission  = paymentAmountPaise - vendorShare;

  return { adminCommission, vendorShare, vendorCommission: commissionOnVendorPortion };
}

async function createVendorPayoutsProportional(paymentId, eventId, vendorSharePaise, vendorCommissionPaise = 0) {
  if (!vendorSharePaise || vendorSharePaise <= 0) return;

  const slotsRes = await pool.query(
    `SELECT vendor_id, quoted_price FROM event_vendor_slots
     WHERE event_id = $1 AND status != 'replaced' AND vendor_id IS NOT NULL`,
    [eventId]
  );
  const slots = slotsRes.rows.filter(s => Number(s.quoted_price) > 0);
  if (slots.length === 0) return;

  const totalQuoted = slots.reduce((s, r) => s + Number(r.quoted_price), 0);
  let allocatedShare = 0;
  let allocatedCommission = 0;

  for (let i = 0; i < slots.length; i++) {
    const isLast = i === slots.length - 1;
    const share = isLast
      ? vendorSharePaise - allocatedShare
      : Math.round(vendorSharePaise * (Number(slots[i].quoted_price) / totalQuoted));
    allocatedShare += share;

    const commission = isLast
      ? Math.max(0, vendorCommissionPaise - allocatedCommission)
      : Math.round(vendorCommissionPaise * (Number(slots[i].quoted_price) / totalQuoted));
    allocatedCommission += commission;

    if (share <= 0 && commission <= 0) continue;

    await pool.query(
      `INSERT INTO vendor_payouts (payment_id, event_id, vendor_id, amount, commission_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [paymentId, eventId, slots[i].vendor_id, Math.max(share, 0), Math.max(commission, 0)]
    );
    await ensureVendorDepositRow(slots[i].vendor_id).catch(() => {});
  }
}

// ── createVendorPayoutsFromBreakdown ─────────────────────────────────────
// Used by BOTH advance and balance payments — inserts a payout row per
// vendor slot directly from a computeAdvanceSplit/computeBalanceSplit
// breakdown, rather than re-deriving shares proportionally.
async function createVendorPayoutsFromBreakdown(paymentId, eventId, perVendorPayouts) {
  for (const p of perVendorPayouts) {
    if (p.amount <= 0 && p.commission_amount <= 0) continue;
    await pool.query(
      `INSERT INTO vendor_payouts (payment_id, event_id, vendor_id, amount, commission_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [paymentId, eventId, p.vendor_id, Math.max(p.amount, 0), Math.max(p.commission_amount, 0)]
    );
    await ensureVendorDepositRow(p.vendor_id).catch(() => {});
  }
}

// ── Payment-eligibility gate ──────────────────────────────────────────────
// Centralised so /create-order (online) and /offline (admin-recorded) can't
// drift apart. Mirrors the agreed status lifecycle (see events.js's header
// comment):
//   advance → only once the event is sitting at 'payment_pending' (i.e.
//             admin approved AND all vendors accepted — set automatically,
//             see maybeAdvanceEventStatus in events.js).
//   balance → only once admin has manually marked the event 'completed'.
//             This is intentional, not a default worth loosening: the
//             client's "Pay Balance" button only ever appears after
//             Completed (see MyEvents.jsx's needsBalance), so the backend
//             enforces the same rule rather than trusting the frontend.
//   addon   → allowed any time the event isn't cancelled; add-on charges
//             can come up at any stage once vendors/payment are underway.
// Throws an object {status, error} the route can respond with directly.
function assertPaymentEligible(event, paymentType) {
  if (event.status === 'cancelled') {
    throw { status: 400, error: 'This event has been cancelled' };
  }
  if (paymentType === 'advance' && event.status !== 'payment_pending') {
    throw { status: 400, error: 'This event is not ready for the advance payment yet' };
  }
  if (paymentType === 'balance' && event.status !== 'completed') {
    throw { status: 400, error: 'Balance payment is only available once the event has been marked completed' };
  }
}

// ── POST /api/payments/create-order ─────────────────────────────────────
router.post('/create-order', clientAuth, async (req, res) => {
  try {
    const { booking_id, payment_type = 'advance', addon_id } = req.body;

    const evRes = await pool.query('SELECT * FROM event_requests WHERE id = $1', [booking_id]);
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.client_id !== req.clientId) return res.status(403).json({ error: 'Not authorized for this event' });

    try {
      assertPaymentEligible(event, payment_type);
    } catch (gate) {
      return res.status(gate.status).json({ error: gate.error });
    }

    const totalBudgetPaise = Math.round(Number(event.budget_estimate || 0) * 100);
    const alreadyPaidPaise = await getTotalPaidPaise(booking_id);
    const refundedPaise    = await getTotalRefundedPaise(booking_id);
    const commissionPct    = event.admin_commission_pct || DEFAULT_COMMISSION_PCT;

    let amount; // paise

    if (payment_type === 'advance') {
      const advanceAlreadyPaid = await pool.query(
        `SELECT 1 FROM payments WHERE booking_id = $1 AND payment_type = 'advance' AND status = 'paid' LIMIT 1`,
        [booking_id]
      );
      if (advanceAlreadyPaid.rows.length > 0) {
        return res.status(400).json({ error: 'Advance already paid for this event' });
      }
      const split = await computeAdvanceSplit(booking_id, event.budget_estimate, commissionPct);
      amount = split.totalAmountPaise;
    } else if (payment_type === 'balance') {
      amount = totalBudgetPaise - alreadyPaidPaise - refundedPaise;
      if (amount <= 0) {
        return res.status(400).json({ error: 'No balance due for this event' });
      }
    } else if (payment_type === 'addon') {
      if (!addon_id) return res.status(400).json({ error: 'addon_id is required for addon payments' });
      const addonRes = await pool.query(`SELECT * FROM event_addons WHERE id = $1 AND event_id = $2`, [addon_id, booking_id]);
      const addon = addonRes.rows[0];
      if (!addon) return res.status(404).json({ error: 'Add-on not found' });
      if (addon.status !== 'pending') return res.status(400).json({ error: 'This add-on is not payable' });
      amount = Math.round(Number(addon.amount) * 100);
    } else {
      return res.status(400).json({ error: "payment_type must be 'advance', 'balance', or 'addon'" });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt:  `event_${booking_id}_${payment_type}_${Date.now()}`,
      notes:    { event_id: String(booking_id), payment_type },
    });

    await pool.query(
      `INSERT INTO payments (booking_id, razorpay_order_id, amount, status, payment_type, payment_method, addon_id)
       VALUES ($1, $2, $3, 'pending', $4, 'razorpay', $5)`,
      [booking_id, order.id, amount, payment_type, payment_type === 'addon' ? addon_id : null]
    );

    res.json({ success: true, order_id: order.id, amount, payment_type, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/verify ───────────────────────────────────────────
router.post('/verify', clientAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const eventRes = await pool.query('SELECT * FROM event_requests WHERE id = $1', [booking_id]);
    const event = eventRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.client_id !== req.clientId) return res.status(403).json({ error: 'Not authorized for this event' });

    const paymentRes = await pool.query('SELECT * FROM payments WHERE razorpay_order_id = $1', [razorpay_order_id]);
    const payment = paymentRes.rows[0];
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    if (payment.booking_id !== Number(booking_id) || payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment is not pending for this event' });
    }

    const commissionPct = event.admin_commission_pct || DEFAULT_COMMISSION_PCT;

    let adminCommission, vendorShare, perVendorPayouts, addonVendorCommission;

    if (payment.payment_type === 'advance') {
      const split = await computeAdvanceSplit(booking_id, event.budget_estimate, commissionPct);
      adminCommission = split.adminCommission;
      vendorShare = split.vendorShare;
      perVendorPayouts = split.perVendorPayouts;
    } else if (payment.payment_type === 'balance') {
      const split = await computeBalanceSplit(booking_id, payment.amount, commissionPct);
      adminCommission = split.adminCommission;
      vendorShare = split.vendorShare;
      perVendorPayouts = split.perVendorPayouts;
    } else {
      const split = await splitPaymentProportional(booking_id, event.budget_estimate, payment.amount, commissionPct);
      adminCommission = split.adminCommission;
      vendorShare = split.vendorShare;
      addonVendorCommission = split.vendorCommission;
    }

    const markResult = await pool.query(
      `UPDATE payments
       SET razorpay_payment_id = $1, status = 'paid', admin_commission = $2, vendor_share = $3, event_id = $4
       WHERE razorpay_order_id = $5 AND booking_id = $4 AND status = 'pending'
       RETURNING id`,
      [razorpay_payment_id, adminCommission, vendorShare, booking_id, razorpay_order_id]
    );
    if (markResult.rowCount !== 1) return res.status(409).json({ error: 'Payment was already processed' });

    if (payment.addon_id) {
      await pool.query(`UPDATE event_addons SET status = 'paid' WHERE id = $1`, [payment.addon_id]);
    }

    // ── Status transition ──────────────────────────────────────────────
    // advance → 'confirmed', automatically, no admin click required (see
    //   the status-lifecycle comment at the top of events.js).
    // balance → status is deliberately left UNCHANGED. It used to also
    //   auto-flip to 'completed' here if the event date had already
    //   passed — that's been removed. 'completed' is admin-only now (the
    //   Completed button in AdminEventRequests.jsx), and a balance payment
    //   is only reachable in the first place once the event is already
    //   'completed' (assertPaymentEligible above enforces this), so there
    //   was never anything for this branch to actually change anyway.
    // addon → doesn't touch event.status at all.
    let newPaymentStatus = event.payment_status;
    let newStatus = event.status;

    if (payment.payment_type === 'advance') {
      newPaymentStatus = 'advance_paid';
      newStatus = 'confirmed';
    } else if (payment.payment_type === 'balance') {
      newPaymentStatus = 'fully_paid';
    }

    await pool.query(
      `UPDATE event_requests SET payment_status = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newPaymentStatus, newStatus, booking_id]
    );

    if (payment.payment_type === 'advance' || payment.payment_type === 'balance') {
      await createVendorPayoutsFromBreakdown(payment.id, booking_id, perVendorPayouts);
    } else {
      await createVendorPayoutsProportional(payment.id, booking_id, vendorShare, addonVendorCommission);
    }

    // Payment landed — client's status/payment_status changed (and, for an
    // addon payment, that addon just flipped to 'paid') so push both live.
    await emitEventUpdate(req.app.get('io'), booking_id);
    if (payment.addon_id) {
      await emitAddonsUpdate(req.app.get('io'), booking_id);
    }

    res.json({ success: true, adminCommission, vendorShare, payment_type: payment.payment_type });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/refund ───────────────────────────────────────────
router.post('/refund', adminAuth, async (req, res) => {
  try {
    const { booking_id, refund_pct, reason } = req.body;

    const payRes = await pool.query(
      `SELECT * FROM payments WHERE booking_id = $1 AND status = 'paid' ORDER BY created_at DESC LIMIT 1`,
      [booking_id]
    );
    if (payRes.rows.length === 0) return res.json({ success: true, message: 'No payment to refund' });

    const payment    = payRes.rows[0];
    const refundAmt  = Math.round((payment.amount * (refund_pct || 100)) / 100);

    if (!payment.razorpay_payment_id) {
      await pool.query(
        `UPDATE payments SET status = 'refunded', refund_amount = $1, notes = $2 WHERE id = $3`,
        [refundAmt, reason || 'Manual refund (offline payment)', payment.id]
      );
      await pool.query(
        `UPDATE event_requests SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [booking_id]
      ).catch(() => {});
      await pool.query(
        `UPDATE vendor_payouts SET status = 'cancelled' WHERE payment_id = $1 AND status = 'pending'`,
        [payment.id]
      ).catch(() => {});
      await emitEventUpdate(req.app.get('io'), booking_id);
      return res.json({ success: true, refund_id: null, refund_amount: refundAmt, note: 'Offline payment — settle refund manually outside the app.' });
    }

    const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
      amount: refundAmt,
      notes:  { event_id: String(booking_id), reason: reason || 'Booking cancelled' },
    });

    await pool.query(
      `UPDATE payments SET status = 'refunded', refund_id = $1, refund_amount = $2, notes = $3 WHERE id = $4`,
      [refund.id, refundAmt, reason || null, payment.id]
    );

    await pool.query(
      `UPDATE event_requests SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    ).catch(() => {});

    await pool.query(
      `UPDATE vendor_payouts SET status = 'cancelled' WHERE payment_id = $1 AND status = 'pending'`,
      [payment.id]
    ).catch(() => {});

    await emitEventUpdate(req.app.get('io'), booking_id);

    res.json({ success: true, refund_id: refund.id, refund_amount: refundAmt });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Add-on charges ────────────────────────────────────────────────────

router.post('/addons', adminAuth, async (req, res) => {
  try {
    const { event_id, label, amount, notes } = req.body;
    if (!event_id || !label || !amount) {
      return res.status(400).json({ error: 'event_id, label and amount are required' });
    }
    const result = await pool.query(
      `INSERT INTO event_addons (event_id, label, amount, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [event_id, label, amount, notes || null]
    );

    // New charge created — client's MyEvents "Pay ₹X" prompt and admin's
    // add-on list should both pick it up without a reload.
    await emitAddonsUpdate(req.app.get('io'), event_id);

    res.json({ success: true, addon: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/addons/:eventId', clientOrAdminAuth, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const evRes = await pool.query('SELECT client_email FROM event_requests WHERE id = $1', [eventId]);
    if (evRes.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    if (!req.isAdmin && evRes.rows[0].client_email !== req.clientEmail) {
      return res.status(403).json({ error: 'Not authorized for this event' });
    }
    const result = await pool.query(
      `SELECT * FROM event_addons WHERE event_id = $1 ORDER BY created_at DESC`,
      [req.params.eventId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/addons/:addonId/cancel', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE event_addons SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING event_id`,
      [req.params.addonId]
    );
    const eventId = result.rows[0]?.event_id;
    if (eventId) {
      await emitAddonsUpdate(req.app.get('io'), eventId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/offline ──────────────────────────────────────────
router.post('/offline', adminAuth, async (req, res) => {
  try {
    // admin_id can still be passed in the body for the notes text below,
    // but req.adminId (from the verified token) is the trustworthy value —
    // prefer it if you want to attribute this to a specific admin account.
    const { booking_id, payment_type = 'advance', addon_id, payment_method = 'cash', notes, admin_id } = req.body;

    const evRes = await pool.query('SELECT * FROM event_requests WHERE id = $1', [booking_id]);
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Offline payments are admin-recorded, but that doesn't mean the
    // status rules are optional — enforce the same gate as /create-order
    // (previously missing here entirely) so admin can't accidentally
    // record an advance before payment_pending or a balance before the
    // event is actually marked completed.
    try {
      assertPaymentEligible(event, payment_type);
    } catch (gate) {
      return res.status(gate.status).json({ error: gate.error });
    }

    const totalBudgetPaise = Math.round(Number(event.budget_estimate || 0) * 100);
    const alreadyPaidPaise = await getTotalPaidPaise(booking_id);
    const refundedPaise    = await getTotalRefundedPaise(booking_id);
    const commissionPct    = event.admin_commission_pct || DEFAULT_COMMISSION_PCT;

    let amountPaise;
    let addonRow = null;

    if (payment_type === 'advance') {
      const advanceAlreadyPaid = await pool.query(
        `SELECT 1 FROM payments WHERE booking_id = $1 AND payment_type = 'advance' AND status = 'paid' LIMIT 1`,
        [booking_id]
      );
      if (advanceAlreadyPaid.rows.length > 0) {
        return res.status(400).json({ error: 'Advance already paid for this event' });
      }
      const split = await computeAdvanceSplit(booking_id, event.budget_estimate, commissionPct);
      amountPaise = split.totalAmountPaise;
    } else if (payment_type === 'balance') {
      amountPaise = totalBudgetPaise - alreadyPaidPaise - refundedPaise;
      if (amountPaise <= 0) return res.status(400).json({ error: 'No balance due for this event' });
    } else if (payment_type === 'addon') {
      if (!addon_id) return res.status(400).json({ error: 'addon_id is required' });
      const addonRes = await pool.query(`SELECT * FROM event_addons WHERE id = $1 AND event_id = $2`, [addon_id, booking_id]);
      addonRow = addonRes.rows[0];
      if (!addonRow || addonRow.status !== 'pending') {
        return res.status(400).json({ error: 'Add-on not found or already settled' });
      }
      amountPaise = Math.round(Number(addonRow.amount) * 100);
    } else {
      return res.status(400).json({ error: 'Invalid payment_type' });
    }

    let adminCommission, vendorShare, perVendorPayouts, addonVendorCommission;

    if (payment_type === 'advance') {
      const split = await computeAdvanceSplit(booking_id, event.budget_estimate, commissionPct);
      adminCommission = split.adminCommission;
      vendorShare = split.vendorShare;
      perVendorPayouts = split.perVendorPayouts;
    } else if (payment_type === 'balance') {
      const split = await computeBalanceSplit(booking_id, amountPaise, commissionPct);
      adminCommission = split.adminCommission;
      vendorShare = split.vendorShare;
      perVendorPayouts = split.perVendorPayouts;
    } else {
      const split = await splitPaymentProportional(booking_id, event.budget_estimate, amountPaise, commissionPct);
      adminCommission = split.adminCommission;
      vendorShare = split.vendorShare;
      addonVendorCommission = split.vendorCommission;
    }

    const insertRes = await pool.query(
      `INSERT INTO payments
         (booking_id, amount, status, payment_type, payment_method, admin_commission, vendor_share, notes, addon_id, event_id)
       VALUES ($1, $2, 'paid', $3, $4, $5, $6, $7, $8, $1)
       RETURNING *`,
      [
        booking_id, amountPaise, payment_type, payment_method,
        adminCommission, vendorShare,
        notes ? `${notes} (recorded offline${admin_id ? ' by admin #' + admin_id : ''})` : 'Recorded offline by admin',
        addon_id || null,
      ]
    );

    if (addonRow) {
      await pool.query(`UPDATE event_addons SET status = 'paid' WHERE id = $1`, [addon_id]);
    }

    // Same reasoning as /verify above: advance auto-confirms, balance
    // leaves status untouched (it's already 'completed' by this point —
    // see assertPaymentEligible), addon doesn't touch status.
    let newPaymentStatus = event.payment_status;
    let newStatus = event.status;
    if (payment_type === 'advance') {
      newPaymentStatus = 'advance_paid';
      newStatus = 'confirmed';
    } else if (payment_type === 'balance') {
      newPaymentStatus = 'fully_paid';
    }

    await pool.query(
      `UPDATE event_requests SET payment_status = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newPaymentStatus, newStatus, booking_id]
    );

    if (payment_type === 'advance' || payment_type === 'balance') {
      await createVendorPayoutsFromBreakdown(insertRes.rows[0].id, booking_id, perVendorPayouts);
    } else {
      await createVendorPayoutsProportional(insertRes.rows[0].id, booking_id, vendorShare, addonVendorCommission);
    }

    // Same as /verify above — push the fresh status/payment_status, and the
    // addon's new 'paid' status if this was an add-on settlement.
    await emitEventUpdate(req.app.get('io'), booking_id);
    if (addonRow) {
      await emitAddonsUpdate(req.app.get('io'), booking_id);
    }

    res.json({ success: true, payment: insertRes.rows[0] });
  } catch (err) {
    console.error('Offline payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments/vendor-advance-terms/:eventId ──────────────────────
// Full advance breakdown for the checkout page — the event's own 20%
// advance (on reference event + contingency only), plus each vendor's own
// advance %, amount, and how much commission gets front-loaded off that
// vendor's slice. This is what PaymentCheckout.jsx renders instead of the
// old single "30% of everything" figure.
router.get('/vendor-advance-terms/:eventId', clientAuth, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const evRes = await pool.query(
      'SELECT id, budget_estimate, admin_commission_pct, client_email FROM event_requests WHERE id = $1',
      [eventId]
    );
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.client_email !== req.clientEmail) {
      return res.status(403).json({ error: 'Not authorized for this event' });
    }

    const commissionPct = event.admin_commission_pct || DEFAULT_COMMISSION_PCT;
    const split = await computeAdvanceSplit(eventId, event.budget_estimate, commissionPct);

    res.json({
      event_id: Number(eventId),
      event_advance_pct: EVENT_ADVANCE_PCT,
      event_only_advance_amount: split.eventAdvancePaise / 100,
      total_advance_amount: split.totalAmountPaise / 100,
      vendors: split.slots.map(s => ({
        vendor_id: s.vendor_id,
        vendor_name: s.vendor_name,
        service_type: s.service_type,
        quoted_price: s.quoted_price,
        advance_pct: s.advance_pct,
        advance_amount: s.advance_amount_paise / 100,
        payment_terms_raw: s.payment_terms_raw,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments/summary/:eventId ──────────────────────────────────
router.get('/summary/:eventId', clientAuth, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const evRes = await pool.query(
      'SELECT id, budget_estimate, payment_status, status, event_date, client_email FROM event_requests WHERE id = $1',
      [eventId]
    );
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.client_email !== req.clientEmail) {
      return res.status(403).json({ error: 'Not authorized for this event' });
    }

    const paymentsRes = await pool.query(
      `SELECT id, payment_type, payment_method, amount, status, refund_amount, notes, addon_id, created_at
       FROM payments WHERE booking_id = $1 ORDER BY created_at ASC`,
      [eventId]
    );
    const payments = paymentsRes.rows;

    const addonsRes = await pool.query(
      `SELECT * FROM event_addons WHERE event_id = $1 ORDER BY created_at DESC`,
      [eventId]
    );

    const totalBudgetPaise = Math.round(Number(event.budget_estimate || 0) * 100);
    const paidPaise     = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
    const refundedPaise = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + Number(p.refund_amount || 0), 0);
    const netPaidPaise  = paidPaise - refundedPaise;
    const balanceDuePaise = Math.max(0, totalBudgetPaise - netPaidPaise);

    const advancePaid = payments.some(p => p.payment_type === 'advance' && p.status === 'paid');

    res.json({
      event_id:       Number(eventId),
      total_budget:   Number(event.budget_estimate || 0),
      paid:           paidPaise / 100,
      refunded:       refundedPaise / 100,
      net_paid:       netPaidPaise / 100,
      balance_due:    balanceDuePaise / 100,
      advance_paid:   advancePaid,
      // Balance is only actually collectible once the event is marked
      // completed (see assertPaymentEligible) — surface that here too so
      // any UI reading this summary directly stays consistent with
      // MyEvents.jsx's needsBalance gating.
      can_pay_balance: advancePaid && balanceDuePaise > 0 && event.status === 'completed',
      payments,
      addons: addonsRes.rows,
      pending_addons_total: addonsRes.rows.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.amount), 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments/history?email= ────────────────────────────────────
router.get('/history', clientAuth, async (req, res) => {
  try {
    const email = req.clientEmail; // req.query.email ignore — apna hi data milega
    const result = await pool.query(
      `SELECT p.*, e.event_type, e.event_date, e.event_name, e.client_name,
              e.client_email AS email, e.status AS booking_status
       FROM payments p
       JOIN event_requests e ON p.booking_id = e.id
       WHERE e.client_email = $1
       ORDER BY p.created_at DESC`,
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// VENDOR SECURITY DEPOSIT ROUTES
// ══════════════════════════════════════════════════════════════════════════

router.get('/deposit/:vendorId', vendorOrAdminAuth, async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    if (!ownsVendor(req, vendorId)) return res.status(403).json({ error: 'Forbidden' });
    const deposit = await ensureVendorDepositRow(vendorId);

    const ledgerRes = await pool.query(
      `SELECT * FROM vendor_deposit_ledger WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [vendorId]
    );

    const now = new Date();
    const inTrial = deposit.status === 'trial' && now < new Date(deposit.trial_ends_at);
    const daysLeftInTrial = inTrial
      ? Math.ceil((new Date(deposit.trial_ends_at) - now) / 86400000)
      : 0;

    res.json({
      vendor_id: Number(vendorId),
      balance: Number(deposit.balance_paise) / 100,
      target: Number(deposit.target_paise) / 100,
      status: deposit.status,
      in_trial: inTrial,
      trial_ends_at: deposit.trial_ends_at,
      days_left_in_trial: daysLeftInTrial,
      needs_topup: !inTrial && deposit.status !== 'exited' && Number(deposit.balance_paise) < Number(deposit.target_paise),
      ledger: ledgerRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit/:vendorId/topup/create-order', vendorOrAdminAuth, async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    if (!ownsVendor(req, vendorId)) return res.status(403).json({ error: 'Forbidden' });
    const deposit = await ensureVendorDepositRow(vendorId);

    if (deposit.status === 'exited') {
      return res.status(400).json({ error: 'This vendor has exited the deposit program' });
    }

    const now = new Date();
    if (deposit.status === 'trial' && now < new Date(deposit.trial_ends_at)) {
      return res.status(400).json({ error: 'No deposit is required during your free trial period' });
    }

    let { amount } = req.body;
    amount = Number(amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'A valid top-up amount is required' });

    const maxTopupPaise = Number(deposit.target_paise) - Number(deposit.balance_paise);
    if (maxTopupPaise <= 0) {
      return res.status(400).json({ error: 'Deposit is already at or above the target amount' });
    }
    const amountPaise = Math.min(Math.round(amount * 100), maxTopupPaise);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `deposit_topup_${vendorId}_${Date.now()}`,
      notes: { vendor_id: String(vendorId), purpose: 'security_deposit_topup' },
    });

    res.json({ success: true, order_id: order.id, amount: amountPaise, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Deposit topup order error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit/:vendorId/topup/verify', vendorOrAdminAuth, async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    if (!ownsVendor(req, vendorId)) return res.status(403).json({ error: 'Forbidden' });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (String(order.notes?.vendor_id) !== String(vendorId) || order.notes?.purpose !== 'security_deposit_topup') {
      return res.status(400).json({ error: 'Order does not belong to this vendor deposit' });
    }
    const amountPaise = Number(order.amount);

    const deposit = await ensureVendorDepositRow(vendorId);
    const newBalance = Number(deposit.balance_paise) + amountPaise;
    const newStatus = deposit.status === 'depleted' && newBalance > 0 ? 'active' : deposit.status;

    await pool.query(
      `UPDATE vendor_deposits SET balance_paise = $1, status = $2, deposit_active = true, updated_at = NOW() WHERE vendor_id = $3`,
      [newBalance, newStatus === 'trial' ? 'active' : newStatus, vendorId]
    );

    await logDepositEvent(vendorId, 'topup', amountPaise, newBalance, {
      razorpayPaymentId: razorpay_payment_id,
      notes: 'Vendor topped up security deposit',
      createdBy: 'vendor',
    });

    res.json({ success: true, new_balance: newBalance / 100 });
  } catch (err) {
    console.error('Deposit topup verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit/:vendorId/initial', adminAuth, async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const { amount_paise, admin_id } = req.body;
    const deposit = await ensureVendorDepositRow(vendorId);

    const amt = Number(amount_paise) || DEPOSIT_TARGET_PAISE;
    const newBalance = Number(deposit.balance_paise) + amt;

    await pool.query(
      `UPDATE vendor_deposits SET balance_paise = $1, status = 'active', deposit_active = true, updated_at = NOW() WHERE vendor_id = $2`,
      [newBalance, vendorId]
    );

    await logDepositEvent(vendorId, 'initial_deposit', amt, newBalance, {
      notes: 'Initial security deposit collected after trial period ended',
      createdBy: admin_id ? `admin_${admin_id}` : 'system',
    });

    res.json({ success: true, new_balance: newBalance / 100 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit/settle-month', adminAuth, async (req, res) => {
  try {
    let { month, admin_id } = req.body;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const vendorsRes = await pool.query(
      `SELECT vendor_id FROM vendor_deposits WHERE status IN ('active', 'depleted')`
    );

    const results = [];
    for (const row of vendorsRes.rows) {
      const outcome = await settleVendorMonth(row.vendor_id, month);
      results.push({ vendor_id: row.vendor_id, ...outcome });
    }

    res.json({ success: true, month, settled_by: admin_id || 'system', results });
  } catch (err) {
    console.error('Monthly settlement error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit/:vendorId/settle-month', adminAuth, async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    let { month } = req.body;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const outcome = await settleVendorMonth(vendorId, month);
    res.json({ success: true, vendor_id: Number(vendorId), month, ...outcome });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/deposit/:vendorId/exit-refund', adminAuth, async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const { admin_id, notes } = req.body;
    const deposit = await ensureVendorDepositRow(vendorId);

    const refundAmount = Number(deposit.balance_paise);
    if (refundAmount <= 0) {
      await pool.query(`UPDATE vendor_deposits SET status = 'exited', updated_at = NOW() WHERE vendor_id = $1`, [vendorId]);
      return res.json({ success: true, refund_amount: 0, message: 'No balance to refund — deposit marked exited.' });
    }

    await pool.query(
      `UPDATE vendor_deposits SET balance_paise = 0, status = 'exited', updated_at = NOW() WHERE vendor_id = $1`,
      [vendorId]
    );

    await logDepositEvent(vendorId, 'refund', -refundAmount, 0, {
      notes: notes || 'Full deposit refunded — vendor exited the platform',
      createdBy: admin_id ? `admin_${admin_id}` : 'admin',
    });

    res.json({ success: true, refund_amount: refundAmount / 100, message: 'Deposit fully refunded. Settle actual bank transfer/payout outside the app.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deposit/admin/all', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT vd.*, v.name AS vendor_name, v.contact AS vendor_contact
       FROM vendor_deposits vd
       JOIN vendors v ON v.id = vd.vendor_id
       ORDER BY vd.updated_at DESC`
    );

    const now = new Date();

    const rows = result.rows.map(r => {
      const trialEndsAt = new Date(r.trial_ends_at);
      const trialExpired = r.status === 'trial' && now > trialEndsAt;
      return {
        ...r,
        balance: Number(r.balance_paise) / 100,
        target: Number(r.target_paise) / 100,
        trial_expired: trialExpired,
        days_since_trial_expired: trialExpired
          ? Math.floor((now - trialEndsAt) / 86400000)
          : 0,
      };
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.logVendorStatusChange = logVendorStatusChange;