import { useState, useEffect } from 'react';
import { useVendorAuth } from '../context/VendorAuthContext';

import { API_URL } from '../../config/api';
import { vendorFetch } from '../../lib/vendorApi';

const API = API_URL;

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const S = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 28 },
  card: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '24px 26px', marginBottom: 20 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#c8d8f8', marginBottom: 4, letterSpacing: '0.02em' },
  label: { fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.4)' },
  input: {
    width: '100%', background: 'rgba(20,30,60,0.5)', border: '1px solid rgba(56,100,220,0.18)',
    borderRadius: 9, padding: '11px 14px', fontSize: 14, color: '#e8eef8',
    fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
  },
};

const STATUS_META = {
  trial:    { label: 'Free trial',     color: '#4c8aff', icon: '🎁' },
  active:   { label: 'Deposit active', color: '#5fcf7a', icon: '🛡' },
  depleted: { label: 'Deposit depleted', color: '#f87171', icon: '⚠️' },
  exited:   { label: 'Exited program', color: 'rgba(160,180,220,0.4)', icon: '↩' },
};

const LEDGER_META = {
  initial_deposit:   { label: 'Initial deposit',    color: '#4c8aff', icon: '＋', sign: '+' },
  monthly_shortfall: { label: 'Monthly settlement', color: '#f0a84a', icon: '−', sign: '' },
  topup:             { label: 'Top-up',             color: '#5fcf7a', icon: '＋', sign: '+' },
  refund:            { label: 'Refund',              color: '#f87171', icon: '↩', sign: '−' },
  adjustment:        { label: 'Adjustment',          color: 'rgba(160,180,220,0.6)', icon: '•', sign: '' },
};

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

/* ── One ledger row ───────────────────────────────────────────────────── */
function LedgerRow({ row, isLast }) {
  const lm = LEDGER_META[row.type] || LEDGER_META.adjustment;
  const amt = Number(row.amount_paise) / 100;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 0', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: `${lm.color}18`, border: `1px solid ${lm.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: lm.color, fontWeight: 700,
      }}>
        {lm.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#c8d8f8', fontWeight: 500 }}>
            {lm.label}{row.month ? ` · ${row.month}` : ''}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: lm.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {amt === 0 ? '—' : `${amt > 0 ? '+' : ''}₹${fmt(Math.abs(amt))}`}
          </div>
        </div>
        {row.notes && (
          <div style={{ fontSize: 11.5, color: 'rgba(160,180,220,0.45)', marginTop: 3, lineHeight: 1.5 }}>{row.notes}</div>
        )}
        <div style={{ fontSize: 10.5, color: 'rgba(160,180,220,0.28)', marginTop: 4 }}>
          {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

export default function VendorDeposit() {
  const { vendorUser } = useVendorAuth();
  const vendorId = vendorUser?.vendor_id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // FIXED: was reading the dead `localStorage.getItem('vendor_token')`
  // key (never written to anymore — see VendorAuthContext.jsx), so this
  // request always 401'd. The response body for a 401 still parses as
  // JSON (`{ error: "..." }`), so `data` was truthy and the render below
  // crashed on `data.ledger.length` — `ledger` doesn't exist on an error
  // payload. vendorFetch() attaches the real in-memory token; the
  // `d && d.ledger` guard below also makes this resilient to any future
  // malformed/error response instead of crashing the whole page.
  const fetchDeposit = () => {
    if (!vendorId) return;
    vendorFetch(`${API}/payments/deposit/${vendorId}`)
      .then(r => r.json())
      .then(d => { setData(d && Array.isArray(d.ledger) ? d : null); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchDeposit(); }, [vendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTopup = async () => {
    setError(''); setSuccess('');
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }

    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { setError('Could not load payment gateway. Check your connection.'); setPaying(false); return; }

      const orderRes = await vendorFetch(`${API}/payments/deposit/${vendorId}/topup/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) { setError(orderData.error || 'Could not start top-up.'); setPaying(false); return; }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Lumière Visual Studio',
        description: 'Security deposit top-up',
        order_id: orderData.order_id,
        prefill: { name: vendorUser?.name || '', email: vendorUser?.email || '' },
        theme: { color: '#4c8aff' },
        handler: async (response) => {
          const verifyRes = await vendorFetch(`${API}/payments/deposit/${vendorId}/topup/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setSuccess('Deposit topped up successfully.');
            setTopupAmount('');
            fetchDeposit();
          } else {
            setError('Payment verification failed. Contact support.');
          }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r) => { setError(`Payment failed: ${r.error.description}`); setPaying(false); });
      rzp.open();
    } catch {
      setError('Something went wrong. Please try again.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div style={S.heading}>Security Deposit</div>
        <div style={{ fontSize: 13, color: 'rgba(160,180,220,0.4)' }}>Loading…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <div style={S.heading}>Security Deposit</div>
        <div style={S.sub}>Could not load your deposit details. Please try again later.</div>
      </div>
    );
  }

  const meta = STATUS_META[data.status] || STATUS_META.trial;
  const pct = Math.min(100, Math.round((data.balance / data.target) * 100));
  const shortfall = Math.max(0, data.target - data.balance);

  return (
    <div>
      <div style={S.heading}>Security Deposit</div>
      <div style={S.sub}>How Celeste's refundable deposit and monthly commission floor works for your account</div>

      {/* Status banner */}
      <div style={{
        ...S.card,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        borderColor: `${meta.color}44`, background: `${meta.color}0d`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: `${meta.color}18`, border: `1px solid ${meta.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: meta.color }}>{meta.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(160,180,220,0.45)', marginTop: 2 }}>
              {data.in_trial
                ? `${data.days_left_in_trial} day${data.days_left_in_trial === 1 ? '' : 's'} left in your free trial`
                : data.status === 'exited'
                  ? 'You have left the deposit program'
                  : `₹${fmt(data.balance)} of ₹${fmt(data.target)} target balance`}
            </div>
          </div>
        </div>
        {!data.in_trial && data.status !== 'exited' && (
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: meta.color }}>
            ₹{fmt(data.balance)}
          </div>
        )}
      </div>

      {/* Trial explainer */}
      {data.in_trial && (
        <div style={S.card}>
          <div style={S.cardTitle}>You're in your free trial</div>
          <p style={{ fontSize: 13, color: 'rgba(160,180,220,0.55)', lineHeight: 1.7, marginTop: 10 }}>
            New vendors get <strong style={{ color: '#c8d8f8' }}>2 months</strong> on Celeste with no security deposit required.
            List your services, take bookings, and build reviews risk-free. Your trial ends on{' '}
            <strong style={{ color: '#c8d8f8' }}>
              {new Date(data.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>.
            After that, a refundable ₹{fmt(data.target)} deposit will apply.
          </p>
        </div>
      )}

      {/* Balance meter — only once deposit is active */}
      {!data.in_trial && data.status !== 'exited' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={S.cardTitle}>Deposit balance</div>
            <span style={{ fontSize: 11, color: 'rgba(160,180,220,0.4)' }}>{pct}% of target</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{
              height: '100%', borderRadius: 4, width: `${pct}%`,
              background: pct < 40 ? '#f87171' : pct < 100 ? '#f0a84a' : '#5fcf7a',
              transition: 'width 0.3s ease',
            }} />
          </div>

          {shortfall > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              background: 'rgba(240,168,74,0.08)', border: '1px solid rgba(240,168,74,0.25)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 18,
            }}>
              <span style={{ fontSize: 12.5, color: '#f0c088' }}>
                You're ₹{fmt(shortfall)} below your ₹{fmt(data.target)} target. Top up to keep your deposit healthy.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ ...S.label, display: 'block', marginBottom: 7 }}>Top-up amount (₹)</label>
              <input
                style={S.input} type="number" min="1" placeholder={`e.g. ${fmt(shortfall || data.target)}`}
                value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
              />
            </div>
            <button
              onClick={handleTopup}
              disabled={paying}
              style={{
                padding: '11px 24px', background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)',
                border: 'none', borderRadius: 9, color: '#e8f0ff', fontSize: 13, fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif", cursor: paying ? 'not-allowed' : 'pointer',
                opacity: paying ? 0.7 : 1, whiteSpace: 'nowrap',
              }}
            >
              {paying ? 'Processing…' : 'Top up deposit'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: '#ff8080', background: 'rgba(220,60,60,0.1)', border: '1px solid rgba(220,60,60,0.25)', borderRadius: 8, padding: '9px 13px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: '#6ed496', background: 'rgba(40,120,70,0.12)', border: '1px solid rgba(60,180,100,0.25)', borderRadius: 8, padding: '9px 13px' }}>
              {success}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div style={S.card}>
        <div style={S.cardTitle}>How the deposit works</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          {[
            ['1', 'Every month, Celeste expects a minimum ₹1,000 in commission from your active bookings.'],
            ['2', 'If your commission for the month falls short, the difference is deducted from your deposit — never more than the shortfall.'],
            ['3', 'If you deactivate your profile for 15+ days in a month, no deduction is made for that period.'],
            ['4', 'You can top up your deposit back to ₹1,000 at any time.'],
            ['5', 'Whatever balance remains is refunded 100% whenever you choose to leave — no conditions attached.'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, fontSize: 11, fontWeight: 700,
                background: 'rgba(76,138,255,0.12)', border: '1px solid rgba(76,138,255,0.3)', color: '#4c8aff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
              }}>{n}</span>
              <span style={{ fontSize: 13, color: 'rgba(200,220,255,0.6)', lineHeight: 1.6 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ledger */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={S.cardTitle}>Deposit history</div>
          {data.ledger.length > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(160,180,220,0.35)' }}>
              {data.ledger.length} entr{data.ledger.length === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
        {data.ledger.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(160,180,220,0.3)', marginTop: 12 }}>No deposit activity yet.</p>
        ) : (
          <div style={{ marginTop: 10 }}>
            {data.ledger.map((row, i) => (
              <LedgerRow key={row.id} row={row} isLast={i === data.ledger.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}