import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Mock history — replace with real DB fetch
const MOCK_HISTORY = [
  {
    id: "EVT-2025-00847",
    txnId: "TXN8847291046",
    name: "asdfghj",
    type: "Concert",
    date: "15 Jun 2025",
    guests: 150,
    total: 77022,
    paid: 23107,
    balance: 53915,
    status: "advance",
    paidOn: "3 May 2025",
    method: "UPI · GPay",
    dueBy: "8 Jun 2025",
  },
  {
    id: "EVT-2025-00612",
    txnId: "TXN7712834092",
    name: "Gupta Anniversary",
    type: "Private Party",
    date: "20 Mar 2025",
    guests: 80,
    total: 184000,
    paid: 184000,
    balance: 0,
    status: "paid",
    paidOn: "5 Mar 2025",
    method: "Card · HDFC",
    dueBy: null,
  },
  {
    id: "EVT-2025-00441",
    txnId: "TXN6609821337",
    name: "Tech Summit 2025",
    type: "Corporate",
    date: "10 Feb 2025",
    guests: 500,
    total: 420000,
    paid: 420000,
    balance: 0,
    status: "paid",
    paidOn: "28 Jan 2025",
    method: "Net Banking",
    dueBy: null,
  },
  {
    id: "EVT-2024-00889",
    txnId: "TXN5512009874",
    name: "Verma Birthday Bash",
    type: "Birthday",
    date: "5 Jan 2025",
    guests: 60,
    total: 92000,
    paid: 46000,
    balance: 46000,
    status: "refunded",
    paidOn: "20 Dec 2024",
    method: "UPI · PhonePe",
    dueBy: null,
    refundNote: "50% refund — cancelled within 48hrs of booking",
  },
];

const STATUS_MAP = {
  paid: { label: "Fully paid", className: "s-paid" },
  advance: { label: "Advance paid", className: "s-advance" },
  refunded: { label: "50% refunded", className: "s-refunded" },
};

const STATS = {
  total: MOCK_HISTORY.reduce((s, e) => s + e.paid, 0),
  events: MOCK_HISTORY.length,
  pending: MOCK_HISTORY.reduce((s, e) => s + e.balance, 0),
};

export default function PaymentsHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  // If coming from success flow, show the success banner first
  const fromSuccess = location.state?.fromSuccess;
  const successData = location.state;

  const [showSuccess, setShowSuccess] = useState(!!fromSuccess);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(fromSuccess ? MOCK_HISTORY[0].id : null);

  const filtered = MOCK_HISTORY.filter(
    (e) => filter === "all" || e.status === filter
  );

  return (
    <div className="ph-page">
      {/* NAV */}
      <nav className="ph-nav">
        <button className="ph-back" onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Home
        </button>
        <span className="ph-nav-title">
          Payment <em>History</em>
        </span>
        <button className="ph-create-btn" onClick={() => navigate("/create-event")}>
          + New event
        </button>
      </nav>

      <div className="ph-container">
        {/* ── SUCCESS BANNER (appears when redirected after payment) ── */}
        {showSuccess && (
          <div className="ph-success-banner">
            <button className="ph-sb-close" onClick={() => setShowSuccess(false)}>×</button>
            <div className="ph-sb-check">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="ph-sb-content">
              <div className="ph-sb-title">
                Booking <em>confirmed!</em>
              </div>
              <div className="ph-sb-sub">
                Advance of ₹{successData?.advance?.toLocaleString("en-IN") || "23,107"} received · 
                Balance ₹{successData?.balance?.toLocaleString("en-IN") || "53,915"} due by {MOCK_HISTORY[0].dueBy}
              </div>
              <div className="ph-sb-ids">
                <span>Booking: <code>#{MOCK_HISTORY[0].id}</code></span>
                <span>Txn: <code>{MOCK_HISTORY[0].txnId}</code></span>
              </div>
            </div>
            <div className="ph-sb-next">
              <div className="ph-sb-step"><span>1</span> Confirmation email sent to your registered address</div>
              <div className="ph-sb-step"><span>2</span> Event manager will call within 24 hours</div>
              <div className="ph-sb-step"><span>3</span> Balance payment due by {MOCK_HISTORY[0].dueBy}</div>
              <div className="ph-sb-step"><span>4</span> Final headcount confirmation 3 days before event</div>
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        <div className="ph-stats">
          <div className="ph-stat">
            <div className="ph-stat-label">Total paid</div>
            <div className="ph-stat-val">₹{(STATS.total / 100000).toFixed(1)}L</div>
          </div>
          <div className="ph-stat-div" />
          <div className="ph-stat">
            <div className="ph-stat-label">Events booked</div>
            <div className="ph-stat-val">{STATS.events}</div>
          </div>
          <div className="ph-stat-div" />
          <div className="ph-stat">
            <div className="ph-stat-label">Balance pending</div>
            <div className="ph-stat-val pending">₹{(STATS.pending / 100000).toFixed(1)}L</div>
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="ph-filters">
          {["all", "paid", "advance", "refunded"].map((f) => (
            <button
              key={f}
              className={`ph-filter ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All transactions" :
               f === "paid" ? "Fully paid" :
               f === "advance" ? "Advance paid" : "Refunded"}
            </button>
          ))}
        </div>

        {/* ── HISTORY LIST ── */}
        <div className="ph-list">
          {filtered.length === 0 && (
            <div className="ph-empty-filter">No transactions match this filter.</div>
          )}
          {filtered.map((ev) => {
            const isOpen = expanded === ev.id;
            const s = STATUS_MAP[ev.status];
            return (
              <div
                key={ev.id}
                className={`ph-card ${isOpen ? "open" : ""}`}
              >
                <button
                  className="ph-card-header"
                  onClick={() => setExpanded(isOpen ? null : ev.id)}
                >
                  <div className="ph-card-left">
                    <div className="ph-card-type">{ev.type}</div>
                    <div className="ph-card-name">{ev.name}</div>
                    <div className="ph-card-meta">
                      {ev.date} · {ev.guests} guests
                    </div>
                  </div>
                  <div className="ph-card-right">
                    <div className="ph-card-total">₹{ev.total.toLocaleString("en-IN")}</div>
                    <span className={`ph-status ${s.className}`}>{s.label}</span>
                    <svg
                      className={`ph-chevron ${isOpen ? "up" : ""}`}
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="ph-card-body">
                    <div className="ph-detail-grid">
                      <div className="ph-detail-row">
                        <span className="ph-dl">Booking ID</span>
                        <span className="ph-dv mono">#{ev.id}</span>
                      </div>
                      <div className="ph-detail-row">
                        <span className="ph-dl">Transaction ID</span>
                        <span className="ph-dv mono">{ev.txnId}</span>
                      </div>
                      <div className="ph-detail-row">
                        <span className="ph-dl">Amount paid</span>
                        <span className="ph-dv gold">₹{ev.paid.toLocaleString("en-IN")}</span>
                      </div>
                      {ev.balance > 0 && (
                        <div className="ph-detail-row">
                          <span className="ph-dl">Balance due</span>
                          <span className="ph-dv warn">
                            ₹{ev.balance.toLocaleString("en-IN")}
                            {ev.dueBy && <span className="ph-due-by"> · by {ev.dueBy}</span>}
                          </span>
                        </div>
                      )}
                      <div className="ph-detail-row">
                        <span className="ph-dl">Paid on</span>
                        <span className="ph-dv">{ev.paidOn}</span>
                      </div>
                      <div className="ph-detail-row">
                        <span className="ph-dl">Payment method</span>
                        <span className="ph-dv">{ev.method}</span>
                      </div>
                    </div>

                    {ev.refundNote && (
                      <div className="ph-refund-note">{ev.refundNote}</div>
                    )}

                    {ev.balance > 0 && ev.status === "advance" && (
                      <button
                        className="ph-pay-balance-btn"
                        onClick={() => navigate("/payments/checkout", { state: { event: ev, payingBalance: true } })}
                      >
                        Pay balance · ₹{ev.balance.toLocaleString("en-IN")}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </button>
                    )}

                    <button className="ph-receipt-btn">
                      Download receipt
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* REFUND POLICY REMINDER */}
        <div className="ph-policy-reminder">
          <div className="ph-pr-title">Cancellation & refund policy</div>
          <div className="ph-pr-grid">
            <div className="ph-pr-item green">
              <span className="ph-pr-pct">100%</span>
              <span className="ph-pr-cond">7+ days before event</span>
            </div>
            <div className="ph-pr-item yellow">
              <span className="ph-pr-pct">50%</span>
              <span className="ph-pr-cond">Within 48 hrs of booking</span>
            </div>
            <div className="ph-pr-item orange">
              <span className="ph-pr-pct">25%</span>
              <span className="ph-pr-cond">1 day before event</span>
            </div>
            <div className="ph-pr-item red">
              <span className="ph-pr-pct">0%</span>
              <span className="ph-pr-cond">Day of event / no-show</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Outfit:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ph-page {
          min-height: 100vh;
          background: #1a1208;
          color: #c8b898;
          font-family: 'Outfit', sans-serif;
        }

        /* NAV */
        .ph-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 48px;
          border-bottom: 1px solid #2a1f0f;
          background: #161007;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .ph-back {
          display: flex;
          align-items: center;
          gap: 7px;
          background: none;
          border: none;
          color: #6b5c42;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: color 0.2s;
        }
        .ph-back:hover { color: #c8b898; }

        .ph-nav-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 300;
          color: #f0e4c8;
        }
        .ph-nav-title em { font-style: italic; color: #D4A853; }

        .ph-create-btn {
          background: none;
          border: 1px solid #3e2f18;
          border-radius: 6px;
          color: #C9A96E;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          padding: 7px 16px;
          cursor: pointer;
          letter-spacing: 0.04em;
          transition: border-color 0.2s, background 0.2s;
        }
        .ph-create-btn:hover { border-color: #C9A96E; background: #1e1509; }

        /* CONTAINER */
        .ph-container {
          max-width: 860px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        /* SUCCESS BANNER */
        .ph-success-banner {
          position: relative;
          background: #1c1a0d;
          border: 1px solid #C9A96E44;
          border-radius: 12px;
          padding: 24px 24px 24px 76px;
          margin-bottom: 40px;
          animation: fadeDown 0.5s ease;
        }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ph-sb-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #5a4b33;
          font-size: 20px;
          cursor: pointer;
          line-height: 1;
        }
        .ph-sb-close:hover { color: #c8b898; }

        .ph-sb-check {
          position: absolute;
          left: 24px;
          top: 24px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #233320;
          border: 1px solid #4a7c59;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4a7c59;
        }

        .ph-sb-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          font-weight: 300;
          color: #e8dcc8;
          margin-bottom: 6px;
        }
        .ph-sb-title em { font-style: italic; color: #C9A96E; }

        .ph-sb-sub {
          font-size: 13px;
          color: #6b5c42;
          font-weight: 300;
          margin-bottom: 12px;
        }

        .ph-sb-ids {
          display: flex;
          gap: 24px;
          font-size: 12px;
          color: #5a4b33;
          margin-bottom: 20px;
        }

        .ph-sb-ids code {
          font-family: 'Outfit', monospace;
          color: #C9A96E;
          font-size: 12px;
        }

        .ph-sb-next {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          border-top: 1px solid #2a1f0f;
          padding-top: 16px;
        }

        .ph-sb-step {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12px;
          color: #5a4b33;
          font-weight: 300;
          line-height: 1.4;
        }

        .ph-sb-step span {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #2a1f0f;
          border: 1px solid #3e2f18;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #C9A96E;
          flex-shrink: 0;
        }

        /* STATS */
        .ph-stats {
          display: flex;
          align-items: center;
          gap: 0;
          background: #1e1509;
          border: 1px solid #2a1f0f;
          border-radius: 10px;
          padding: 20px 32px;
          margin-bottom: 32px;
        }

        .ph-stat { flex: 1; text-align: center; }

        .ph-stat-label {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6a5540;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .ph-stat-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #f0e4c8;
        }
        .ph-stat-val.pending { color: #b09040; }

        .ph-stat-div {
          width: 1px;
          height: 40px;
          background: #2a1f0f;
          flex-shrink: 0;
        }

        /* FILTERS */
        .ph-filters {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .ph-filter {
          background: none;
          border: 1px solid #2e2210;
          border-radius: 20px;
          color: #6a5540;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          padding: 8px 20px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: all 0.2s;
        }
        .ph-filter:hover { border-color: #3e2f18; color: #e0cfa8; }
        .ph-filter.active {
          background: #1e1408;
          border-color: #D4A85355;
          color: #D4A853;
        }

        /* HISTORY CARDS */
        .ph-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 40px; }

        .ph-empty-filter {
          text-align: center;
          padding: 40px;
          color: #4a3c26;
          font-size: 14px;
          font-weight: 300;
        }

        .ph-card {
          background: #1e1509;
          border: 1px solid #2a1f0f;
          border-radius: 10px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .ph-card.open { border-color: #3e2f18; }
        .ph-card:hover { border-color: #3e2f18; }

        .ph-card-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: 'Outfit', sans-serif;
          gap: 16px;
        }

        .ph-card-left { flex: 1; min-width: 0; }

        .ph-card-type {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #5a4b33;
          margin-bottom: 5px;
        }

        .ph-card-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 300;
          color: #f0e4c8;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ph-card-meta {
          font-size: 14px;
          color: #6a5540;
          font-weight: 300;
        }

        .ph-card-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .ph-card-total {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 300;
          color: #e0cfa8;
        }

        .ph-chevron {
          color: #4a3c26;
          transition: transform 0.25s;
        }
        .ph-chevron.up { transform: rotate(180deg); }

        /* STATUS BADGES */
        .ph-status {
          font-size: 10px;
          letter-spacing: 0.06em;
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 500;
          text-transform: uppercase;
        }
        .s-paid { background: #1a2e1c; color: #4a7c59; border: 1px solid #2a4a30; }
        .s-advance { background: #2a2212; color: #8a7340; border: 1px solid #3e3218; }
        .s-refunded { background: #2a1414; color: #7c3a3a; border: 1px solid #3e2020; }

        /* CARD BODY */
        .ph-card-body {
          border-top: 1px solid #2a1f0f;
          padding: 20px 20px 20px;
          animation: expandIn 0.2s ease;
        }

        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ph-detail-grid { display: flex; flex-direction: column; gap: 0; margin-bottom: 16px; }

        .ph-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 0;
          border-bottom: 1px solid #261c0e;
          font-size: 15px;
        }
        .ph-detail-row:last-child { border: none; }

        .ph-dl { color: #4a3c26; font-weight: 300; }
        .ph-dv { color: #c8b898; font-weight: 400; }
        .ph-dv.mono { font-family: 'Outfit', monospace; font-size: 12px; color: #8a7340; }
        .ph-dv.gold { color: #C9A96E; }
        .ph-dv.warn { color: #8a7340; }
        .ph-due-by { font-size: 11px; color: #6b5c42; }

        .ph-refund-note {
          background: #2a1414;
          border: 1px solid #3e2020;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 12px;
          color: #7c3a3a;
          margin-bottom: 14px;
          font-weight: 300;
        }

        .ph-pay-balance-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #C9A96E;
          color: #1a1208;
          border: none;
          border-radius: 6px;
          padding: 11px 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 10px;
          transition: background 0.2s;
          letter-spacing: 0.02em;
        }
        .ph-pay-balance-btn:hover { background: #d4b87a; }

        .ph-receipt-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid #2a1f0f;
          border-radius: 6px;
          padding: 9px 18px;
          color: #6b5c42;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          cursor: pointer;
          letter-spacing: 0.04em;
          transition: all 0.2s;
        }
        .ph-receipt-btn:hover { border-color: #3e2f18; color: #c8b898; }

        /* REFUND POLICY REMINDER */
        .ph-policy-reminder {
          background: #1e1509;
          border: 1px solid #2a1f0f;
          border-radius: 10px;
          padding: 22px 24px;
        }

        .ph-pr-title {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5a4b33;
          margin-bottom: 16px;
        }

        .ph-pr-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .ph-pr-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 14px 10px;
          border-radius: 8px;
          gap: 6px;
        }
        .ph-pr-item.green { background: #1a2e1c; border: 1px solid #2a4a30; }
        .ph-pr-item.yellow { background: #2a2212; border: 1px solid #3e3218; }
        .ph-pr-item.orange { background: #2a1c10; border: 1px solid #3e2a18; }
        .ph-pr-item.red { background: #2a1414; border: 1px solid #3e2020; }

        .ph-pr-pct {
          font-family: 'Cormorant Garamond', serif;
          font-size: 34px;
          font-weight: 300;
          color: #e0cfa8;
        }

        .ph-pr-cond {
          font-size: 13px;
          color: #6a5540;
          font-weight: 300;
          line-height: 1.4;
        }

        @media (max-width: 640px) {
          .ph-nav { padding: 14px 20px; }
          .ph-container { padding: 32px 16px 60px; }
          .ph-stats { padding: 16px 20px; }
          .ph-pr-grid { grid-template-columns: 1fr 1fr; }
          .ph-sb-next { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}