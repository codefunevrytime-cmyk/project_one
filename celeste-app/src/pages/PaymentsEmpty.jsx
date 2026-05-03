import { useNavigate } from "react-router-dom";

export default function PaymentsEmpty() {
  const navigate = useNavigate();

  return (
    <div className="payments-empty-page">
      <div className="pe-inner">
        <div className="pe-icon-wrap">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="12" width="40" height="28" rx="4" stroke="#8B7355" strokeWidth="1.5"/>
            <path d="M4 20h40" stroke="#8B7355" strokeWidth="1.5"/>
            <circle cx="14" cy="30" r="3" stroke="#C9A96E" strokeWidth="1.2"/>
            <path d="M22 28h12M22 32h8" stroke="#8B7355" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M16 8l4-4 4 4" stroke="#8B7355" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 4v8" stroke="#8B7355" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="pe-title">
          No <em>transactions</em> yet
        </h1>
        <p className="pe-sub">
          Once you create an event and initiate a payment, your billing history and upcoming dues will appear here.
        </p>

        <div className="pe-divider">
          <span>what you'll see here</span>
        </div>

        <div className="pe-features">
          <div className="pe-feature">
            <div className="pe-feat-dot gold" />
            <div>
              <div className="pe-feat-title">Advance & balance tracking</div>
              <div className="pe-feat-desc">See what you've paid and what's due with exact dates</div>
            </div>
          </div>
          <div className="pe-feature">
            <div className="pe-feat-dot" />
            <div>
              <div className="pe-feat-title">Refund policy reminders</div>
              <div className="pe-feat-desc">Full, 50%, or 25% refund windows clearly shown per event</div>
            </div>
          </div>
          <div className="pe-feature">
            <div className="pe-feat-dot" />
            <div>
              <div className="pe-feat-title">Transaction history</div>
              <div className="pe-feat-desc">All past payments, receipts, and refunds in one place</div>
            </div>
          </div>
        </div>

        <button className="pe-cta" onClick={() => navigate("/create-event")}>
          Create your first event
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Outfit:wght@300;400;500&display=swap');

        .payments-empty-page {
          min-height: 100vh;
          background: #1a1208;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          font-family: 'Outfit', sans-serif;
        }

        .pe-inner {
          max-width: 480px;
          width: 100%;
          text-align: center;
          animation: fadeUp 0.6s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pe-icon-wrap {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 1px solid #3a2e1a;
          background: #211a0d;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
        }

        .pe-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 56px;
          font-weight: 300;
          color: #f0e4c8;
          line-height: 1.05;
          margin-bottom: 18px;
          letter-spacing: -0.02em;
        }

        .pe-title em {
          font-style: italic;
          color: #D4A853;
        }

        .pe-sub {
          font-size: 17px;
          color: #8a7355;
          line-height: 1.75;
          margin-bottom: 40px;
          font-weight: 300;
        }

        .pe-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
        }

        .pe-divider::before,
        .pe-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #2e2214;
        }

        .pe-divider span {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5a4b33;
        }

        .pe-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          margin-bottom: 40px;
        }

        .pe-feature {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 18px;
          border: 1px solid #2a1f0f;
          border-radius: 8px;
          background: #1e1509;
        }

        .pe-feat-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4a3c26;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .pe-feat-dot.gold {
          background: #C9A96E;
        }

        .pe-feat-title {
          font-size: 16px;
          font-weight: 500;
          color: #e0cfa8;
          margin-bottom: 4px;
        }

        .pe-feat-desc {
          font-size: 12px;
          color: #5a4b33;
          font-weight: 300;
          line-height: 1.5;
        }

        .pe-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #C9A96E;
          color: #1a1208;
          border: none;
          border-radius: 6px;
          padding: 14px 28px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }

        .pe-cta:hover {
          background: #d4b87a;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
