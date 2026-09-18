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

const STATUS_META = {
  trial:    { label: 'Free Trial',       color: '#6ea8fe', glow: 'rgba(110,168,254,0.3)'  },
  active:   { label: 'Active',           color: '#4ade80', glow: 'rgba(74,222,128,0.3)'   },
  depleted: { label: 'Depleted',         color: '#f87171', glow: 'rgba(248,113,113,0.3)'  },
  exited:   { label: 'Exited',           color: '#64748b', glow: 'rgba(100,116,139,0.2)'  },
};

const LEDGER_META = {
  initial_deposit:   { label: 'Initial Deposit',    color: '#6ea8fe' },
  monthly_shortfall: { label: 'Monthly Settlement', color: '#fb923c' },
  topup:             { label: 'Top-up',             color: '#4ade80' },
  refund:            { label: 'Refund',             color: '#f87171' },
  adjustment:        { label: 'Adjustment',         color: '#94a3b8' },
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/* Circular SVG gauge */
function DepositGauge({ pct, balance, target, color, label }) {
  const R = 88;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;
  const gap = C - dash;

  return (
    <div style={{ position: 'relative', width: 220, height: 220, flexShrink: 0 }}>
      <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
        {/* track */}
        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        {/* fill */}
        {pct > 0 && (
          <circle
            cx="110" cy="110" r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        )}
      </svg>
      {/* center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 13, fontWeight: 300, color: 'rgba(148,163,184,0.6)', marginBottom: 4, letterSpacing: '0.04em' }}>
          BALANCE
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 600, color, lineHeight: 1, letterSpacing: '-0.02em' }}>
          ₹{fmt(balance)}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(148,163,184,0.4)', marginTop: 6 }}>
          of ₹{fmt(target)} target
        </div>
        <div style={{
          marginTop: 10, padding: '3px 10px',
          background: `${color}18`, border: `1px solid ${color}40`,
          borderRadius: 99, fontFamily: "'DM Sans', sans-serif",
          fontSize: 10, fontWeight: 600, color, letterSpacing: '0.08em',
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function LedgerRow({ row, isLast }) {
  const lm = LEDGER_META[row.type] || LEDGER_META.adjustment;
  const amt = Number(row.amount_paise) / 100;
  const positive = amt > 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* icon dot */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${lm.color}12`, border: `1px solid ${lm.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {positive
            ? <path d="M7 11V3M3 7l4-4 4 4" stroke={lm.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            : amt < 0
              ? <path d="M7 3v8M3 7l4 4 4-4" stroke={lm.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M3 7h8" stroke={lm.color} strokeWidth="1.5" strokeLinecap="round"/>
          }
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 3 }}>
          {lm.label}{row.month ? ` · ${row.month}` : ''}
        </div>
        {row.notes && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: 'rgba(148,163,184,0.45)', lineHeight: 1.5 }}>{row.notes}</div>
        )}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(148,163,184,0.25)', marginTop: 3 }}>
          {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14, fontWeight: 600,
        color: positive ? '#4ade80' : amt < 0 ? '#f87171' : '#64748b',
        flexShrink: 0,
      }}>
        {amt === 0 ? '—' : `${positive ? '+' : '−'}₹${fmt(Math.abs(amt))}`}
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
  const [inputFocused, setInputFocused] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

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

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: '32px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%', background: '#6ea8fe',
            animation: `vd-pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
        <style>{`@keyframes vd-pulse{0%,100%{opacity:.15;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (!data) {
    return (
      <div style={{ padding: '32px 0' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 300, color: '#e2e8f0', margin: '0 0 8px' }}>Security Deposit</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(148,163,184,0.5)' }}>Could not load your deposit details. Please try again later.</p>
      </div>
    );
  }

  const meta = STATUS_META[data.status] || STATUS_META.trial;
  const pct = Math.min(100, Math.round((data.balance / data.target) * 100));
  const shortfall = Math.max(0, data.target - data.balance);

  /* ── Shared card style ───────────────────────────────────────────────── */
  const card = {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  const eyebrow = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10, fontWeight: 600,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: 'rgba(148,163,184,0.4)',
    marginBottom: 16,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", paddingBottom: 40 }}>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Fraunces', serif", fontWeight: 300,
          fontSize: 34, color: '#e2e8f0',
          margin: 0, lineHeight: 1.1, marginBottom: 8,
        }}>
          Security Deposit
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.45)', margin: 0, lineHeight: 1.6, maxWidth: 420 }}>
          Celeste's refundable deposit and monthly commission floor for your account.
        </p>
      </div>

      {/* ── Trial state ─────────────────────────────────────────────── */}
      {data.in_trial && (
        <div style={{
          ...card,
          padding: '28px 30px',
          borderColor: 'rgba(110,168,254,0.2)',
          marginBottom: 16,
          display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'rgba(110,168,254,0.1)', border: '1px solid rgba(110,168,254,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L13.5 8.5H20L14.5 12.5L16.5 19L11 15L5.5 19L7.5 12.5L2 8.5H8.5L11 2Z" stroke="#6ea8fe" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#6ea8fe', marginBottom: 6 }}>You're on a free trial</div>
            <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.55)', lineHeight: 1.7, margin: 0 }}>
              New vendors get <strong style={{ color: '#cbd5e1', fontWeight: 600 }}>2 months</strong> on Celeste with no deposit required. Trial ends{' '}
              <strong style={{ color: '#cbd5e1', fontWeight: 600 }}>
                {new Date(data.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </strong>. After that, a refundable ₹{fmt(data.target)} deposit will apply.
            </p>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 52, fontWeight: 300, color: '#6ea8fe', lineHeight: 1 }}>
              {data.days_left_in_trial}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.35)', marginTop: 4 }}>
              days left
            </div>
          </div>
        </div>
      )}

      {/* ── Balance + Top-up (2 col when wide) ──────────────────────── */}
      {!data.in_trial && data.status !== 'exited' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>

          {/* Gauge card */}
          <div style={{
            ...card,
            padding: '30px 28px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
          }}>
            <DepositGauge pct={pct} balance={data.balance} target={data.target} color={meta.color} label={meta.label} />
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Shortfall warning */}
            {shortfall > 0 && (
              <div style={{
                ...card,
                padding: '18px 22px',
                borderColor: 'rgba(251,146,60,0.2)',
                background: 'rgba(251,146,60,0.05)',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 13H2L8 2Z" stroke="#fb923c" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M8 7v3M8 11.5v.5" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fb923c', marginBottom: 3 }}>
                    ₹{fmt(shortfall)} below target
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(251,146,60,0.6)', lineHeight: 1.5 }}>
                    Top up to keep your deposit active and avoid service interruption.
                  </div>
                </div>
              </div>
            )}

            {/* Top-up form */}
            <div style={{ ...card, padding: '22px 24px', flex: 1 }}>
              <div style={eyebrow}>Add funds</div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'rgba(148,163,184,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Amount (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 15,
                    color: inputFocused ? 'rgba(110,168,254,0.7)' : 'rgba(148,163,184,0.3)',
                    transition: 'color 0.2s',
                    pointerEvents: 'none',
                  }}>₹</span>
                  <input
                    type="number" min="1"
                    placeholder={fmt(shortfall || data.target)}
                    value={topupAmount}
                    onChange={e => setTopupAmount(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: inputFocused ? 'rgba(110,168,254,0.05)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${inputFocused ? 'rgba(110,168,254,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '13px 14px 13px 32px',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 16,
                      color: '#e2e8f0', outline: 'none',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleTopup}
                disabled={paying}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                style={{
                  width: '100%', padding: '13px 24px',
                  background: paying
                    ? 'rgba(110,168,254,0.15)'
                    : btnHover
                      ? 'rgba(110,168,254,0.22)'
                      : 'rgba(110,168,254,0.15)',
                  border: `1px solid ${paying ? 'rgba(110,168,254,0.2)' : 'rgba(110,168,254,0.35)'}`,
                  borderRadius: 12,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                  color: paying ? 'rgba(110,168,254,0.5)' : '#6ea8fe',
                  cursor: paying ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.02em',
                  transform: btnHover && !paying ? 'translateY(-1px)' : 'none',
                  boxShadow: btnHover && !paying ? '0 8px 24px rgba(110,168,254,0.12)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {paying ? 'Processing…' : 'Top up deposit'}
              </button>

              {error && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  fontSize: 12.5, color: '#f87171', fontFamily: "'DM Sans', sans-serif",
                }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                  fontSize: 12.5, color: '#4ade80', fontFamily: "'DM Sans', sans-serif",
                }}>
                  {success}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── How it works ────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '26px 28px', marginBottom: 16 }}>
        <div style={eyebrow}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
          {[
            { n: '01', text: 'Celeste expects a minimum ₹1,000 in monthly commissions from your bookings.' },
            { n: '02', text: 'If commission falls short, only the difference is deducted from your deposit.' },
            { n: '03', text: 'Deactivating your profile for 15+ days in a month waives that month\'s deduction.' },
            { n: '04', text: 'Top up your deposit back to ₹1,000 at any time through this page.' },
            { n: '05', text: 'Your full remaining balance is refunded the moment you choose to leave.' },
          ].map(({ n, text }, i, arr) => (
            <div key={n} style={{
              padding: '16px 0',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0 12px', alignItems: 'start',
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 600,
                color: 'rgba(110,168,254,0.35)', paddingTop: 2,
              }}>{n}</span>
              <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.55)', lineHeight: 1.65 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ledger ──────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '26px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={eyebrow}>Transaction history</div>
          {data.ledger.length > 0 && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: 'rgba(148,163,184,0.25)', marginTop: -12,
            }}>
              {data.ledger.length} {data.ledger.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {data.ledger.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>—</div>
            <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.28)' }}>No deposit activity yet.</div>
          </div>
        ) : (
          data.ledger.map((row, i) => (
            <LedgerRow key={row.id} row={row} isLast={i === data.ledger.length - 1} />
          ))
        )}
      </div>

    </div>
  );
}
