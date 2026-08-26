import { useState, useEffect, useMemo } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('adminToken');

/* ── Palette — clean minimal, neutral with a single accent ───────────── */
const C = {
  bg:      '#fafafa',
  surface: '#ffffff',
  border:  '#e5e7eb',
  borderStrong: '#d1d5db',
  text:    '#111827',
  subtext: '#6b7280',
  faint:   '#9ca3af',
  accent:  '#4f46e5',
  accentSoft: '#eef2ff',
  green:   '#16a34a',
  greenSoft: '#f0fdf4',
  amber:   '#b45309',
  amberSoft: '#fffbeb',
  red:     '#dc2626',
  redSoft: '#fef2f2',
};

const STATUS_META = {
  pending:   { label: 'Pending',   color: C.amber, bg: C.amberSoft },
  paid:      { label: 'Paid',      color: C.green, bg: C.greenSoft },
  cancelled: { label: 'Cancelled', color: C.red,   bg: C.redSoft },
};

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function rupees(paise) { return fmt(Number(paise || 0) / 100); }

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/* ── Stat block — plain number, no card chrome ────────────────────────── */
function Stat({ label, value, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 12, color: C.subtext, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: accent || C.text, letterSpacing: '-0.02em' }}>
        ₹{value}
      </div>
    </div>
  );
}

/* ── Per-vendor summary row ───────────────────────────────────────────── */
function VendorSummaryRow({ v, isLast }) {
  return (
    <div className="admin-table-grid" style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
      alignItems: 'center',
      gap: 12,
      padding: '14px 20px',
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: C.accentSoft, color: C.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
        }}>
          {initials(v.vendor_name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {v.vendor_name}
          </div>
          <div style={{ fontSize: 11.5, color: C.faint }}>
            {v.payout_count} booking{v.payout_count === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.accent }}>₹{rupees(v.commission_total)}</div>
      <div style={{ fontSize: 13.5, color: C.text }}>₹{rupees(v.vendor_share_total)}</div>
      <div style={{ fontSize: 13.5, color: v.pending > 0 ? C.amber : C.faint }}>₹{rupees(v.pending)}</div>
      <div style={{ fontSize: 13.5, color: v.paid > 0 ? C.green : C.faint }}>₹{rupees(v.paid)}</div>
    </div>
  );
}

export default function AdminVendorPayouts() {
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);

  const [payouts, setPayouts] = useState([]);
  const [allPayouts, setAllPayouts] = useState([]); // unfiltered by status — for the vendor summary table
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const [commissionSummary, setCommissionSummary] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(true);

  // Month list always includes the current month even if it has no data yet.
  const monthOptions = useMemo(() => {
    const set = new Set(months);
    set.add(currentMonthStr());
    return Array.from(set).sort().reverse();
  }, [months]);

  const fetchMonths = async () => {
    try {
      const res = await fetch(`${API}/vendor-payouts/admin/available-months`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setMonths(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`${API}/vendor-payouts/admin?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setPayouts(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  // Independent of the status filter above, so the per-vendor pending/paid
  // totals in the summary table always reflect the whole selected month.
  const fetchAllPayouts = async () => {
    try {
      const res = await fetch(`${API}/vendor-payouts/admin?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setAllPayouts(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  };

  const fetchCommissionSummary = async () => {
    setCommissionLoading(true);
    try {
      const res = await fetch(`${API}/vendor-payouts/admin/commission-summary?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setCommissionSummary(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setCommissionLoading(false);
  };

  useEffect(() => { fetchMonths(); }, []);
  useEffect(() => { fetchPayouts(); }, [filter, selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAllPayouts(); fetchCommissionSummary(); }, [selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const markPaid = async (id) => {
    const note = window.prompt('Reference note (e.g. UPI transaction ID / cheque number):') || '';
    try {
      const res = await fetch(`${API}/vendor-payouts/${id}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ reference_note: note }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Marked as paid.');
        fetchPayouts();
        fetchAllPayouts();
        fetchMonths();
      } else {
        showMsg(data.error || 'Could not update.');
      }
    } catch {
      showMsg('Could not connect to server.');
    }
  };

  const pendingPaidByVendor = {};
  allPayouts.forEach(p => {
    const key = p.vendor_name || `Vendor #${p.vendor_id}`;
    if (!pendingPaidByVendor[key]) pendingPaidByVendor[key] = { pending: 0, paid: 0 };
    pendingPaidByVendor[key][p.status === 'paid' ? 'paid' : 'pending'] += Number(p.amount);
  });

  const vendorSummary = commissionSummary
    .map(c => ({
      ...c,
      pending: pendingPaidByVendor[c.vendor_name]?.pending || 0,
      paid: pendingPaidByVendor[c.vendor_name]?.paid || 0,
    }))
    .sort((a, b) => b.commission_total - a.commission_total);

  const totalCommission = commissionSummary.reduce((s, c) => s + c.commission_total, 0);
  const totalPending = Object.values(pendingPaidByVendor).reduce((s, v) => s + v.pending, 0);
  const totalPaid = Object.values(pendingPaidByVendor).reduce((s, v) => s + v.paid, 0);

  const isCurrentMonth = selectedMonth === currentMonthStr();

  const visiblePayouts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payouts;
    return payouts.filter(p =>
      (p.vendor_name || '').toLowerCase().includes(q) ||
      (p.event_name || '').toLowerCase().includes(q)
    );
  }, [payouts, search]);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: C.text }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="admin-flex-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Vendor Payouts</h2>
          <p style={{ fontSize: 13, color: C.subtext }}>What Celeste owes each vendor, and what's already been paid out</p>
        </div>

        {/* Month switcher */}
        <div className="admin-month-switcher" style={{ position: 'relative' }}>
          <button
            onClick={() => setMonthMenuOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.borderStrong}`,
              background: C.surface, fontSize: 13, fontWeight: 500, color: C.text,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {formatMonthLabel(selectedMonth)}
            {isCurrentMonth && (
              <span style={{ fontSize: 10, fontWeight: 600, color: C.accent, background: C.accentSoft, padding: '2px 6px', borderRadius: 5 }}>
                CURRENT
              </span>
            )}
            <span style={{ color: C.faint, fontSize: 10 }}>▾</span>
          </button>

          {monthMenuOpen && (
            <>
              <div onClick={() => setMonthMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div className="admin-month-dropdown" style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 20,
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)', minWidth: 200, maxHeight: 280, overflowY: 'auto', padding: 6,
              }}>
                {monthOptions.map(m => (
                  <div
                    key={m}
                    onClick={() => { setSelectedMonth(m); setMonthMenuOpen(false); }}
                    style={{
                      padding: '8px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                      background: m === selectedMonth ? C.accentSoft : 'transparent',
                      color: m === selectedMonth ? C.accent : C.text,
                      fontWeight: m === selectedMonth ? 600 : 400,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    {formatMonthLabel(m)}
                    {m === currentMonthStr() && <span style={{ fontSize: 9.5, color: C.faint }}>current</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ background: C.greenSoft, border: `1px solid #bbf7d0`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: C.green }}>
          {msg}
        </div>
      )}

      {!isCurrentMonth && (
        <div style={{ background: '#f9fafb', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12.5, color: C.subtext }}>
          Viewing a past month — figures below are frozen to what happened in {formatMonthLabel(selectedMonth)}.
        </div>
      )}

      {/* ── Stat strip ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 32, flexWrap: 'wrap',
        padding: '20px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, marginBottom: 32,
      }}>
        <Stat label="Commission earned" value={rupees(totalCommission)} accent={C.accent} />
        <Stat label="Pending payouts" value={rupees(totalPending)} accent={C.amber} />
        <Stat label="Paid out" value={rupees(totalPaid)} accent={C.green} />
      </div>

      {/* ── Per-vendor summary ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>Per-vendor summary</h3>
        <div className="admin-table-wrap" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div className="admin-table-grid" style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            padding: '10px 20px', background: C.bg,
            fontSize: 11, color: C.subtext, fontWeight: 500,
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span>Vendor</span><span>Commission</span><span>Vendor's share</span><span>Pending</span><span>Paid</span>
          </div>
          {commissionLoading ? (
            <div style={{ padding: 24, fontSize: 13, color: C.faint }}>Loading…</div>
          ) : vendorSummary.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: C.faint }}>
              No commission in {formatMonthLabel(selectedMonth)} yet.
            </div>
          ) : (
            vendorSummary.map((v, i) => <VendorSummaryRow key={v.vendor_id ?? v.vendor_name} v={v} isLast={i === vendorSummary.length - 1} />)
          )}
        </div>
      </div>

      {/* ── Filter pills ────────────────────────────────────────────────── */}
      <div className="admin-flex-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>Payouts</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="admin-search-wrap" style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12.5, color: C.faint, pointerEvents: 'none' }}>
              ⌕
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vendor…"
              style={{
                padding: '7px 12px 7px 26px', borderRadius: 8, border: `1px solid ${C.borderStrong}`,
                background: C.surface, fontSize: 12.5, color: C.text, fontFamily: 'inherit',
                outline: 'none', width: 170,
              }}
            />
            {search && (
              <span
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: C.faint, cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, background: C.bg, padding: 3, borderRadius: 8, border: `1px solid ${C.border}` }}>
            {[['pending', 'Pending'], ['paid', 'Paid'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                  background: filter === v ? C.surface : 'transparent',
                  color: filter === v ? C.text : C.subtext,
                  boxShadow: filter === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Payout list ─────────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ color: C.faint, fontSize: 13 }}>Loading…</p>
      ) : visiblePayouts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.faint, fontSize: 13 }}>
            {search
              ? `No payouts matching "${search}" in ${formatMonthLabel(selectedMonth)}.`
              : `No ${filter !== 'all' ? filter : ''} payouts in ${formatMonthLabel(selectedMonth)}.`}
          </p>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {visiblePayouts.map((p, i) => {
            const meta = STATUS_META[p.status] || STATUS_META.pending;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '16px 20px',
                  borderBottom: i === visiblePayouts.length - 1 ? 'none' : `1px solid ${C.border}`,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: C.bg, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11.5, fontWeight: 600, color: C.subtext,
                  }}>
                    {initials(p.vendor_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>
                      {p.vendor_name || `Vendor #${p.vendor_id}`}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.faint, marginTop: 1 }}>
                      {p.event_name} · {p.event_type} · {p.event_date ? new Date(p.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                    {p.reference_note && (
                      <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>Ref: {p.reference_note}</div>
                    )}
                    {Number(p.commission_amount) > 0 && (
                      <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                        Commission from this booking: ₹{rupees(p.commission_amount)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, minWidth: 90, textAlign: 'right' }}>
                    ₹{rupees(p.amount)}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 500,
                    background: meta.bg, color: meta.color,
                    minWidth: 74, textAlign: 'center',
                  }}>
                    {meta.label}
                  </span>
                  {p.status === 'pending' && (
                    <button
                      onClick={() => markPaid(p.id)}
                      style={{ padding: '7px 14px', background: C.text, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}