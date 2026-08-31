import { useState, useEffect } from 'react';

import { adminFetch } from '../../lib/adminApi';

const STATUS_META = {
  trial:    { label: 'Trial',    color: '#4B49AC', bg: '#eeeefa' },
  active:   { label: 'Active',   color: '#15803d', bg: '#f0fdf4' },
  depleted: { label: 'Depleted', color: '#b91c1c', bg: '#fef2f2' },
  exited:   { label: 'Exited',   color: '#6c6c9a', bg: '#f0f0f7' },
};

const TRIAL_EXPIRED_META = { label: 'Trial ended — action needed', color: '#b91c1c', bg: '#fef2f2' };

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

export default function AdminVendorDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState('');
  const [ledgerFor, setLedgerFor] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [settling, setSettling] = useState(false);
  const [refunding, setRefunding] = useState(null);
  const [settleMonth, setSettleMonth] = useState('');

  // FIXED: every call in this file was reading
  // `localStorage.getItem('adminToken')` and building its own Authorization
  // header by hand — a leftover from before this app moved to the
  // access/refresh-token split in lib/adminApi.js. AdminApp.jsx never
  // writes to that localStorage key (it only calls setAdminAccessToken(),
  // which sets an in-memory token inside adminApi.js), so this was either
  // sending no token, or a stale pre-migration token missing
  // `type: 'access'` — which server/middleware/adminAuth.js now requires
  // and rejects with 403 either way. Switched every call to adminFetch(),
  // which attaches the real, current in-memory token and transparently
  // refreshes it on 401 — same as the rest of the admin panel. Paths are
  // now relative ('/payments/...') rather than `${API}/...`, since
  // adminFetch already prepends API_URL itself for any path starting
  // with '/' — passing an already-prefixed path would double it up.
  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/payments/deposit/admin/all');
      const data = await res.json();
      setDeposits(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchDeposits(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const viewLedger = async (vendorId) => {
    setLedgerFor(vendorId);
    try {
      const res = await adminFetch(`/payments/deposit/${vendorId}`);
      const data = await res.json();
      setLedger(Array.isArray(data.ledger) ? data.ledger : []);
    } catch { setLedger([]); }
  };

  const runMonthlySettlement = async () => {
    setSettling(true);
    try {
      const res = await adminFetch('/payments/deposit/settle-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: settleMonth || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        const deducted = data.results.filter(r => r.deducted > 0).length;
        showMsg(`Settlement complete for ${data.month} — ${deducted} vendor${deducted === 1 ? '' : 's'} charged, ${data.results.length - deducted} unaffected.`);
        fetchDeposits();
      } else {
        showMsg(data.error || 'Settlement failed.');
      }
    } catch {
      showMsg('Settlement failed — check server connection.');
    }
    setSettling(false);
  };

  const exitRefund = async (vendorId, vendorName, balance) => {
    if (!window.confirm(`Refund ₹${fmt(balance)} to ${vendorName} and mark them as exited? This settles their deposit to zero — you'll still need to send the actual bank transfer outside the app.`)) return;
    setRefunding(vendorId);
    try {
      const res = await adminFetch(`/payments/deposit/${vendorId}/exit-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      showMsg(data.message || `Refunded ₹${fmt(data.refund_amount)}.`);
      fetchDeposits();
    } catch {
      showMsg('Refund failed — check server connection.');
    }
    setRefunding(null);
  };

  const collectInitial = async (vendorId, vendorName) => {
    if (!window.confirm(`Collect the initial ₹1,000 deposit for ${vendorName}? Only do this once their trial has actually ended and payment was received.`)) return;
    try {
      const res = await adminFetch(`/payments/deposit/${vendorId}/initial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) { showMsg('Initial deposit recorded.'); fetchDeposits(); }
      else showMsg(data.error || 'Failed to record deposit.');
    } catch {
      showMsg('Failed — check server connection.');
    }
  };

  // ── Trial-expired vendors always sort first, regardless of the chosen
  // filter/sort order — this is the whole point of the fix: they should be
  // impossible to miss, not something an admin has to remember to look for.
  const sorted = [...deposits].sort((a, b) => {
    if (a.trial_expired && !b.trial_expired) return -1;
    if (!a.trial_expired && b.trial_expired) return 1;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  const filtered = statusFilter === 'all'
    ? sorted
    : statusFilter === 'trial_expired'
      ? sorted.filter(d => d.trial_expired)
      : sorted.filter(d => d.status === statusFilter);

  const counts = deposits.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});
  const trialExpiredCount = deposits.filter(d => d.trial_expired).length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Vendor Deposits</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Security deposits, monthly commission floor, and refund tracking</p>
      </div>

      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#15803d' }}>
          {msg}
        </div>
      )}

      {trialExpiredCount > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>⚠️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#b91c1c' }}>
                {trialExpiredCount} vendor{trialExpiredCount === 1 ? '' : 's'} past trial — deposit not yet collected
              </div>
              <div style={{ fontSize: 12, color: '#9e8e7a', marginTop: 2 }}>
                These vendors' 2-month trial has ended but they're still marked as "Trial." Collect their deposit or they'll stay unprotected by the commission floor.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('trial_expired')}
            style={{ padding: '7px 16px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Show these vendors
          </button>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 22, marginBottom: 24, display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>Run monthly settlement</div>
          <p style={{ fontSize: 12.5, color: '#9e8e7a', lineHeight: 1.6 }}>
            Checks every active/depleted vendor's commission against the ₹1,000 monthly floor and deducts any shortfall. Safe to re-run — already-settled vendors for a given month are skipped.
          </p>
        </div>
        <div>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Month (optional)</label>
          <input
            type="month" value={settleMonth} onChange={e => setSettleMonth(e.target.value)}
            placeholder="Defaults to last month"
            style={{ padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <button
          onClick={runMonthlySettlement} disabled={settling}
          style={{ padding: '10px 22px', background: '#1a1008', color: '#ffa01e', border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, cursor: settling ? 'not-allowed' : 'pointer', opacity: settling ? 0.6 : 1 }}
        >
          {settling ? 'Running…' : 'Run settlement'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setStatusFilter('all')}
          style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${statusFilter === 'all' ? '#1a1008' : '#e8e0d5'}`, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500, background: statusFilter === 'all' ? '#1a1008' : '#fff', color: statusFilter === 'all' ? '#ffa01e' : '#5a4a36' }}
        >
          All ({deposits.length})
        </button>
        {trialExpiredCount > 0 && (
          <button
            onClick={() => setStatusFilter('trial_expired')}
            style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${statusFilter === 'trial_expired' ? '#b91c1c' : '#fecaca'}`, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600, background: statusFilter === 'trial_expired' ? '#b91c1c' : '#fef2f2', color: statusFilter === 'trial_expired' ? '#fff' : '#b91c1c' }}
          >
            ⚠️ Trial ended ({trialExpiredCount})
          </button>
        )}
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${statusFilter === key ? meta.color : '#e8e0d5'}`, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500, background: statusFilter === key ? meta.color : '#fff', color: statusFilter === key ? '#fff' : '#5a4a36' }}
          >
            {meta.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>No vendors match this filter.</p>
        </div>
      ) : (
        <div className="admin-table-wrap" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', overflow: 'hidden' }}>
          <div className="admin-table-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 1fr 1.6fr', padding: '12px 20px', background: '#f7f5f2', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e8e7a', fontWeight: 600 }}>
            <span>Vendor</span>
            <span>Status</span>
            <span>Balance</span>
            <span>Trial ends</span>
            <span>Actions</span>
          </div>
          {filtered.map(d => {
            const meta = d.trial_expired ? TRIAL_EXPIRED_META : (STATUS_META[d.status] || STATUS_META.trial);
            const pct = Math.min(100, Math.round((d.balance / d.target) * 100));
            return (
              <div
                key={d.vendor_id}
                className="admin-table-grid"
                style={{
                  display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 1fr 1.6fr', padding: '16px 20px',
                  borderTop: '1px solid #f0ede6', alignItems: 'center', gap: 8,
                  background: d.trial_expired ? '#fffbfb' : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008' }}>{d.vendor_name}</div>
                  <div style={{ fontSize: 11, color: '#9e8e7a' }}>{d.vendor_contact}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color, fontWeight: 600, width: 'fit-content', display: 'inline-block' }}>
                    {meta.label}
                  </span>
                  {d.trial_expired && (
                    <div style={{ fontSize: 10.5, color: '#b91c1c', marginTop: 4 }}>
                      {d.days_since_trial_expired} day{d.days_since_trial_expired === 1 ? '' : 's'} overdue
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1008' }}>₹{fmt(d.balance)}</div>
                  {d.status !== 'trial' && d.status !== 'exited' && (
                    <div style={{ width: 60, height: 4, borderRadius: 2, background: '#f0ede6', overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct < 40 ? '#ef4444' : pct < 100 ? '#f5a623' : '#22c55e' }} />
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: d.trial_expired ? '#b91c1c' : '#9e8e7a', fontWeight: d.trial_expired ? 600 : 400 }}>
                  {d.trial_ends_at ? new Date(d.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => viewLedger(d.vendor_id)} style={{ padding: '5px 10px', background: '#f7f5f2', border: '1px solid #e8e0d5', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: '#5a4a36' }}>
                    History
                  </button>
                  {d.status === 'trial' && (
                    <button
                      onClick={() => collectInitial(d.vendor_id, d.vendor_name)}
                      style={{
                        padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: d.trial_expired ? 700 : 400,
                        background: d.trial_expired ? '#b91c1c' : '#eeeefa',
                        border: `1px solid ${d.trial_expired ? '#b91c1c' : '#c7c6f0'}`,
                        color: d.trial_expired ? '#fff' : '#4B49AC',
                      }}
                    >
                      Collect deposit
                    </button>
                  )}
                  {d.status !== 'exited' && Number(d.balance) >= 0 && (
                    <button
                      onClick={() => exitRefund(d.vendor_id, d.vendor_name, d.balance)}
                      disabled={refunding === d.vendor_id}
                      style={{ padding: '5px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, cursor: refunding === d.vendor_id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: '#b91c1c', opacity: refunding === d.vendor_id ? 0.6 : 1 }}
                    >
                      {refunding === d.vendor_id ? 'Refunding…' : 'Exit + refund'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ledgerFor && (
        <div
          onClick={() => setLedgerFor(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,8,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1008' }}>
                {deposits.find(d => d.vendor_id === ledgerFor)?.vendor_name || 'Vendor'} — Deposit History
              </div>
              <button onClick={() => setLedgerFor(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9e8e7a' }}>✕</button>
            </div>
            {ledger.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9e8e7a' }}>No ledger entries yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {ledger.map(row => {
                  const amt = Number(row.amount_paise) / 100;
                  return (
                    <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #f0ede6' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008', textTransform: 'capitalize' }}>
                          {row.type.replace(/_/g, ' ')}{row.month ? ` · ${row.month}` : ''}
                        </div>
                        {row.notes && <div style={{ fontSize: 11.5, color: '#9e8e7a', marginTop: 3, lineHeight: 1.5 }}>{row.notes}</div>}
                        <div style={{ fontSize: 10.5, color: '#c4b090', marginTop: 4 }}>
                          {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {row.created_by}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: amt > 0 ? '#15803d' : amt < 0 ? '#b91c1c' : '#9e8e7a', flexShrink: 0 }}>
                        {amt === 0 ? '—' : `${amt > 0 ? '+' : ''}₹${fmt(Math.abs(amt))}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}