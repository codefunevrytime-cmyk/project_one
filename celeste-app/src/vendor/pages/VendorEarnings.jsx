import { useState, useEffect } from 'react';

import { API_URL } from '../../config/api';
import { vendorFetch } from '../../lib/vendorApi';

const API = API_URL;

const S = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 28 },
  statCard: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '20px 22px' },
  card: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '22px 24px', marginBottom: 24 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#c8d8f8', marginBottom: 4, letterSpacing: '0.02em' },
};

const STATUS_META = {
  paid:      { label: 'Paid',      color: '#5fcf7a', bg: 'rgba(95,207,122,0.12)',  border: 'rgba(95,207,122,0.3)' },
  pending:   { label: 'Pending',   color: '#d4a843', bg: 'rgba(212,168,67,0.12)',  border: 'rgba(212,168,67,0.3)' },
  cancelled: { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
};

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function rupees(paise) { return fmt(Number(paise || 0) / 100); }

/* ── One payout row ───────────────────────────────────────────────────── */
function PayoutRow({ p, isLast }) {
  const meta = STATUS_META[p.status] || STATUS_META.pending;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '16px 20px', flexWrap: 'wrap',
      background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)',
      borderRadius: 14, marginBottom: isLast ? 0 : 10,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#c8d8f8' }}>{p.event_name}</div>
        <div style={{ fontSize: 11.5, color: 'rgba(160,180,220,0.4)', marginTop: 2 }}>
          {p.event_type} · {p.event_date ? new Date(p.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </div>
        {p.reference_note && <div style={{ fontSize: 11, color: '#5fcf7a', marginTop: 3 }}>Ref: {p.reference_note}</div>}
        {Number(p.commission_amount) > 0 && (
          <div style={{ fontSize: 11, color: '#c084fc', marginTop: 3 }}>
            Celeste commission on this booking: ₹{rupees(p.commission_amount)}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#e8eef8', minWidth: 90, textAlign: 'right' }}>
          ₹{rupees(p.amount)}
        </div>
        <span style={{
          fontSize: 11, padding: '4px 12px', borderRadius: 20, textTransform: 'capitalize', fontWeight: 600,
          background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
          minWidth: 74, textAlign: 'center',
        }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

export default function VendorEarnings() {
  const [data, setData] = useState({ payouts: [], pending_total: 0, paid_total: 0, commission_total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // FIXED: was reading the dead `localStorage.getItem('vendor_token')`
  // key — never written to anymore since the refresh-token migration
  // (see VendorAuthContext.jsx) — so this request always 401'd and every
  // total on this page stayed frozen at ₹0 regardless of real payout
  // data. vendorFetch() attaches the real in-memory access token.
  useEffect(() => {
    vendorFetch(`${API}/vendor-payouts/vendor`)
      .then(r => r.json())
      .then(d => setData(d && d.payouts ? d : { payouts: [], pending_total: 0, paid_total: 0, commission_total: 0 }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = data.payouts.filter(p => filter === 'all' || p.status === filter);

  const counts = data.payouts.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div style={S.heading}>Earnings</div>
      <div style={S.sub}>What Celeste owes you, and what's already been paid out</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={S.statCard}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.4)', marginBottom: 10 }}>Pending payout</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: '#d4a843' }}>
            ₹{rupees(data.pending_total)}
          </div>
        </div>
        <div style={S.statCard}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.4)', marginBottom: 10 }}>Total paid out</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: '#5fcf7a' }}>
            ₹{rupees(data.paid_total)}
          </div>
        </div>
        <div style={{ ...S.statCard, borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(120,90,220,0.08)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,180,255,0.6)', marginBottom: 10 }}>Commission paid to Celeste</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: '#c084fc' }}>
            ₹{rupees(data.commission_total)}
          </div>
        </div>
      </div>

      {/* ── How commission works ─────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.cardTitle}>How commission works</div>
        <p style={{ fontSize: 13, color: 'rgba(200,220,255,0.6)', lineHeight: 1.7, marginTop: 10, marginBottom: 16 }}>
          When a client pays for an event you're booked on, Celeste takes a commission off your slot of that payment before crediting the rest to you as your payout. That commission is what funds the platform — everything else (your share) is paid out to you, tracked below.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['1', 'A client pays their advance or balance — that money goes to Celeste first, not directly to you.'],
            ['2', "Celeste calculates your slot's share of that payment based on your quoted price for the booking."],
            ['3', 'A commission percentage is deducted from your slot — this is the number shown above and next to each payout below.'],
            ['4', 'What remains is your net payout, added to "Pending payout" until admin marks it paid via bank transfer / UPI.'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, fontSize: 11, fontWeight: 700,
                background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.35)', color: '#c084fc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
              }}>{n}</span>
              <span style={{ fontSize: 13, color: 'rgba(200,220,255,0.6)', lineHeight: 1.6 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#c8d8f8' }}>Payout history</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', `All (${data.payouts.length})`], ['pending', `Pending (${counts.pending || 0})`], ['paid', `Paid (${counts.paid || 0})`], ['cancelled', `Cancelled (${counts.cancelled || 0})`]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(56,100,220,0.2)',
                background: filter === v ? 'rgba(76,138,255,0.2)' : 'transparent',
                color: filter === v ? '#4c8aff' : 'rgba(160,180,220,0.5)',
                fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'rgba(160,180,220,0.4)' }}>Loading…</p>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(160,180,220,0.25)', fontSize: 13, background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14 }}>
          No payouts yet. These appear once a client pays for an event you're booked on.
        </div>
      ) : (
        <div>
          {displayed.map((p, i) => (
            <PayoutRow key={p.id} p={p} isLast={i === displayed.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}