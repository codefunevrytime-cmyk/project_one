import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import { API_URL } from '../config/api';

const API = API_URL;

const PAYMENT_METHODS = [
  { id: "upi",        icon: "◎", label: "UPI",         sub: "GPay · PhonePe · Paytm" },
  { id: "card",       icon: "▭", label: "Card",        sub: "Credit / Debit" },
  { id: "netbanking", icon: "⊟", label: "Net Banking", sub: "All major banks" },
  { id: "emi",        icon: "≋", label: "EMI",         sub: "0% for 3 months" },
];

// Load Razorpay script dynamically
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

export default function PaymentCheckout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const event     = location.state?.event;

  // 'advance' | 'balance' | 'addon'
  const paymentType = location.state?.paymentType || 'advance';
  const isBalance = paymentType === 'balance';
  const isAddon   = paymentType === 'addon';
  const isAdvance = !isBalance && !isAddon;

  // For addon payments, the addon record (id, label, amount, notes) is
  // passed straight from MyEvents.jsx — no need to hit the summary route.
  const addon = location.state?.addon || null;

  const [method,  setMethod]  = useState("upi");
  const [paying,  setPaying]  = useState(false);
  const [error,   setError]   = useState('');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(isBalance);

  // ── Per-vendor advance terms ──────────────────────────────────────────
  // Each vendor sets their own advance % on their profile (payment_terms,
  // e.g. "20% adv"). The event's own cost (reference event + contingency)
  // always uses a flat 20% advance, separate from any vendor's terms.
  // Fetched fresh from the backend rather than computed client-side, since
  // it also drives the exact amount Razorpay will charge.
  const [advanceTerms, setAdvanceTerms] = useState(null);
  const [loadingAdvanceTerms, setLoadingAdvanceTerms] = useState(isAdvance);

  // Redirect if no event data, or an addon payment with no addon attached
  useEffect(() => {
    if (!event || (isAddon && !addon)) navigate('/my-events');
  }, [event, isAddon, addon, navigate]);

  // For balance payments, fetch the real "what's owed" figure from the
  // backend instead of guessing on the frontend — it accounts for any
  // add-ons/adjustments that happened after the advance was paid.
  useEffect(() => {
    if (isBalance && event?.bookingId) {
      fetch(`${API}/payments/summary/${event.bookingId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('celeste_token')}` } })
        .then(r => r.json())
        .then(d => setSummary(d))
        .catch(() => setError('Could not load payment details.'))
        .finally(() => setLoadingSummary(false));
    }

  }, [isBalance, event?.bookingId]);

  // For advance payments, fetch each vendor's own advance % and the flat
  // 20% event-only advance from the backend.
  useEffect(() => {
    if (isAdvance && event?.bookingId) {
      fetch(`${API}/payments/vendor-advance-terms/${event.bookingId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('celeste_token')}` } })
        .then(r => r.json())
        .then(d => setAdvanceTerms(d))
        .catch(() => setError('Could not load advance payment terms.'))
        .finally(() => setLoadingAdvanceTerms(false));
    }

  }, [isAdvance, event?.bookingId]);

  if (!event || (isAddon && !addon)) return null;

  // `total` is the full event budget — used for the cost breakdown and to
  // work out "pay later" once the real advance total is known.
  const total = isAdvance ? (event.budgetTotal || 0) : (summary?.total_budget || 0);

  // Real advance total from the backend (sum of each vendor's own advance +
  // the flat 20% event-only advance) — falls back to 0 while loading so we
  // never show/charge a client-guessed number.
  const totalAdvance = isAdvance ? (advanceTerms?.total_advance_amount || 0) : 0;
  const payLater = Math.max(0, total - totalAdvance);

  const payAmount = isAddon ? Number(addon.amount) : isBalance ? (summary?.balance_due || 0) : totalAdvance;

  async function handlePay() {
    setPaying(true);
    setError('');

    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpay();
      if (!loaded) { setError('Could not load Razorpay. Check your internet connection.'); setPaying(false); return; }

      // 2. Create order on backend — amount for advance/balance/addon is
      //    always computed server-side, we only tell it which type + which
      //    addon (if any) this payment is for.
      const orderRes = await fetch(`${API}/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('celeste_token')}` },
        body: JSON.stringify({
          booking_id:   event.bookingId,
          payment_type: paymentType,
          ...(isAddon ? { addon_id: addon.id } : {}),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) { setError(orderData.error || 'Could not create payment order. Please try again.'); setPaying(false); return; }

      // 3. Open Razorpay checkout
      const description = isAddon
        ? `${addon.label} for ${event.name}`
        : isBalance
          ? `Balance payment for ${event.name}`
          : `Advance for ${event.name}`;

      const options = {
        key:         orderData.key,
        amount:      orderData.amount,
        currency:    'INR',
        name:        'Lumière Visual Studio',
        description,
        order_id:    orderData.order_id,
        prefill: {
          name:  user?.name  || '',
          email: user?.email || '',
        },
        theme:   { color: '#C9A96E' },
        method:  method === 'upi' ? { upi: true } : method === 'card' ? { card: true } : method === 'netbanking' ? { netbanking: true } : { emi: true },
        handler: async (response) => {
          // 4. Verify payment on backend
          const verifyRes = await fetch(`${API}/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('celeste_token')}` },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              booking_id:          event.bookingId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            navigate('/payments/history', {
              state: {
                fromSuccess: true,
                paymentType,
                advance:     isAdvance ? totalAdvance : undefined,
                balance:     isAdvance ? payLater : undefined,
                paidAmount:  orderData.amount / 100,
                paymentId:   response.razorpay_payment_id,
                event,
              }
            });
          } else {
            setError('Payment verification failed. Contact support.');
          }
          setPaying(false);
        },
        modal: {
          ondismiss: () => { setPaying(false); },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });
      rzp.open();

    } catch {
      setError('Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  if (isBalance && loadingSummary) {
    return <div className="checkout-page" style={{ padding: 60, textAlign: 'center', color: '#8a7355' }}>Loading payment details…</div>;
  }

  if (isAdvance && loadingAdvanceTerms) {
    return <div className="checkout-page" style={{ padding: 60, textAlign: 'center', color: '#8a7355' }}>Loading advance payment terms…</div>;
  }

  if (isBalance && summary && summary.balance_due <= 0) {
    return (
      <div className="checkout-page" style={{ padding: 60, textAlign: 'center', color: '#8a7355' }}>
        <p style={{ marginBottom: 20 }}>No balance due for this event.</p>
        <button className="co-back" onClick={() => navigate('/my-events')}>← Back to My Events</button>
      </div>
    );
  }

  const pageTitle = isAddon ? <>Pay <em>Extra Charge</em></> : isBalance ? <>Pay <em>Balance</em></> : <>Complete <em>Payment</em></>;
  const badgeText = isAddon ? 'Additional charge for this event' : isBalance ? 'Final payment to close out this event' : 'Required to confirm booking';
  const heading   = isAddon ? addon.label : isBalance ? <>Balance <em>Payment</em></> : <>Advance <em>Payment</em></>;
  const descText  = isAddon
    ? (addon.notes || 'An additional charge added to your event by the event planning team.')
    : isBalance
      ? 'This covers everything owed beyond your advance — including any add-ons approved during the event, minus any adjustments.'
      : 'Each vendor has their own advance requirement, shown below. The rest of your booking is due 7 days before the event date.';

  return (
    <div className="checkout-page">
      <nav className="co-nav">
        <button className="co-back" onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <span className="co-nav-title">{pageTitle}</span>
        <div className="co-secure">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Secured
        </div>
      </nav>

      <div className="co-layout">
        {/* LEFT */}
        <div className="co-left">
          <div className="co-event-card">
            <div className="co-event-type">{event.type}</div>
            <h2 className="co-event-name">{event.name}</h2>
            <div className="co-event-meta">
              <span>📅 {event.date} · {event.time}</span>
              <span>📍 {event.venue || 'Venue TBD'}</span>
              {event.guests > 0 && <span>👥 {event.guests} guests</span>}
            </div>
          </div>

          {isAdvance && (
            <>
              <div className="co-section">
                <div className="co-section-label">Estimated cost breakdown</div>
                <div className="co-breakdown">
                  {event.breakdown.map((row, i) => (
                    <div className="co-row" key={i}>
                      <div>
                        <div className="co-row-label">{row.label}</div>
                        <div className="co-row-sub">{row.sub}</div>
                      </div>
                      <div className="co-row-amt">₹{row.amount.toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                  {advanceTerms?.event_only_advance_amount > 0 && (
                    <div className="co-row gst-row">
                      <div>
                        <div className="co-row-label">Event costs</div>
                        <div className="co-row-sub">Reference event, contingency buffer — 20% advance applies</div>
                      </div>
                      <div className="co-row-amt">₹{Math.round((advanceTerms.event_only_advance_amount / 0.20)).toLocaleString("en-IN")}</div>
                    </div>
                  )}
                </div>
                <div className="co-total-bar">
                  <span className="co-total-label">Total estimate</span>
                  <span className="co-total-amt">₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* ── Per-vendor advance terms ─────────────────────────────
                  Each vendor sets their own advance % on their profile —
                  shown here per vendor rather than one blanket figure, so
                  the client sees exactly why the total advance is what it
                  is. */}
              {advanceTerms?.vendors?.length > 0 && (
                <div className="co-section">
                  <div className="co-section-label">Vendor advance terms</div>
                  <div className="co-breakdown">
                    {advanceTerms.vendors.map((v, i) => (
                      <div className="co-row" key={i}>
                        <div>
                          <div className="co-row-label">{v.vendor_name}</div>
                          <div className="co-row-sub">{v.service_type} · {v.advance_pct}% advance of ₹{v.quoted_price.toLocaleString("en-IN")}</div>
                        </div>
                        <div className="co-row-amt">₹{Math.round(v.advance_amount).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="co-section">
                <div className="co-section-label">Cancellation & refund policy</div>
                <div className="co-policy">
                  {[
                    ['green',  '100% refund', 'cancelled more than 7 days before the event'],
                    ['yellow', '50% refund',  'cancelled within 48 hours of booking'],
                    ['orange', '25% refund',  'cancelled 1 day before the event'],
                    ['red',    'No refund',   'on day of event or no-show'],
                  ].map(([dot, bold, rest]) => (
                    <div className="co-policy-row" key={bold}>
                      <div className={`co-pdot ${dot}`} />
                      <div className="co-policy-text"><strong>{bold}</strong> — {rest}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {isBalance && (
            <div className="co-section">
              <div className="co-section-label">Payment ledger so far</div>
              <div className="co-breakdown">
                {summary?.payments.filter(p => p.status === 'paid').map((p) => (
                  <div className="co-row" key={p.id}>
                    <div>
                      <div className="co-row-label" style={{ textTransform: 'capitalize' }}>{p.payment_type}</div>
                      <div className="co-row-sub">
                        {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="co-row-amt">₹{(Number(p.amount) / 100).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
              <div className="co-total-bar">
                <span className="co-total-label">Total event budget</span>
                <span className="co-total-amt">₹{(summary?.total_budget || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          {isAddon && (
            <div className="co-section">
              <div className="co-section-label">Charge details</div>
              <div className="co-row">
                <div>
                  <div className="co-row-label">{addon.label}</div>
                  {addon.notes && <div className="co-row-sub">{addon.notes}</div>}
                </div>
                <div className="co-row-amt">₹{Number(addon.amount).toLocaleString("en-IN")}</div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="co-right">
          <div className="co-adv-card">
            <div className="co-adv-badge">{badgeText}</div>
            <div className="co-adv-title">{heading}</div>
            <p className="co-adv-desc">{descText}</p>

            {isAdvance && (
              <>
                <div className="co-adv-split">
                  <div className="co-adv-chip highlight">
                    <div className="co-chip-label">Pay now</div>
                    <div className="co-chip-val">₹{totalAdvance.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="co-adv-chip">
                    <div className="co-chip-label">Pay later</div>
                    <div className="co-chip-val muted">₹{payLater.toLocaleString("en-IN")}</div>
                  </div>
                </div>

                {/* Mini breakdown of what makes up "Pay now" — event-only
                    20% + each vendor's own %, so the total isn't a mystery
                    figure. */}
                <div className="co-adv-mini">
                  {advanceTerms?.event_only_advance_amount > 0 && (
                    <div className="co-adv-mini-row">
                      <span>Event costs · 20%</span>
                      <span>₹{Math.round(advanceTerms.event_only_advance_amount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {advanceTerms?.vendors?.map((v, i) => (
                    <div className="co-adv-mini-row" key={i}>
                      <span>{v.vendor_name} · {v.advance_pct}%</span>
                      <span>₹{Math.round(v.advance_amount).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {isBalance && (
              <div className="co-adv-split" style={{ gridTemplateColumns: '1fr' }}>
                <div className="co-adv-chip highlight">
                  <div className="co-chip-label">Balance due</div>
                  <div className="co-chip-val">₹{(summary?.balance_due || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>
            )}
            {isAddon && (
              <div className="co-adv-split" style={{ gridTemplateColumns: '1fr' }}>
                <div className="co-adv-chip highlight">
                  <div className="co-chip-label">Amount due</div>
                  <div className="co-chip-val">₹{Number(addon.amount).toLocaleString("en-IN")}</div>
                </div>
              </div>
            )}
          </div>

          <div className="co-section">
            <div className="co-section-label">Pay with</div>
            <div className="co-methods">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} className={`co-method ${method === m.id ? "active" : ""}`} onClick={() => setMethod(m.id)}>
                  <span className="co-method-icon">{m.icon}</span>
                  <span>
                    <span className="co-method-name">{m.label}</span>
                    <span className="co-method-sub">{m.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(160,64,64,0.15)', border: '1px solid #3e2020', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e07070' }}>
              {error}
            </div>
          )}

          <button className={`co-pay-btn ${paying ? "loading" : ""}`} onClick={handlePay} disabled={paying}>
            {paying ? (
              <span className="co-spinner" />
            ) : (
              <>
                {isAddon ? 'Pay charge' : isBalance ? 'Pay balance' : 'Pay advance'} · ₹{payAmount.toLocaleString("en-IN")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>

          <div className="co-secure-note">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            256-bit SSL encrypted · PCI DSS compliant · Razorpay secured
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .checkout-page { min-height: 100vh; background: #1a1208; color: #d4c4a0; font-family: 'Outfit', sans-serif; }
        .co-nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 56px; border-bottom: 1px solid #2e2210; background: #141008; position: sticky; top: 0; z-index: 10; }
        .co-back { display: flex; align-items: center; gap: 8px; background: none; border: none; color: #8a7355; font-family: 'Outfit', sans-serif; font-size: 15px; cursor: pointer; transition: color 0.2s; }
        .co-back:hover { color: #e8d8b0; }
        .co-nav-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: #f0e4c8; }
        .co-nav-title em { font-style: italic; color: #D4A853; }
        .co-secure { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 500; color: #5a8a60; letter-spacing: 0.08em; text-transform: uppercase; }
        .co-layout { display: grid; grid-template-columns: 1fr 460px; gap: 0; max-width: 1200px; margin: 0 auto; padding: 56px 32px; align-items: start; }
        .co-left { padding-right: 60px; border-right: 1px solid #2e2210; }
        .co-right { padding-left: 60px; }
        .co-event-card { margin-bottom: 44px; padding-bottom: 44px; border-bottom: 1px solid #2e2210; }
        .co-event-type { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #D4A853; margin-bottom: 12px; font-weight: 500; }
        .co-event-name { font-family: 'Cormorant Garamond', serif; font-size: 48px; font-weight: 300; color: #f0e4c8; margin-bottom: 20px; letter-spacing: -0.02em; line-height: 1.05; }
        .co-event-meta { display: flex; flex-direction: column; gap: 8px; font-size: 15px; color: #8a7355; font-weight: 300; }
        .co-section { margin-bottom: 40px; }
        .co-section-label { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #6a5540; margin-bottom: 20px; font-weight: 500; padding-bottom: 10px; border-bottom: 1px solid #2e2210; }
        .co-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #261c0e; }
        .co-row.gst-row { opacity: 0.65; }
        .co-row-label { font-size: 16px; color: #e0cfa8; margin-bottom: 4px; }
        .co-row-sub { font-size: 13px; color: #6a5540; font-weight: 300; }
        .co-row-amt { font-size: 17px; color: #e0cfa8; font-weight: 500; flex-shrink: 0; margin-left: 32px; }
        .co-total-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 20px 24px; background: #201508; border: 1px solid #3a2812; border-radius: 10px; }
        .co-total-label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #6a5540; }
        .co-total-amt { font-family: 'Cormorant Garamond', serif; font-size: 38px; font-weight: 300; color: #f0e4c8; }
        .co-policy { display: flex; flex-direction: column; }
        .co-policy-row { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid #261c0e; }
        .co-policy-row:last-child { border: none; }
        .co-pdot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
        .co-pdot.green { background: #5a9e70; } .co-pdot.yellow { background: #b09040; } .co-pdot.orange { background: #b07040; } .co-pdot.red { background: #a04040; }
        .co-policy-text { font-size: 15px; color: #8a7355; line-height: 1.6; font-weight: 300; }
        .co-policy-text strong { color: #e0cfa8; font-weight: 600; }
        .co-adv-card { background: #1e1408; border: 1px solid #3a2812; border-radius: 12px; padding: 28px; margin-bottom: 32px; }
        .co-adv-badge { display: inline-block; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #D4A853; border: 1px solid #4a3418; border-radius: 20px; padding: 5px 14px; margin-bottom: 18px; }
        .co-adv-title { font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 300; color: #f0e4c8; margin-bottom: 12px; line-height: 1.1; }
        .co-adv-title em { font-style: italic; color: #D4A853; }
        .co-adv-desc { font-size: 15px; color: #7a6548; font-weight: 300; line-height: 1.7; margin-bottom: 22px; }
        .co-adv-split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .co-adv-chip { background: #161007; border: 1px solid #2e2210; border-radius: 10px; padding: 16px 18px; }
        .co-adv-chip.highlight { border-color: #D4A85355; background: #201608; }
        .co-chip-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #6a5540; margin-bottom: 8px; }
        .co-chip-val { font-family: 'Cormorant Garamond', serif; font-size: 30px; font-weight: 300; color: #D4A853; }
        .co-chip-val.muted { color: #5a4830; }
        .co-adv-mini { margin-top: 16px; padding-top: 16px; border-top: 1px solid #2e2210; display: flex; flex-direction: column; gap: 8px; }
        .co-adv-mini-row { display: flex; justify-content: space-between; font-size: 12.5px; color: #8a7355; }
        .co-adv-mini-row span:last-child { color: #c8ac74; font-weight: 500; }
        .co-methods { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .co-method { display: flex; align-items: center; gap: 12px; background: #1e1408; border: 1px solid #2e2210; border-radius: 10px; padding: 16px 18px; cursor: pointer; transition: border-color 0.2s, background 0.2s; text-align: left; font-family: 'Outfit', sans-serif; }
        .co-method:hover { border-color: #4a3418; background: #221608; }
        .co-method.active { border-color: #D4A853; background: #221808; box-shadow: 0 0 0 1px #D4A85322; }
        .co-method-icon { font-size: 22px; color: #8a7355; width: 28px; text-align: center; }
        .co-method-name { display: block; font-size: 15px; font-weight: 500; color: #e0cfa8; margin-bottom: 3px; }
        .co-method-sub { display: block; font-size: 12px; color: #5a4830; font-weight: 300; }
        .co-pay-btn { width: 100%; margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 12px; background: #D4A853; color: #14100a; border: none; border-radius: 8px; padding: 18px 28px; font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; box-shadow: 0 4px 20px rgba(212,168,83,0.25); }
        .co-pay-btn:hover:not(:disabled) { background: #e0b860; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(212,168,83,0.35); }
        .co-pay-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .co-pay-btn.loading { background: #a8884a; }
        .co-spinner { width: 20px; height: 20px; border: 2px solid #14100a44; border-top-color: #14100a; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .co-secure-note { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 12px; color: #5a4830; margin-top: 14px; font-weight: 300; }
        @media (max-width: 960px) { .co-layout { grid-template-columns: 1fr; padding: 40px 24px; } .co-left { padding-right: 0; border-right: none; border-bottom: 1px solid #2e2210; padding-bottom: 48px; margin-bottom: 48px; } .co-right { padding-left: 0; } .co-nav { padding: 18px 24px; } }
        @media (max-width: 640px) {
          .co-nav { padding: 14px 16px; gap: 10px; }
          .co-nav-title { font-size: 20px; }
          .co-secure { display: none; }
          .co-layout { padding: 28px 16px; }
          .co-left { padding-bottom: 32px; margin-bottom: 32px; }
          .co-event-name { font-size: 32px; }
          .co-event-meta { font-size: 13px; }
          .co-row { flex-wrap: wrap; gap: 4px 0; }
          .co-row-amt { margin-left: 0; }
          .co-total-bar { flex-wrap: wrap; gap: 8px; padding: 16px 18px; }
          .co-total-amt { font-size: 28px; }
          .co-adv-card { padding: 20px; }
          .co-adv-title { font-size: 26px; }
          .co-adv-split { grid-template-columns: 1fr; }
          .co-chip-val { font-size: 24px; }
          .co-methods { grid-template-columns: 1fr; }
          .co-pay-btn { font-size: 15px; padding: 16px 20px; }
        }
      `}</style>
    </div>
  );
}
