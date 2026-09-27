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
//
// NOTE: this does NOT apply to /webhook (see that route) — Razorpay's own
// IPs hitting the webhook shouldn't be throttled against this per-IP
// limiter, and the route is registered before this middleware for exactly
// that reason.
router.use((req, res, next) => {
  if (req.path === '/webhook') return next();
  return rateLimit({ max: 30 })(req, res, next);
});

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

// ── Cancellation refund policy ────────────────────────────────────────────
// Fixed business rule (confirmed by product owner):
//   - Client requests cancellation, admin approves it -> 90% refund.
//   - Admin/vendor-initiated termination (AdminEventRequests "Terminate")
//     -> 100% refund.
// Both now go through the SAME refundAllPaidPayments() helper below, so
// both refund every paid instalment (advance + balance if both landed),
// not just the most recent one.
const CLIENT_CANCELLATION_REFUND_PCT = 90;

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
  // NEW — records which webhook delivery (Razorpay's event id) last touched
  // a payment row, purely for debugging/support ("did the webhook even
  // arrive for this payment?"). Not used for the idempotency guard itself —
  // that's still the `status = 'pending'` check on the UPDATE.
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS last_webhook_event_id TEXT`).catch(() => {});
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

  // NEW — contingency-funded add-ons. An add-on no longer always bills the
  // client in full: if the event still has unspent 5% contingency buffer
  // (see getContingencyBreakdownPaise below), that gets drawn down first
  // and the client is only billed the remainder (if any).
  //   funded_by:            'contingency' | 'client' | 'mixed'
  //   contingency_covered:  rupees of THIS add-on's amount that came out
  //                         of the buffer rather than being billed
  await pool.query(`ALTER TABLE event_addons ADD COLUMN IF NOT EXISTS funded_by TEXT DEFAULT 'client'`).catch(() => {});
  await pool.query(`ALTER TABLE event_addons ADD COLUMN IF NOT EXISTS contingency_covered NUMERIC NOT NULL DEFAULT 0`).catch(() => {});
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

// ── Contingency reconciliation ────────────────────────────────────────────
async function getContingencyBreakdownPaise(eventId, budgetEstimateRupees) {
  const eventOnlyPaise = await getEventOnlyCostPaise(eventId, budgetEstimateRupees);

  const evRes = await pool.query(
    `SELECT reference_event_price FROM event_requests WHERE id = $1`,
    [eventId]
  );
  const refPricePaise = Math.round(Number(evRes.rows[0]?.reference_event_price || 0) * 100);

  const contingencyTotalPaise = Math.max(0, eventOnlyPaise - refPricePaise);

  const consumedRes = await pool.query(
    `SELECT COALESCE(SUM(contingency_covered), 0) AS total
     FROM event_addons
     WHERE event_id = $1 AND status != 'cancelled'`,
    [eventId]
  );
  const consumedPaise = Math.round(Number(consumedRes.rows[0].total) * 100);

  const remainingPaise = Math.max(0, contingencyTotalPaise - consumedPaise);

  return { contingencyTotalPaise, consumedPaise, remainingPaise, refPricePaise };
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

async function computeAdvanceSplit(eventId, totalBudgetRupees, commissionPct) {
  const { refPricePaise } = await getContingencyBreakdownPaise(eventId, totalBudgetRupees);
  const eventAdvancePaise = Math.round(refPricePaise * (EVENT_ADVANCE_PCT / 100));

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

  const adminCommission = balancePaise - vendorShareTotal;

  return { adminCommission, vendorShare: vendorShareTotal, perVendorPayouts };
}

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
// FIXED: also blocks 'cancellation_requested' — a client shouldn't be able
// to pay the balance while their own cancellation request is sitting with
// admin waiting for approve/deny.
function assertPaymentEligible(event, paymentType) {
  if (event.status === 'cancelled' || event.status === 'cancellation_requested') {
    throw { status: 400, error: 'This event is being cancelled and is not payable right now' };
  }
  if (paymentType === 'advance' && event.status !== 'payment_pending') {
    throw { status: 400, error: 'This event is not ready for the advance payment yet' };
  }
  if (paymentType === 'balance' && event.status !== 'completed') {
    throw { status: 400, error: 'Balance payment is only available once the event has been marked completed' };
  }
}

// ── finalizePaidPayment ────────────────────────────────────────────────────
// THE FIX (part 2 of the webhook fix): the commission-split / vendor-payout
// / event-status logic that used to live ONLY inside POST /verify has been
// pulled out here so that BOTH /verify (client-triggered, after Razorpay
// checkout succeeds in the browser) and POST /webhook (Razorpay-triggered,
// server-to-server, independent of the client's browser) do exactly the
// same reconciliation for a captured payment.
//
// Idempotency: the UPDATE below only succeeds `WHERE status = 'pending'`.
// Whichever of /verify or /webhook reaches this first "wins" — its UPDATE
// affects 1 row and it goes on to create vendor payouts / flip the event
// status. The other one's UPDATE affects 0 rows (`alreadyProcessed: true`)
// and does nothing further. This makes it safe for both paths to race, or
// for Razorpay to redeliver the same webhook more than once.
async function finalizePaidPayment(io, payment, event, razorpayPaymentId, webhookEventId = null) {
  const commissionPct = event.admin_commission_pct || DEFAULT_COMMISSION_PCT;
  const booking_id = payment.booking_id;

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
     SET razorpay_payment_id = $1, status = 'paid', admin_commission = $2, vendor_share = $3,
         event_id = $4, last_webhook_event_id = COALESCE($6, last_webhook_event_id)
     WHERE id = $5 AND status = 'pending'
     RETURNING id`,
    [razorpayPaymentId, adminCommission, vendorShare, booking_id, payment.id, webhookEventId]
  );
  if (markResult.rowCount !== 1) {
    // The other reconciliation path (webhook vs. client /verify) already
    // claimed this payment between our read and this write.
    return { alreadyProcessed: true };
  }

  if (payment.addon_id) {
    await pool.query(`UPDATE event_addons SET status = 'paid' WHERE id = $1`, [payment.addon_id]);
  }

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

  await emitEventUpdate(io, booking_id);
  if (payment.addon_id) {
    await emitAddonsUpdate(io, booking_id);
  }

  return { alreadyProcessed: false, adminCommission, vendorShare };
}

// ── refundAllPaidPayments ──────────────────────────────────────────────────
// THE FIX: the old /refund route only ever looked at the single most
// recently-paid `payments` row for a booking. If a client had paid BOTH
// advance and balance, terminating/cancelling the event refunded only the
// balance — the advance payment was never touched, and its vendor_payouts
// (tied to that payment_id specifically) never got cancelled either, so a
// vendor could still be paid out for a booking that was cancelled.
//
// This walks every 'paid' payment row for the event, refunds each one at
// `refundPct` (Razorpay refund for online payments, a status flip + note
// for offline ones — same distinction the old single-payment code made),
// and then cancels every still-pending vendor_payouts row for the WHOLE
// event (by event_id, not payment_id) — so no vendor slice survives a
// cancellation regardless of which instalment it came from.
//
// Used by:
//   - POST /refund              (generic admin refund/adjustment, kept for
//                                 the existing "Cost Adjustment" UI)
//   - PATCH /events/admin/:id/approve-cancellation (90% — client-requested)
//   - AdminEventRequests "Terminate" button, via POST /refund with pct=100
async function refundAllPaidPayments(io, eventId, refundPct, reason) {
  const payRes = await pool.query(
    `SELECT * FROM payments WHERE booking_id = $1 AND status = 'paid' ORDER BY created_at ASC`,
    [eventId]
  );

  const results = [];
  let anyRefunded = false;

  for (const payment of payRes.rows) {
    const refundAmt = Math.round((Number(payment.amount) * refundPct) / 100);
    if (refundAmt <= 0) continue;

    if (!payment.razorpay_payment_id) {
      // Offline payment — no Razorpay charge to reverse. Flip status and
      // leave a note; admin settles the actual money movement outside the
      // app, same as the original single-payment offline-refund path did.
      await pool.query(
        `UPDATE payments SET status = 'refunded', refund_amount = $1, notes = $2 WHERE id = $3`,
        [refundAmt, reason || 'Refund (offline payment)', payment.id]
      );
      results.push({ payment_id: payment.id, payment_type: payment.payment_type, refund_amount: refundAmt, online: false });
      anyRefunded = true;
      continue;
    }

    try {
      const refund = await razorpay.payments.refund(payment.razorpay_payment_id, {
        amount: refundAmt,
        notes: { event_id: String(eventId), reason: reason || 'Refund' },
      });
      await pool.query(
        `UPDATE payments SET status = 'refunded', refund_id = $1, refund_amount = $2, notes = $3 WHERE id = $4`,
        [refund.id, refundAmt, reason || null, payment.id]
      );
      results.push({ payment_id: payment.id, payment_type: payment.payment_type, refund_amount: refundAmt, online: true, refund_id: refund.id });
      anyRefunded = true;
    } catch (err) {
      console.error(`refundAllPaidPayments: refund failed for payment ${payment.id}:`, err.message);
      results.push({ payment_id: payment.id, error: err.message });
    }
  }

  if (anyRefunded) {
    await pool.query(
      `UPDATE event_requests SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1`,
      [eventId]
    ).catch(() => {});

    // FIXED: scoped to event_id, not a single payment_id — every pending
    // payout for this event is clawed back, whichever instalment it came
    // from.
    await pool.query(
      `UPDATE vendor_payouts SET status = 'cancelled' WHERE event_id = $1 AND status = 'pending'`,
      [eventId]
    ).catch(() => {});

    await emitEventUpdate(io, eventId);
  }

  return results;
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
      // FIXED: was `totalBudgetPaise - alreadyPaidPaise - refundedPaise`,
      // which ignored unused contingency the way GET /summary already
      // waives it (billableTotalPaise). That meant the number a client
      // saw on their summary screen (balance_due, contingency-waived)
      // could be LOWER than what this route would actually charge them —
      // same waiver logic now applied here so the two never disagree.
      const contingencyBreakdown = await getContingencyBreakdownPaise(booking_id, event.budget_estimate);
      const billableTotalPaise = Math.max(0, totalBudgetPaise - contingencyBreakdown.remainingPaise);
      amount = billableTotalPaise - alreadyPaidPaise - refundedPaise;
      if (amount <= 0) {
        return res.status(400).json({ error: 'No balance due for this event' });
      }
    } else if (payment_type === 'addon') {
      if (!addon_id) return res.status(400).json({ error: 'addon_id is required for addon payments' });
      const addonRes = await pool.query(`SELECT * FROM event_addons WHERE id = $1 AND event_id = $2`, [addon_id, booking_id]);
      const addon = addonRes.rows[0];
      if (!addon) return res.status(404).json({ error: 'Add-on not found' });
      if (addon.status !== 'pending') return res.status(400).json({ error: 'This add-on is not payable' });
      const billablePaise = Math.round((Number(addon.amount) - Number(addon.contingency_covered || 0)) * 100);
      if (billablePaise <= 0) {
        return res.status(400).json({ error: 'This add-on is fully covered by contingency — nothing to pay' });
      }
      amount = billablePaise;
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
// Client-triggered confirmation, called from the browser right after the
// Razorpay checkout succeeds. See POST /webhook below for the
// server-to-server path that reconciles a payment even if this call never
// arrives (closed tab, dropped network, etc).
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
    if (payment.booking_id !== Number(booking_id)) {
      return res.status(400).json({ error: 'Payment does not belong to this event' });
    }

    // FIXED (webhook coexistence): previously this route hard-required
    // status === 'pending' and returned a 400 otherwise. Now that the
    // webhook can finalize a payment before the client's /verify call
    // lands (slow network, backgrounded tab, etc), a payment that's
    // already 'paid' by the time /verify runs is a SUCCESS, not an error —
    // the client should still see a normal success response.
    if (payment.status === 'paid') {
      return res.json({ success: true, already_processed: true, payment_type: payment.payment_type });
    }
    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment is not pending for this event' });
    }

    const result = await finalizePaidPayment(req.app.get('io'), payment, event, razorpay_payment_id);

    if (result.alreadyProcessed) {
      // Lost the race to the webhook between our read above and the
      // UPDATE inside finalizePaidPayment — still a success for the client.
      return res.json({ success: true, already_processed: true, payment_type: payment.payment_type });
    }

    res.json({ success: true, adminCommission: result.adminCommission, vendorShare: result.vendorShare, payment_type: payment.payment_type });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/webhook ───────────────────────────────────────────
// THE FIX for issue #4: Razorpay calls this directly, server-to-server,
// whenever a payment is captured — independent of whether the client's
// browser ever calls /verify above. Before this route existed, a client
// closing the tab or losing network right after paying (but before /verify
// fired) meant: money captured by Razorpay, but the `payments` row stuck
// at 'pending' forever, the event never moved to 'confirmed', and vendor
// payouts never created. This route is the reconciliation fallback.
//
// SETUP REQUIRED (outside this file):
//   1. Razorpay Dashboard -> Settings -> Webhooks -> add an endpoint
//      pointing at https://<your-domain>/api/payments/webhook, subscribed
//      to at least the `payment.captured` event. Copy the "Webhook Secret"
//      it generates.
//   2. Set that value as RAZORPAY_WEBHOOK_SECRET in your env — this is a
//      DIFFERENT secret from RAZORPAY_KEY_SECRET used above in /verify.
//   3. This route needs the RAW request bytes to verify Razorpay's
//      signature (HMAC-SHA256 over the raw body, not the parsed JSON). If
//      server.js applies `express.json()` globally before this router is
//      mounted, the body will already be parsed/consumed and the
//      signature check below will always fail. In server.js, do:
//
//        app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
//        app.use(express.json());              // for every other route
//        app.use('/api/payments', paymentsRouter);
//
//      i.e. give this one path the raw-body parser BEFORE the global JSON
//      parser is applied, so req.body here is a Buffer.
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body;

    if (!signature || !Buffer.isBuffer(rawBody)) {
      console.error('Webhook: missing signature header or body is not raw — check express.raw() is mounted for this path before express.json()');
      return res.status(400).json({ error: 'Invalid webhook request' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook: signature mismatch');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventType = payload.event;
    const webhookEventId = payload.account_id && payload.created_at
      ? `${eventType}:${payload.payload?.payment?.entity?.id}:${payload.created_at}`
      : null;

    // Only payment.captured actually needs action here. Acknowledge
    // everything else with 200 so Razorpay doesn't keep retrying deliveries
    // we don't care about.
    if (eventType !== 'payment.captured') {
      return res.json({ received: true, ignored: eventType });
    }

    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity || !paymentEntity.order_id) {
      console.error('Webhook: payment.captured payload missing order_id', payload);
      return res.json({ received: true, ignored: 'malformed payload' });
    }

    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    const paymentRes = await pool.query(
      `SELECT * FROM payments WHERE razorpay_order_id = $1`,
      [razorpayOrderId]
    );
    const payment = paymentRes.rows[0];
    if (!payment) {
      // Shouldn't normally happen (we create the row before Razorpay ever
      // sees the order), but ack anyway — retrying won't make the row
      // appear.
      console.error(`Webhook: no payments row found for order ${razorpayOrderId}`);
      return res.json({ received: true, ignored: 'no matching payment row' });
    }

    // Idempotent no-op if /verify (or a previous webhook delivery for the
    // same event) already finalized this payment.
    if (payment.status !== 'pending') {
      return res.json({ received: true, already_processed: true });
    }

    const eventRes = await pool.query('SELECT * FROM event_requests WHERE id = $1', [payment.booking_id]);
    const event = eventRes.rows[0];
    if (!event) {
      console.error(`Webhook: no event_requests row for booking ${payment.booking_id}`);
      return res.json({ received: true, ignored: 'no matching event' });
    }

    const result = await finalizePaidPayment(req.app.get('io'), payment, event, razorpayPaymentId, webhookEventId);

    res.json({ received: true, processed: !result.alreadyProcessed });
  } catch (err) {
    console.error('Webhook error:', err);
    // A 500 here (rather than 200) is intentional — it makes Razorpay
    // retry with backoff instead of us silently swallowing a real bug.
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/refund ───────────────────────────────────────────
// Generic admin-triggered refund. Now a thin wrapper around
// refundAllPaidPayments() — refunds EVERY paid instalment for the booking
// at `refund_pct`, not just the latest one. Used by:
//   - AdminEventRequests "Terminate" button (refund_pct: 100)
//   - AdminEventRequests "Cost Adjustment" prompt (refund_pct: whatever
//     admin types — a genuine miscalculation-style partial refund taken
//     as a % of what's been paid)
router.post('/refund', adminAuth, async (req, res) => {
  try {
    const { booking_id, refund_pct, reason } = req.body;
    if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

    const results = await refundAllPaidPayments(
      req.app.get('io'),
      booking_id,
      Number(refund_pct) || 100,
      reason || 'Refund issued by admin'
    );

    if (results.length === 0) {
      return res.json({ success: true, message: 'No payment to refund', results: [] });
    }

    const totalRefundAmount = results.reduce((s, r) => s + (r.refund_amount || 0), 0);
    const anyFailed = results.some(r => r.error);

    res.json({
      success: !anyFailed,
      results,
      total_refund_amount: totalRefundAmount,
      note: anyFailed ? 'One or more instalments failed to refund automatically — check server logs and settle manually if needed.' : undefined,
    });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/manual-adjustment ─────────────────────────────────
// Billing-correction flow: the ORIGINAL bill shown to the client was
// wrong (not a cancellation) — admin enters the exact ₹ amount owed back
// and this records it as a refund-in-progress against the booking.
//
// Deliberately does NOT try to call Razorpay automatically here, because
// an arbitrary correction amount doesn't necessarily map cleanly onto one
// specific captured payment's ID/amount — same reasoning the existing
// offline-refund path already uses elsewhere in this file. Admin settles
// the actual transfer outside the app; this row is the paper trail plus
// the "you'll be refunded shortly" notice.
//
// TEMP: there's no dedicated client-notification channel wired yet, so
// the notice just lives in this payment row's `notes` field, which
// GET /summary already returns to the client's own event view. Swap this
// out for a real notification (email/push/in-app) later without changing
// the route's contract.
router.post('/manual-adjustment', adminAuth, async (req, res) => {
  try {
    const { booking_id, amount, note } = req.body;
    const amt = Number(amount);
    if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });
    if (!amt || amt <= 0) return res.status(400).json({ error: 'A valid amount is required' });

    const evRes = await pool.query('SELECT id FROM event_requests WHERE id = $1', [booking_id]);
    if (evRes.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

    const amountPaise = Math.round(amt * 100);
    const noticeText = `Refund of ₹${amt.toLocaleString('en-IN')} will be processed shortly — billing correction.${note ? ' ' + note : ''}`;

    const result = await pool.query(
      `INSERT INTO payments
         (booking_id, event_id, amount, status, payment_type, payment_method, refund_amount, notes)
       VALUES ($1, $1, $2, 'refunded', 'manual_adjustment', 'manual', $2, $3)
       RETURNING *`,
      [booking_id, amountPaise, noticeText]
    );

    await emitEventUpdate(req.app.get('io'), booking_id);

    res.json({ success: true, payment: result.rows[0], notice: noticeText });
  } catch (err) {
    console.error('Manual adjustment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments/contingency/:eventId ────────────────────────────────
router.get('/contingency/:eventId', adminAuth, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const evRes = await pool.query(
      `SELECT id, budget_estimate, status, payment_status FROM event_requests WHERE id = $1`,
      [eventId]
    );
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const breakdown = await getContingencyBreakdownPaise(eventId, event.budget_estimate);

    const addonsRes = await pool.query(
      `SELECT id, label, amount, funded_by, contingency_covered, status
       FROM event_addons WHERE event_id = $1 AND status != 'cancelled' AND contingency_covered > 0
       ORDER BY created_at ASC`,
      [eventId]
    );

    res.json({
      event_id: Number(eventId),
      contingency_total: breakdown.contingencyTotalPaise / 100,
      contingency_consumed: breakdown.consumedPaise / 100,
      contingency_remaining: breakdown.remainingPaise / 100,
      refund_ready: event.payment_status === 'fully_paid',
      funded_addons: addonsRes.rows,
    });
  } catch (err) {
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

    const evRes = await pool.query('SELECT budget_estimate FROM event_requests WHERE id = $1', [event_id]);
    if (evRes.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

    const { remainingPaise } = await getContingencyBreakdownPaise(event_id, evRes.rows[0].budget_estimate);
    const amountPaise = Math.round(Number(amount) * 100);
    const contingencyCoveredPaise = Math.min(remainingPaise, amountPaise);
    const billablePaise = amountPaise - contingencyCoveredPaise;

    const funded_by = contingencyCoveredPaise <= 0
      ? 'client'
      : billablePaise <= 0
        ? 'contingency'
        : 'mixed';

    const initialStatus = billablePaise <= 0 ? 'paid' : 'pending';

    const result = await pool.query(
      `INSERT INTO event_addons (event_id, label, amount, notes, funded_by, contingency_covered, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        event_id, label, amount, notes || null,
        funded_by,
        contingencyCoveredPaise / 100,
        initialStatus,
      ]
    );

    await emitAddonsUpdate(req.app.get('io'), event_id);

    res.json({ success: true, addon: result.rows[0], billable_amount: billablePaise / 100 });
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
    const { booking_id, payment_type = 'advance', addon_id, payment_method = 'cash', notes, admin_id } = req.body;

    const evRes = await pool.query('SELECT * FROM event_requests WHERE id = $1', [booking_id]);
    const event = evRes.rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });

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
      // Same contingency-waiver fix as /create-order above.
      const contingencyBreakdown = await getContingencyBreakdownPaise(booking_id, event.budget_estimate);
      const billableTotalPaise = Math.max(0, totalBudgetPaise - contingencyBreakdown.remainingPaise);
      amountPaise = billableTotalPaise - alreadyPaidPaise - refundedPaise;
      if (amountPaise <= 0) return res.status(400).json({ error: 'No balance due for this event' });
    } else if (payment_type === 'addon') {
      if (!addon_id) return res.status(400).json({ error: 'addon_id is required' });
      const addonRes = await pool.query(`SELECT * FROM event_addons WHERE id = $1 AND event_id = $2`, [addon_id, booking_id]);
      addonRow = addonRes.rows[0];
      if (!addonRow || addonRow.status !== 'pending') {
        return res.status(400).json({ error: 'Add-on not found or already settled' });
      }
      amountPaise = Math.round((Number(addonRow.amount) - Number(addonRow.contingency_covered || 0)) * 100);
      if (amountPaise <= 0) {
        return res.status(400).json({ error: 'This add-on is fully covered by contingency — nothing to record' });
      }
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

    const contingencyBreakdown = await getContingencyBreakdownPaise(eventId, event.budget_estimate);
    const referenceAdvancePaise = split.eventAdvancePaise;
    const contingencyAdvancePaise = 0;

    res.json({
      event_id: Number(eventId),
      event_advance_pct: EVENT_ADVANCE_PCT,
      event_only_advance_amount: split.eventAdvancePaise / 100,
      reference_event_price: contingencyBreakdown.refPricePaise / 100,
      reference_event_advance_amount: referenceAdvancePaise / 100,
      contingency_amount: contingencyBreakdown.contingencyTotalPaise / 100,
      contingency_advance_amount: contingencyAdvancePaise / 100,
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

    const contingencyBreakdown = await getContingencyBreakdownPaise(eventId, event.budget_estimate);
    const billableTotalPaise = Math.max(0, totalBudgetPaise - contingencyBreakdown.remainingPaise);

    const paidPaise     = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);
    const refundedPaise = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + Number(p.refund_amount || 0), 0);
    const netPaidPaise  = paidPaise - refundedPaise;
    const balanceDuePaise = Math.max(0, billableTotalPaise - netPaidPaise);

    const advancePaid = payments.some(p => p.payment_type === 'advance' && p.status === 'paid');

    // Surface any not-yet-executed billing-correction notice (manual
    // adjustment rows) explicitly, so the client's UI can show it as a
    // banner rather than digging through the payments list. TEMP per the
    // note on POST /manual-adjustment above.
    const pendingRefundNotices = payments
      .filter(p => p.payment_type === 'manual_adjustment')
      .map(p => ({ amount: Number(p.refund_amount || p.amount) / 100, note: p.notes, created_at: p.created_at }));

    res.json({
      event_id:       Number(eventId),
      total_budget:   Number(event.budget_estimate || 0),
      billable_total: billableTotalPaise / 100,
      contingency: {
        total:    contingencyBreakdown.contingencyTotalPaise / 100,
        consumed: contingencyBreakdown.consumedPaise / 100,
        waived:   contingencyBreakdown.remainingPaise / 100,
        used_by_addons: contingencyBreakdown.consumedPaise > 0,
      },
      paid:           paidPaise / 100,
      refunded:       refundedPaise / 100,
      net_paid:       netPaidPaise / 100,
      balance_due:    balanceDuePaise / 100,
      advance_paid:   advancePaid,
      can_pay_balance: advancePaid && balanceDuePaise > 0 && event.status === 'completed',
      pending_refund_notices: pendingRefundNotices,
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
    const email = req.clientEmail;
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
module.exports.refundAllPaidPayments = refundAllPaidPayments;
module.exports.CLIENT_CANCELLATION_REFUND_PCT = CLIENT_CANCELLATION_REFUND_PCT;