import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import { API_URL } from '../config/api';

const API = API_URL;

const STATUS_MAP = {
  paid:     { label: "Fully paid",    className: "s-paid" },
  advance_paid: { label: "Advance paid", className: "s-advance" },
  pending:  { label: "Pending",       className: "s-advance" },
  refunded: { label: "Refunded",      className: "s-refunded" },
};

function parseEventDetails(message) {
  if (!message) return {};
  const result = {};
  message.split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) result[line.slice(0,idx).trim().toLowerCase()] = line.slice(idx+1).trim();
  });
  return result;
}

function generateReceipt(payment) {
  const amtPaid = Math.round(payment.amount / 100);
  const eventDate = payment.event_date
    ? new Date(payment.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBD';
  const paidOn = new Date(payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const details = parseEventDetails(payment.message);
  const paymentType = payment.payment_type ? payment.payment_type[0].toUpperCase() + payment.payment_type.slice(1) : 'Advance';
  const paymentMethod = payment.payment_method === 'bank_transfer' ? 'Bank Transfer' : payment.payment_method === 'cash' ? 'Cash' : 'Razorpay (Online)';

  const rows = [
    ['Booking ID', `BKG-${payment.booking_id}`],
    ['Event', details['event'] || payment.event_type || 'Event'],
    ['Client name', payment.client_name || 'N/A'],
    ['Payment type', paymentType],
    ['Payment method', paymentMethod],
    ['Razorpay Order', payment.razorpay_order_id || 'N/A'],
    ['Payment ID', payment.razorpay_payment_id || 'Pending / Offline'],
    ['Amount paid', `Rs. ${amtPaid.toLocaleString('en-IN')}`],
    ['Paid on', paidOn],
    ['Event date', eventDate],
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt - BKG-${payment.booking_id}</title>
      <style>
        body { font-family: Georgia, serif; background: #fff; color: #1a1208; padding: 48px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 22px; font-weight: 400; border-bottom: 2px solid #C9A96E; padding-bottom: 16px; margin-bottom: 24px; }
        h1 em { font-style: italic; color: #a1793c; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px 0; border-bottom: 1px solid #e5ddc8; font-size: 14px; }
        td:first-child { color: #6a5540; }
        td:last-child { text-align: right; font-weight: 500; }
        .total-row td { font-size: 17px; font-weight: 700; color: #a1793c; border-bottom: none; padding-top: 16px; }
        .footer { margin-top: 32px; font-size: 12px; color: #8a7355; }
        @media print { body { padding: 24px; } }
      </style>
    </head>
    <body>
      <h1>Celeste <em>Payment Receipt</em></h1>
      <table>
        ${rows.map(([label, val]) => `
          <tr class="${label === 'Amount paid' ? 'total-row' : ''}">
            <td>${label}</td>
            <td>${val}</td>
          </tr>`).join('')}
      </table>
      <div class="footer">Generated on ${new Date().toLocaleString('en-IN')}. This is a system-generated receipt.</div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;

  const receiptWindow = window.open('', '_blank');
  if (receiptWindow) {
    receiptWindow.document.write(html);
    receiptWindow.document.close();
  } else {
    alert('Please allow pop-ups to download your receipt.');
  }
}

export default function PaymentsHistory() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const fromSuccess = location.state?.fromSuccess;
  const successData = location.state;

  const [payments,    setPayments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showSuccess, setShowSuccess] = useState(!!fromSuccess);
  const [filter,      setFilter]      = useState("all");
  const [expanded,    setExpanded]    = useState(null);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    fetch(`${API}/payments/history`, { headers: { Authorization: `Bearer ${localStorage.getItem('celeste_token')}` } })
      .then(r => r.json())
      .then(data => {
        setPayments(Array.isArray(data) ? data : []);
        setLoading(false);
        if (fromSuccess && data.length > 0) setExpanded(data[0].id);
      })
      .catch(() => setLoading(false));
  }, [user, fromSuccess]);

  const filtered = payments.filter(p => filter === 'all' || p.status === filter || (filter === 'advance' && p.status === 'advance_paid'));

  const totalPaid    = payments.reduce((s, p) => s + (p.amount / 100), 0);
  const totalEvents  = new Set(payments.map(p => p.booking_id)).size;

  return (
    <div className="ph-page">
      <nav className="ph-nav">
        <button className="ph-back" onClick={() => navigate('/')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Home
        </button>
        <span className="ph-nav-title">Payment <em>History</em></span>
        <button className="ph-create-btn" onClick={() => navigate('/create-event')}>+ New event</button>
      </nav>

      <div className="ph-container">

        {/* Success banner */}
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
                {successData?.paymentType === 'balance'
                  ? <>Balance <em>settled!</em></>
                  : successData?.paymentType === 'addon'
                    ? <>Charge <em>paid!</em></>
                    : <>Booking <em>confirmed!</em></>}
              </div>
              <div className="ph-sb-sub">
                {successData?.paymentType === 'balance' || successData?.paymentType === 'addon' ? (
                  <>₹{successData?.paidAmount?.toLocaleString('en-IN')} paid successfully</>
                ) : (
                  <>
                    Advance of ₹{successData?.advance?.toLocaleString('en-IN')} received ·
                    Balance ₹{successData?.balance?.toLocaleString('en-IN')} due before event
                  </>
                )}
              </div>
              {successData?.paymentId && (
                <div className="ph-sb-ids">
                  <span>Payment ID: <code>{successData.paymentId}</code></span>
                </div>
              )}
              {(!successData?.paymentType || successData?.paymentType === 'advance') && (
                <div className="ph-sb-next">
                  <div className="ph-sb-step"><span>1</span> Confirmation email sent to your address</div>
                  <div className="ph-sb-step"><span>2</span> Event manager will call within 24 hours</div>
                  <div className="ph-sb-step"><span>3</span> Balance payment due 7 days before event</div>
                  <div className="ph-sb-step"><span>4</span> Final headcount confirmation 3 days before</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="ph-stats">
          <div className="ph-stat">
            <div className="ph-stat-label">Total paid</div>
            <div className="ph-stat-val">
              {totalPaid >= 100000
                ? `₹${(totalPaid/100000).toFixed(1)}L`
                : `₹${totalPaid.toLocaleString('en-IN')}`}
            </div>
          </div>
          <div className="ph-stat-div" />
          <div className="ph-stat">
            <div className="ph-stat-label">Events booked</div>
            <div className="ph-stat-val">{totalEvents}</div>
          </div>
          <div className="ph-stat-div" />
          <div className="ph-stat">
            <div className="ph-stat-label">Transactions</div>
            <div className="ph-stat-val">{payments.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="ph-filters">
          {[['all','All transactions'],['paid','Fully paid'],['advance','Advance paid'],['refunded','Refunded']].map(([f, label]) => (
            <button key={f} className={`ph-filter ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{label}</button>
          ))}
        </div>

        {/* List */}
        <div className="ph-list">
          {loading ? (
            <div className="ph-empty-filter">Loading transactions…</div>
          ) : filtered.length === 0 ? (
            <div className="ph-empty-filter">
              {payments.length === 0 ? 'No payments yet. Complete a booking to see transactions here.' : 'No transactions match this filter.'}
            </div>
          ) : (
            filtered.map(payment => {
              const isOpen   = expanded === payment.id;
              const s        = STATUS_MAP[payment.status] || STATUS_MAP.pending;
              const details  = parseEventDetails(payment.message);
              const amtPaid  = Math.round(payment.amount / 100);
              const eventDate = payment.event_date
                ? new Date(payment.event_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
                : 'TBD';
              const paidOn = new Date(payment.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

              return (
                <div key={payment.id} className={`ph-card ${isOpen ? 'open' : ''}`}>
                  <button className="ph-card-header" onClick={() => setExpanded(isOpen ? null : payment.id)}>
                    <div className="ph-card-left">
                      <div className="ph-card-type">
                        {payment.event_type}
                        {payment.payment_type && (
                          <span style={{ marginLeft: 8, color: '#C9A96E', textTransform: 'capitalize' }}>
                            · {payment.payment_type}
                          </span>
                        )}
                        {payment.payment_method && payment.payment_method !== 'razorpay' && (
                          <span style={{ marginLeft: 8, color: '#6a5540', textTransform: 'capitalize' }}>
                            ({payment.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash'})
                          </span>
                        )}
                      </div>
                      <div className="ph-card-name">{details['event'] || payment.event_type || 'Event'}</div>
                      <div className="ph-card-meta">{eventDate} · {payment.client_name}</div>
                    </div>
                    <div className="ph-card-right">
                      <div className="ph-card-total">₹{amtPaid.toLocaleString('en-IN')}</div>
                      <span className={`ph-status ${s.className}`}>{s.label}</span>
                      <svg className={`ph-chevron ${isOpen ? 'up' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="ph-card-body">
                      <div className="ph-detail-grid">
                        {[
                          ['Booking ID',      `BKG-${payment.booking_id}`],
                          ['Payment type',    payment.payment_type ? payment.payment_type[0].toUpperCase() + payment.payment_type.slice(1) : 'Advance'],
                          ['Payment method',  payment.payment_method === 'bank_transfer' ? 'Bank Transfer' : payment.payment_method === 'cash' ? 'Cash' : 'Razorpay (Online)'],
                          ['Razorpay Order',  payment.razorpay_order_id   || 'N/A'],
                          ['Payment ID',      payment.razorpay_payment_id || 'Pending / Offline'],
                          ['Amount paid',     `₹${amtPaid.toLocaleString('en-IN')}`],
                          ['Paid on',         paidOn],
                          ['Event date',      eventDate],
                        ].map(([label, val]) => (
                          <div key={label} className="ph-detail-row">
                            <span className="ph-dl">{label}</span>
                            <span className={`ph-dv ${label.includes('ID') || label.includes('Order') ? 'mono' : label === 'Amount paid' ? 'gold' : ''}`}>{val}</span>
                          </div>
                        ))}
                      </div>
                      <button className="ph-receipt-btn" onClick={() => generateReceipt(payment)}>
                        Download receipt
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Refund policy */}
        <div className="ph-policy-reminder">
          <div className="ph-pr-title">Cancellation & refund policy</div>
          <div className="ph-pr-grid">
            {[['green','100%','7+ days before event'],['yellow','50%','Within 48 hrs of booking'],['orange','25%','1 day before event'],['red','0%','Day of event / no-show']].map(([cls,pct,cond])=>(
              <div key={pct} className={`ph-pr-item ${cls}`}>
                <span className="ph-pr-pct">{pct}</span>
                <span className="ph-pr-cond">{cond}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Outfit:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .ph-page{min-height:100vh;background:#1a1208;color:#c8b898;font-family:'Outfit',sans-serif}
        .ph-nav{display:flex;align-items:center;justify-content:space-between;padding:18px 48px;border-bottom:1px solid #2a1f0f;background:#161007;position:sticky;top:0;z-index:10;gap:12px;flex-wrap:wrap}
        .ph-back{display:flex;align-items:center;gap:7px;background:none;border:none;color:#6b5c42;font-family:'Outfit',sans-serif;font-size:13px;cursor:pointer;transition:color 0.2s}
        .ph-back:hover{color:#c8b898}
        .ph-nav-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#f0e4c8}
        .ph-nav-title em{font-style:italic;color:#D4A853}
        .ph-create-btn{background:none;border:1px solid #3e2f18;border-radius:6px;color:#C9A96E;font-family:'Outfit',sans-serif;font-size:12px;padding:7px 16px;cursor:pointer;transition:border-color 0.2s,background 0.2s}
        .ph-create-btn:hover{border-color:#C9A96E;background:#1e1509}
        .ph-container{max-width:860px;margin:0 auto;padding:48px 24px 80px}
        .ph-success-banner{position:relative;background:#1c1a0d;border:1px solid #C9A96E44;border-radius:12px;padding:24px 24px 24px 76px;margin-bottom:40px;animation:fadeDown 0.5s ease}
        @keyframes fadeDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        .ph-sb-close{position:absolute;top:16px;right:16px;background:none;border:none;color:#5a4b33;font-size:20px;cursor:pointer}
        .ph-sb-close:hover{color:#c8b898}
        .ph-sb-check{position:absolute;left:24px;top:24px;width:36px;height:36px;border-radius:50%;background:#233320;border:1px solid #4a7c59;display:flex;align-items:center;justify-content:center;color:#4a7c59}
        .ph-sb-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:300;color:#e8dcc8;margin-bottom:6px}
        .ph-sb-title em{font-style:italic;color:#C9A96E}
        .ph-sb-sub{font-size:13px;color:#6b5c42;font-weight:300;margin-bottom:12px}
        .ph-sb-ids{display:flex;gap:24px;font-size:12px;color:#5a4b33;margin-bottom:20px}
        .ph-sb-ids code{font-family:'Outfit',monospace;color:#C9A96E;font-size:12px}
        .ph-sb-next{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid #2a1f0f;padding-top:16px}
        .ph-sb-step{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:#5a4b33;font-weight:300;line-height:1.4}
        .ph-sb-step span{width:18px;height:18px;border-radius:50%;background:#2a1f0f;border:1px solid #3e2f18;display:flex;align-items:center;justify-content:center;font-size:10px;color:#C9A96E;flex-shrink:0}
        .ph-stats{display:flex;align-items:center;background:#1e1509;border:1px solid #2a1f0f;border-radius:10px;padding:20px 32px;margin-bottom:32px}
        .ph-stat{flex:1;text-align:center}
        .ph-stat-label{font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#6a5540;margin-bottom:10px;font-weight:500}
        .ph-stat-val{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:300;color:#f0e4c8}
        .ph-stat-div{width:1px;height:40px;background:#2a1f0f;flex-shrink:0}
        .ph-filters{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
        .ph-filter{background:none;border:1px solid #2e2210;border-radius:20px;color:#6a5540;font-family:'Outfit',sans-serif;font-size:14px;padding:8px 20px;cursor:pointer;transition:all 0.2s}
        .ph-filter:hover{border-color:#3e2f18;color:#e0cfa8}
        .ph-filter.active{background:#1e1408;border-color:#D4A85355;color:#D4A853}
        .ph-list{display:flex;flex-direction:column;gap:8px;margin-bottom:40px}
        .ph-empty-filter{text-align:center;padding:40px;color:#4a3c26;font-size:14px;font-weight:300}
        .ph-card{background:#1e1509;border:1px solid #2a1f0f;border-radius:10px;overflow:hidden;transition:border-color 0.2s}
        .ph-card.open,.ph-card:hover{border-color:#3e2f18}
        .ph-card-header{width:100%;display:flex;justify-content:space-between;align-items:center;padding:18px 20px;background:none;border:none;cursor:pointer;text-align:left;font-family:'Outfit',sans-serif;gap:16px}
        .ph-card-left{flex:1;min-width:0}
        .ph-card-type{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#5a4b33;margin-bottom:5px}
        .ph-card-name{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:300;color:#f0e4c8;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ph-card-meta{font-size:14px;color:#6a5540;font-weight:300}
        .ph-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .ph-card-total{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:300;color:#e0cfa8}
        .ph-chevron{color:#4a3c26;transition:transform 0.25s}
        .ph-chevron.up{transform:rotate(180deg)}
        .ph-status{font-size:10px;letter-spacing:0.06em;padding:3px 10px;border-radius:20px;font-weight:500;text-transform:uppercase}
        .s-paid{background:#1a2e1c;color:#4a7c59;border:1px solid #2a4a30}
        .s-advance{background:#2a2212;color:#8a7340;border:1px solid #3e3218}
        .s-refunded{background:#2a1414;color:#7c3a3a;border:1px solid #3e2020}
        .ph-card-body{border-top:1px solid #2a1f0f;padding:20px;animation:expandIn 0.2s ease}
        @keyframes expandIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .ph-detail-grid{display:flex;flex-direction:column;gap:0;margin-bottom:16px}
        .ph-detail-row{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid #261c0e;font-size:15px}
        .ph-detail-row:last-child{border:none}
        .ph-dl{color:#4a3c26;font-weight:300}
        .ph-dv{color:#c8b898;text-align:right;word-break:break-word}
        .ph-dv.mono{font-family:'Outfit',monospace;font-size:12px;color:#8a7340}
        .ph-dv.gold{color:#C9A96E}
        .ph-receipt-btn{display:flex;align-items:center;gap:8px;background:none;border:1px solid #2a1f0f;border-radius:6px;padding:9px 18px;color:#6b5c42;font-family:'Outfit',sans-serif;font-size:12px;cursor:pointer;transition:all 0.2s}
        .ph-receipt-btn:hover{border-color:#3e2f18;color:#c8b898}
        .ph-policy-reminder{background:#1e1509;border:1px solid #2a1f0f;border-radius:10px;padding:22px 24px}
        .ph-pr-title{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#5a4b33;margin-bottom:16px}
        .ph-pr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .ph-pr-item{display:flex;flex-direction:column;align-items:center;text-align:center;padding:14px 10px;border-radius:8px;gap:6px}
        .ph-pr-item.green{background:#1a2e1c;border:1px solid #2a4a30}
        .ph-pr-item.yellow{background:#2a2212;border:1px solid #3e3218}
        .ph-pr-item.orange{background:#2a1c10;border:1px solid #3e2a18}
        .ph-pr-item.red{background:#2a1414;border:1px solid #3e2020}
        .ph-pr-pct{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:300;color:#e0cfa8}
        .ph-pr-cond{font-size:13px;color:#6a5540;font-weight:300;line-height:1.4}
        @media(max-width:640px){
          .ph-nav{padding:14px 20px}
          .ph-nav-title{font-size:22px;order:3;flex-basis:100%;text-align:center}
          .ph-container{padding:28px 14px 60px}
          .ph-stats{padding:16px 14px}
          .ph-stat-val{font-size:26px}
          .ph-stat-label{font-size:10px}
          .ph-success-banner{padding:20px 16px 20px 64px}
          .ph-sb-check{left:16px;top:20px;width:30px;height:30px}
          .ph-sb-title{font-size:20px}
          .ph-sb-ids{flex-direction:column;gap:6px}
          .ph-card-header{padding:14px 16px;gap:10px}
          .ph-card-name{font-size:20px}
          .ph-card-total{font-size:20px}
          .ph-card-right{gap:4px}
          .ph-detail-row{flex-wrap:wrap;gap:2px}
          .ph-pr-grid{grid-template-columns:1fr 1fr}
          .ph-sb-next{grid-template-columns:1fr}
        }
        @media(max-width:420px){
          .ph-stats{flex-wrap:wrap;gap:16px}
          .ph-stat{flex:1 1 40%}
          .ph-stat-div{display:none}
          .ph-pr-grid{grid-template-columns:1fr}
          .ph-filters{gap:6px}
          .ph-filter{padding:7px 14px;font-size:13px}
        }
      `}</style>
    </div>
  );
}
