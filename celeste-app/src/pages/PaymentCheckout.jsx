import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Mock event data — replace with real data from your router state / API
const DEFAULT_EVENT = {
  id: "EVT-2025-00847",
  name: "asdfghj",
  type: "Concert",
  venue: "ewtry",
  guests: 150,
  vendors: 2,
  date: "15 June 2025",
  time: "7:00 PM",
  breakdown: [
    { label: "Catering service", sub: "Base package", amount: 18000 },
    { label: "Florist", sub: "Stage & table arrangements", amount: 8000 },
    { label: "Per-head catering", sub: "150 × ₹180", amount: 27000 },
    { label: "Contingency buffer (12%)", sub: "Applied on subtotal", amount: 6360 },
  ],
  gst: 0.18,
};

const PAYMENT_METHODS = [
  { id: "upi", icon: "◎", label: "UPI", sub: "GPay · PhonePe · Paytm" },
  { id: "card", icon: "▭", label: "Card", sub: "Credit / Debit" },
  { id: "netbanking", icon: "⊟", label: "Net Banking", sub: "All major banks" },
  { id: "emi", icon: "≋", label: "EMI", sub: "0% for 3 months" },
];

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const location = useLocation();
  const event = location.state?.event || DEFAULT_EVENT;

  const [method, setMethod] = useState("upi");
  const [paying, setPaying] = useState(false);

  const subtotal = event.breakdown.reduce((s, r) => s + r.amount, 0);
  const gstAmt = Math.round(subtotal * (event.gst || 0.18));
  const total = subtotal + gstAmt;
  const advance = Math.round(total * 0.3);
  const balance = total - advance;

  function handlePay() {
    setPaying(true);
    setTimeout(() => {
      navigate("/payments/success", {
        state: { event, total, advance, balance, method },
      });
    }, 1800);
  }

  return (
    <div className="checkout-page">
      {/* ── Top nav matching your site ── */}
      <nav className="co-nav">
        <button className="co-back" onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <span className="co-nav-title">
          Complete <em>Payment</em>
        </span>
        <div className="co-secure">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Secured
        </div>
      </nav>

      <div className="co-layout">
        {/* LEFT: Event + Breakdown */}
        <div className="co-left">
          {/* Event identity */}
          <div className="co-event-card">
            <div className="co-event-type">{event.type}</div>
            <h2 className="co-event-name">{event.name}</h2>
            <div className="co-event-meta">
              <span>📅 {event.date} · {event.time}</span>
              <span>📍 {event.venue}</span>
              <span>👥 {event.guests} guests · {event.vendors} vendors</span>
            </div>
          </div>

          {/* Cost breakdown */}
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
              <div className="co-row gst-row">
                <div>
                  <div className="co-row-label">GST (18%)</div>
                  <div className="co-row-sub">On taxable services</div>
                </div>
                <div className="co-row-amt">₹{gstAmt.toLocaleString("en-IN")}</div>
              </div>
            </div>
            <div className="co-total-bar">
              <span className="co-total-label">Avg total estimate</span>
              <span className="co-total-amt">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Refund policy */}
          <div className="co-section">
            <div className="co-section-label">Cancellation & refund policy</div>
            <div className="co-policy">
              <div className="co-policy-row">
                <div className="co-pdot green" />
                <div className="co-policy-text">
                  <strong>100% refund</strong> — cancelled more than 7 days before the event
                </div>
              </div>
              <div className="co-policy-row">
                <div className="co-pdot yellow" />
                <div className="co-policy-text">
                  <strong>50% refund</strong> — cancelled within 48 hours of booking
                </div>
              </div>
              <div className="co-policy-row">
                <div className="co-pdot orange" />
                <div className="co-policy-text">
                  <strong>25% refund</strong> — cancelled 1 day before the event
                </div>
              </div>
              <div className="co-policy-row">
                <div className="co-pdot red" />
                <div className="co-policy-text">
                  <strong>No refund</strong> — on day of event or no-show
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Advance + Pay */}
        <div className="co-right">
          {/* Advance breakdown */}
          <div className="co-adv-card">
            <div className="co-adv-badge">Required to confirm booking</div>
            <div className="co-adv-title">
              Advance <em>Payment</em>
            </div>
            <p className="co-adv-desc">
              Pay 30% now to secure your booking. Balance is due 7 days before the event date.
            </p>
            <div className="co-adv-split">
              <div className="co-adv-chip highlight">
                <div className="co-chip-label">Pay now · 30%</div>
                <div className="co-chip-val">₹{advance.toLocaleString("en-IN")}</div>
              </div>
              <div className="co-adv-chip">
                <div className="co-chip-label">Pay later · 70%</div>
                <div className="co-chip-val muted">₹{balance.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>

          {/* Payment methods */}
          <div className="co-section">
            <div className="co-section-label">Pay with</div>
            <div className="co-methods">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`co-method ${method === m.id ? "active" : ""}`}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="co-method-icon">{m.icon}</span>
                  <span>
                    <span className="co-method-name">{m.label}</span>
                    <span className="co-method-sub">{m.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            className={`co-pay-btn ${paying ? "loading" : ""}`}
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? (
              <span className="co-spinner" />
            ) : (
              <>
                Pay advance · ₹{advance.toLocaleString("en-IN")}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>

          <div className="co-secure-note">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            256-bit SSL encrypted · PCI DSS compliant · Razorpay secured
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .checkout-page {
          min-height: 100vh;
          background: #1a1208;
          color: #d4c4a0;
          font-family: 'Outfit', sans-serif;
        }

        /* ── NAV ── */
        .co-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 56px;
          border-bottom: 1px solid #2e2210;
          background: #141008;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .co-back {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #8a7355;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: color 0.2s;
        }
        .co-back:hover { color: #e8d8b0; }

        .co-nav-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 300;
          color: #f0e4c8;
          letter-spacing: -0.01em;
        }
        .co-nav-title em { font-style: italic; color: #D4A853; }

        .co-secure {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 500;
          color: #5a8a60;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        /* ── LAYOUT ── */
        .co-layout {
          display: grid;
          grid-template-columns: 1fr 460px;
          gap: 0;
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 32px;
          align-items: start;
        }

        .co-left {
          padding-right: 60px;
          border-right: 1px solid #2e2210;
        }
        .co-right { padding-left: 60px; }

        /* ── EVENT CARD ── */
        .co-event-card {
          margin-bottom: 44px;
          padding-bottom: 44px;
          border-bottom: 1px solid #2e2210;
        }

        .co-event-type {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #D4A853;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .co-event-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 48px;
          font-weight: 300;
          color: #f0e4c8;
          margin-bottom: 20px;
          letter-spacing: -0.02em;
          line-height: 1.05;
        }

        .co-event-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 15px;
          color: #8a7355;
          font-weight: 300;
        }

        /* ── SECTIONS ── */
        .co-section { margin-bottom: 40px; }

        .co-section-label {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #6a5540;
          margin-bottom: 20px;
          font-weight: 500;
          padding-bottom: 10px;
          border-bottom: 1px solid #2e2210;
        }

        /* ── BREAKDOWN ── */
        .co-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 0;
          border-bottom: 1px solid #261c0e;
        }

        .co-row.gst-row { opacity: 0.65; }

        .co-row-label {
          font-size: 16px;
          color: #e0cfa8;
          margin-bottom: 4px;
          font-weight: 400;
        }

        .co-row-sub {
          font-size: 13px;
          color: #6a5540;
          font-weight: 300;
        }

        .co-row-amt {
          font-size: 17px;
          color: #e0cfa8;
          font-weight: 500;
          flex-shrink: 0;
          margin-left: 32px;
          letter-spacing: -0.01em;
        }

        .co-total-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          padding: 20px 24px;
          background: #201508;
          border: 1px solid #3a2812;
          border-radius: 10px;
        }

        .co-total-label {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6a5540;
          font-weight: 500;
        }

        .co-total-amt {
          font-family: 'Cormorant Garamond', serif;
          font-size: 38px;
          font-weight: 300;
          color: #f0e4c8;
          letter-spacing: -0.02em;
        }

        /* ── POLICY ── */
        .co-policy { display: flex; flex-direction: column; }

        .co-policy-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid #261c0e;
        }
        .co-policy-row:last-child { border: none; }

        .co-pdot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 6px;
        }
        .co-pdot.green  { background: #5a9e70; }
        .co-pdot.yellow { background: #b09040; }
        .co-pdot.orange { background: #b07040; }
        .co-pdot.red    { background: #a04040; }

        .co-policy-text {
          font-size: 15px;
          color: #8a7355;
          line-height: 1.6;
          font-weight: 300;
        }
        .co-policy-text strong {
          color: #e0cfa8;
          font-weight: 600;
        }

        /* ── ADVANCE CARD ── */
        .co-adv-card {
          background: #1e1408;
          border: 1px solid #3a2812;
          border-radius: 12px;
          padding: 28px 28px 24px;
          margin-bottom: 32px;
        }

        .co-adv-badge {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #D4A853;
          border: 1px solid #4a3418;
          border-radius: 20px;
          padding: 5px 14px;
          margin-bottom: 18px;
          font-weight: 500;
        }

        .co-adv-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 34px;
          font-weight: 300;
          color: #f0e4c8;
          margin-bottom: 12px;
          line-height: 1.1;
        }
        .co-adv-title em { font-style: italic; color: #D4A853; }

        .co-adv-desc {
          font-size: 15px;
          color: #7a6548;
          font-weight: 300;
          line-height: 1.7;
          margin-bottom: 22px;
        }

        .co-adv-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .co-adv-chip {
          background: #161007;
          border: 1px solid #2e2210;
          border-radius: 10px;
          padding: 16px 18px;
        }
        .co-adv-chip.highlight {
          border-color: #D4A85355;
          background: #201608;
        }

        .co-chip-label {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6a5540;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .co-chip-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px;
          font-weight: 300;
          color: #D4A853;
          letter-spacing: -0.01em;
        }
        .co-chip-val.muted { color: #5a4830; }

        /* ── PAYMENT METHODS ── */
        .co-section-label-plain {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #6a5540;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .co-methods {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 0;
        }

        .co-method {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1e1408;
          border: 1px solid #2e2210;
          border-radius: 10px;
          padding: 16px 18px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          text-align: left;
          font-family: 'Outfit', sans-serif;
        }

        .co-method:hover { border-color: #4a3418; background: #221608; }

        .co-method.active {
          border-color: #D4A853;
          background: #221808;
          box-shadow: 0 0 0 1px #D4A85322;
        }

        .co-method-icon {
          font-size: 22px;
          color: #8a7355;
          width: 28px;
          text-align: center;
          line-height: 1;
        }

        .co-method-name {
          display: block;
          font-size: 15px;
          font-weight: 500;
          color: #e0cfa8;
          margin-bottom: 3px;
        }

        .co-method-sub {
          display: block;
          font-size: 12px;
          color: #5a4830;
          font-weight: 300;
        }

        /* ── PAY BUTTON ── */
        .co-pay-btn {
          width: 100%;
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #D4A853;
          color: #14100a;
          border: none;
          border-radius: 8px;
          padding: 18px 28px;
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(212,168,83,0.25);
        }

        .co-pay-btn:hover:not(:disabled) {
          background: #e0b860;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(212,168,83,0.35);
        }

        .co-pay-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .co-pay-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .co-pay-btn.loading  { background: #a8884a; }

        .co-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #14100a44;
          border-top-color: #14100a;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .co-secure-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 12px;
          color: #5a4830;
          margin-top: 14px;
          font-weight: 300;
          letter-spacing: 0.02em;
        }

        @media (max-width: 960px) {
          .co-layout { grid-template-columns: 1fr; padding: 40px 24px; }
          .co-left { padding-right: 0; border-right: none; border-bottom: 1px solid #2e2210; padding-bottom: 48px; margin-bottom: 48px; }
          .co-right { padding-left: 0; }
          .co-nav { padding: 18px 24px; }
          .co-event-name { font-size: 38px; }
          .co-adv-title { font-size: 28px; }
        }
      `}</style>
    </div>
  );
}