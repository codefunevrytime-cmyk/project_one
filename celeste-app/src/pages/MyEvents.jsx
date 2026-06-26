import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const API = "http://localhost:5000/api";

const STATUS_CONFIG = {
  new:                { label: "Soon to be Reviewed",      color: "#60a5fa", bg: "rgba(96,165,250,0.08)",   border: "rgba(96,165,250,0.25)",   glow: "rgba(96,165,250,0.5)",   pulse: "pulseSlow", duration: "2.4s" },
  contacted:          { label: "You'll be Contacted Soon!", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  glow: "rgba(245,158,11,0.5)",  pulse: "pulseMed",  duration: "1.8s" },
  payment_requested:  { label: "Payment Requested!",       color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)", glow: "rgba(167,139,250,0.5)", pulse: "pulseMed",  duration: "1.6s" },
  confirmed:          { label: "Confirmed!",               color: "#6fcf97", bg: "rgba(111,207,151,0.08)", border: "rgba(111,207,151,0.25)", glow: "rgba(111,207,151,0.6)", pulse: "pulseFast", duration: "1.2s" },
  cancelled:          { label: "Cancelled",                color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", glow: "rgba(248,113,113,0.5)", pulse: "pulseSlow", duration: "2.4s" },
};

function isPast(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return d < t;
}

function parseEventDetails(message) {
  if (!message) return {};
  const result = {};
  message.split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) result[line.slice(0,idx).trim().toLowerCase()] = line.slice(idx+1).trim();
  });
  return result;
}

function extractBudget(message) {
  if (!message) return 0;
  const match = message.match(/₹([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g,''), 10) : 0;
}

function GlowDot({ config }) {
  return (
    <>
      <style>{`@keyframes ${config.pulse}{0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 0 0 ${config.glow}}50%{opacity:0.7;transform:scale(0.88);box-shadow:0 0 0 5px transparent}}`}</style>
      <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:config.color, marginRight:8, flexShrink:0, animation:`${config.pulse} ${config.duration} ease-in-out infinite` }} />
    </>
  );
}

function EventTypeIcon({ type }) {
  const icons = { Wedding:'💍', Birthday:'🎂', Corporate:'💼', Concert:'🎵', Festival:'🎊', Sports:'🏆', Outdoor:'🌿', Expo:'🏛', Cultural:'🎭', Charity:'❤️', Food:'🍽', Other:'📅' };
  return <span style={{ fontSize:48, opacity:0.6 }}>{icons[type]||'📅'}</span>;
}

// ── Cancel Popup ──────────────────────────────────────────────────────────────
function CancelPopup({ booking, onConfirm, onClose, cancelling }) {
  const now         = new Date();
  const createdAt   = new Date(booking.created_at);
  const hoursSince  = (now - createdAt) / (1000 * 60 * 60);
  const eventDate   = booking.event_date ? new Date(booking.event_date) : null;
  const daysToEvent = eventDate ? (eventDate - now) / (1000 * 60 * 60 * 24) : 999;
  const hasPaid     = booking.payment_status === 'advance_paid';

  let refundPct  = 0;
  let refundNote = 'No refund applicable.';
  let refundColor = '#b91c1c';

  if (daysToEvent > 7)       { refundPct = 100; refundNote = '100% refund — event is more than 7 days away.'; refundColor = '#15803d'; }
  else if (hoursSince <= 48) { refundPct = 50;  refundNote = '50% refund — cancelled within 48 hours of booking.'; refundColor = '#92400e'; }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#1e1a14', border:'0.5px solid rgba(200,175,120,0.2)', borderRadius:16, padding:32, maxWidth:420, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(248,113,113,0.12)', border:'0.5px solid rgba(248,113,113,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:500, color:'#e8dcc8' }}>Cancel Booking</div>
            <div style={{ fontSize:11, color:'rgba(200,175,120,0.4)' }}>{booking.event_type} · {booking.event_date ? new Date(booking.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : 'TBD'}</div>
          </div>
        </div>

        {/* Refund Policy */}
        <div style={{ background:'rgba(200,175,120,0.04)', border:'0.5px solid rgba(200,175,120,0.1)', borderRadius:10, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,175,120,0.4)', marginBottom:12 }}>Cancellation & Refund Policy</div>
          {[
            { color:'#6fcf97', bold:'100% refund', rest:'— cancelled more than 7 days before the event', active: daysToEvent > 7 },
            { color:'#f59e0b', bold:'50% refund',  rest:'— cancelled within 48 hours of booking',       active: hoursSince <= 48 && daysToEvent <= 7 },
            { color:'#f87171', bold:'No refund',   rest:'— cancelled after 48 hours and within 7 days', active: hoursSince > 48 && daysToEvent <= 7 },
          ].map(({ color, bold, rest, active }) => (
            <div key={bold} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:'0.5px solid rgba(200,175,120,0.06)', opacity: active ? 1 : 0.4 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0, marginTop:4 }} />
              <div style={{ fontSize:12, color:'rgba(200,175,120,0.8)', lineHeight:1.5 }}>
                <strong style={{ color:'#e8dcc8' }}>{bold}</strong> {rest}
                {active && <span style={{ marginLeft:6, fontSize:10, background:'rgba(200,175,120,0.1)', color:'#c8af78', padding:'2px 8px', borderRadius:10 }}>← applies to you</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Refund summary */}
        {hasPaid ? (
          <div style={{ background: refundPct > 0 ? 'rgba(111,207,151,0.08)' : 'rgba(248,113,113,0.08)', border: `0.5px solid ${refundPct > 0 ? 'rgba(111,207,151,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius:8, padding:'12px 14px', marginBottom:20 }}>
            <div style={{ fontSize:12, color: refundPct > 0 ? '#6fcf97' : '#f87171', fontWeight:500 }}>
              {refundPct > 0
                ? `You'll receive a ${refundPct}% refund on your advance payment.`
                : 'No refund applicable for this cancellation.'}
            </div>
          </div>
        ) : (
          <div style={{ background:'rgba(200,175,120,0.04)', border:'0.5px solid rgba(200,175,120,0.1)', borderRadius:8, padding:'12px 14px', marginBottom:20 }}>
            <div style={{ fontSize:12, color:'rgba(200,175,120,0.6)' }}>No advance payment was made — nothing to refund.</div>
          </div>
        )}

        <div style={{ fontSize:12, color:'rgba(200,175,120,0.4)', marginBottom:24, lineHeight:1.6 }}>
          This action cannot be undone. The booking will be permanently cancelled.
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} disabled={cancelling} style={{ flex:1, padding:'11px 0', background:'none', border:'0.5px solid rgba(200,175,120,0.2)', borderRadius:8, color:'rgba(200,175,120,0.6)', fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
            Keep Booking
          </button>
          <button onClick={onConfirm} disabled={cancelling} style={{ flex:1, padding:'11px 0', background:'rgba(248,113,113,0.15)', border:'0.5px solid rgba(248,113,113,0.35)', borderRadius:8, color:'#f87171', fontSize:13, fontWeight:500, cursor:cancelling?'not-allowed':'pointer', fontFamily:'inherit', transition:'all 0.2s', opacity:cancelling?0.6:1 }}>
            {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ booking, navigate, onCancel }) {
  const details    = parseEventDetails(booking.message);
  const isPaymentRequested = booking.payment_requested === true || booking.payment_requested === 'true';
  const cfgKey     = isPaymentRequested && booking.payment_status !== 'advance_paid' && booking.status !== 'cancelled'
    ? 'payment_requested'
    : booking.status;
  const cfg        = STATUS_CONFIG[cfgKey] || STATUS_CONFIG.new;
  const budget     = extractBudget(booking.message);
  const advance    = budget > 0 ? Math.round(budget * 0.3) : 0;
  const isCancelled = booking.status === 'cancelled';

  const eventDate    = booking.event_date ? new Date(booking.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : 'Date TBD';
  const receivedDate = new Date(booking.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});

  const handlePay = () => {
    navigate('/payments/checkout', { state: { event: {
      id: `BKG-${booking.id}`, bookingId: booking.id,
      name:  details['event'] || booking.event_type,
      type:  booking.event_type, venue: details['location'] || '',
      guests: parseInt(details['capacity']) || 0,
      date:  booking.event_date ? new Date(booking.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : 'TBD',
      time:  details['time'] || '18:00',
      breakdown: [{ label:'Estimated Event Cost', sub:'Based on your selections', amount: budget }],
      gst: 0.18, budgetTotal: budget, advanceAmount: advance,
    }}});
  };

  return (
    <div style={{ display:'flex', background: isCancelled ? '#1a1614' : '#1e1a14', border:`0.5px solid ${cfg.border}`, borderRadius:14, overflow:'hidden', marginBottom:16, opacity: isCancelled ? 0.7 : 1 }}>
      <div style={{ width:4, background:cfg.color, flexShrink:0, opacity:0.7 }} />

      {/* Left image or icon */}
      <div style={{ width:200, minHeight:180, flexShrink:0, background:'linear-gradient(135deg,#2a2118,#1a1612)', display:'flex', alignItems:'center', justifyContent:'center', borderRight:'0.5px solid rgba(200,175,120,0.08)', position:'relative', overflow:'hidden' }}>
        {booking.reference_image ? (
          <img src={booking.reference_image} alt="Event" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <EventTypeIcon type={booking.event_type} />
        )}
        <div style={{ position:'absolute', bottom:10, left:0, right:0, textAlign:'center' }}>
          <span style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,175,120,0.4)' }}>{booking.event_type}</span>
        </div>
      </div>

      {/* Right content */}
      <div style={{ flex:1, padding:'20px 24px', display:'flex', flexDirection:'column' }}>

        {/* Top row */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, color:'#e8dcc8', margin:'0 0 4px' }}>
              {details['event'] || booking.event_type || 'My Event'}
            </h3>
            <div style={{ fontSize:11, color:'rgba(200,175,120,0.4)', letterSpacing:'0.04em' }}>Submitted {receivedDate}</div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:16, flexShrink:0 }}>
            {/* Status badge */}
            <div style={{ display:'flex', alignItems:'center', background:cfg.bg, border:`0.5px solid ${cfg.border}`, borderRadius:20, padding:'5px 12px' }}>
              <GlowDot config={cfg} />
              <span style={{ fontSize:11, fontWeight:500, color:cfg.color, letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{cfg.label}</span>
            </div>

            {/* Cancel button — only for non-cancelled, non-completed bookings */}
            {!isCancelled && booking.status !== 'completed' && (
              <button
                onClick={() => onCancel(booking)}
                style={{ width:28, height:28, borderRadius:'50%', background:'rgba(248,113,113,0.08)', border:'0.5px solid rgba(248,113,113,0.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#f87171', transition:'all 0.2s' }}
                title="Cancel booking"
                onMouseEnter={e => { e.currentTarget.style.background='rgba(248,113,113,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(248,113,113,0.08)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
          {[['📅 Date',eventDate],['📍 Location',details['location']||'—'],['🎨 Decoration',details['decoration']||'—'],['⏰ Time',details['time']||'—'],['👥 Capacity',details['capacity']||'—'],[details['est. budget']?'💰 Est. Budget':null,details['est. budget']]].filter(([l])=>l).map(([label,val])=>(
            <div key={label} style={{ background:'rgba(200,175,120,0.04)', border:'0.5px solid rgba(200,175,120,0.08)', borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(200,175,120,0.35)', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:12, color:'#e8dcc8' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Vendor/extra tags */}
        {(details['vendors']||details['extras']) && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
            {details['vendors']&&details['vendors'].split(',').map(v=><span key={v} style={{ fontSize:10, padding:'3px 10px', border:'0.5px solid rgba(200,175,120,0.15)', borderRadius:20, color:'rgba(200,175,120,0.55)' }}>{v.trim()}</span>)}
            {details['extras']&&details['extras'].split(',').slice(0,3).map(e=><span key={e} style={{ fontSize:10, padding:'3px 10px', border:'0.5px solid rgba(200,175,120,0.1)', borderRadius:20, color:'rgba(200,175,120,0.35)' }}>{e.trim()}</span>)}
          </div>
        )}

        {/* Cancelled reason */}
        {isCancelled && booking.cancel_reason && (
          <div style={{ fontSize:11, color:'rgba(248,113,113,0.6)', background:'rgba(248,113,113,0.06)', border:'0.5px solid rgba(248,113,113,0.15)', borderRadius:8, padding:'8px 12px', marginTop:4 }}>
            {booking.cancel_reason}
          </div>
        )}

        {/* Pay button — shows when admin sent payment request */}
        {isPaymentRequested && booking.payment_status !== 'advance_paid' && !isCancelled && advance > 0 && (
          <button onClick={handlePay} style={{ marginTop:10, alignSelf:'flex-start', display:'inline-flex', alignItems:'center', gap:8, background:'#6fcf97', color:'#0f1f15', border:'none', borderRadius:8, padding:'10px 20px', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', boxShadow:'0 4px 16px rgba(111,207,151,0.3)', transition:'background 0.2s,transform 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#7ddba6';e.currentTarget.style.transform='translateY(-1px)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#6fcf97';e.currentTarget.style.transform='translateY(0)'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            Pay Advance · ₹{advance.toLocaleString('en-IN')}
          </button>
        )}

        {/* Advance paid badge */}
        {booking.payment_status === 'advance_paid' && !isCancelled && (
          <div style={{ marginTop:10, alignSelf:'flex-start', display:'inline-flex', alignItems:'center', gap:6, fontSize:11, color:'#6fcf97', background:'rgba(111,207,151,0.08)', border:'0.5px solid rgba(111,207,151,0.25)', borderRadius:20, padding:'5px 12px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Advance paid · Balance due before event
          </div>
        )}
      </div>
    </div>
  );
}

// ── Past Event Card ───────────────────────────────────────────────────────────
function PastEventCard({ booking }) {
  const details   = parseEventDetails(booking.message);
  const eventDate = booking.event_date ? new Date(booking.event_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : 'Date TBD';
  return (
    <div style={{ display:'flex', background:'#1a1612', border:'0.5px solid rgba(200,175,120,0.08)', borderRadius:14, overflow:'hidden', marginBottom:16, opacity:0.75 }}>
      <div style={{ width:4, background:'rgba(200,175,120,0.2)', flexShrink:0 }} />
      <div style={{ width:160, minHeight:140, flexShrink:0, background:'#1e1a14', display:'flex', alignItems:'center', justifyContent:'center', borderRight:'0.5px solid rgba(200,175,120,0.06)', overflow:'hidden' }}>
        {booking.reference_image ? (
          <img src={booking.reference_image} alt="Event" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <EventTypeIcon type={booking.event_type} />
        )}
      </div>
      <div style={{ flex:1, padding:'18px 22px' }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:400, color:'rgba(232,220,200,0.7)', margin:'0 0 6px' }}>
          {details['event']||booking.event_type||'My Event'}
        </h3>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'rgba(200,175,120,0.4)' }}>📅 {eventDate}</span>
          {details['location']&&<span style={{ fontSize:12, color:'rgba(200,175,120,0.4)' }}>📍 {details['location']}</span>}
          <span style={{ fontSize:11, padding:'2px 10px', border:'0.5px solid rgba(200,175,120,0.12)', borderRadius:20, color:'rgba(200,175,120,0.35)' }}>Completed</span>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ tab, navigate }) {
  const copy = {
    Upcoming: { tag:"Your journey begins here", heading:<><span>No events yet,</span><br/><em>your story awaits</em></>, sub:"You haven't joined or created any upcoming events yet." },
    Past:     { tag:"Nothing in the archive",   heading:<><span>No past events</span><br/><em>just yet</em></>,        sub:"Completed experiences will appear here." },
    Drafts:   { tag:"Your ideas in progress",   heading:<><span>No drafts saved</span><br/><em>start building</em></>, sub:"Events you've started will be saved here." },
  };
  const {tag,heading,sub} = copy[tab];
  return (
    <div style={S.emptyWrap}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ opacity:0.22, marginBottom:28 }}>
        <rect x="8" y="16" width="56" height="46" rx="3" stroke="#c9a96e" strokeWidth="1.5"/>
        <path d="M8 26h56" stroke="#c9a96e" strokeWidth="1.5"/>
        <path d="M24 8v16M48 8v16" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="36" cy="47" r="8" stroke="#c9a96e" strokeWidth="1.2" strokeDasharray="3 2"/>
        <path d="M36 43v4l2.5 2" stroke="#c9a96e" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      <p style={S.emptyTag}>{tag}</p>
      <h2 style={S.emptyHeading}>{heading}</h2>
      <p style={S.emptySub}>{sub}</p>
      {tab==='Upcoming'&&<>
        <button style={S.cta} onClick={()=>navigate('/create-event')}
          onMouseEnter={e=>{e.currentTarget.style.background='#d9be8a';e.currentTarget.style.transform='translateY(-2px)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='#c9a96e';e.currentTarget.style.transform='translateY(0)'}}>
          + Create your first event
        </button>
        <div style={S.divider}/>
        <p style={S.hint}>Or browse events others are hosting →</p>
      </>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MyEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab,   setActiveTab]   = useState('Upcoming');
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null); // booking to cancel
  const [cancelling,  setCancelling]  = useState(false);

  const fetchBookings = () => {
    if (!user?.email) { setLoading(false); return; }
    fetch(`${API}/bookings/my?email=${encodeURIComponent(user.email)}`)
      .then(r=>r.json())
      .then(data=>{ setBookings(Array.isArray(data)?data:[]); setLoading(false); })
      .catch(()=>setLoading(false));
  };

  useEffect(()=>{ fetchBookings(); },[user]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res  = await fetch(`${API}/bookings/${cancelTarget.id}/client-cancel`, { method:'PATCH', headers:{'Content-Type':'application/json'} });
      const data = await res.json();

      // If advance was paid and refund applies, trigger it
      if (cancelTarget.payment_status === 'advance_paid' && data.refundPct > 0) {


        await fetch(`${API}/payments/refund`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ booking_id: cancelTarget.id, refund_pct: data.refundPct }),
        });
      }

      setCancelTarget(null);
      fetchBookings();
    } catch {
      // Ignore booking cancellation errors silently.
    }
    setCancelling(false);
  };

  const upcoming  = bookings.filter(b => !isPast(b.event_date) && b.status !== 'completed');
  const past      = bookings.filter(b => isPast(b.event_date)  || b.status === 'completed');

  return (
    <div style={S.root}>
      <style>{`
        @keyframes pulseSlow{0%,100%{box-shadow:0 0 0 0 rgba(96,165,250,0.5)}50%{box-shadow:0 0 0 5px transparent}}
        @keyframes pulseMed {0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5)}50%{box-shadow:0 0 0 4px transparent}}
        @keyframes pulseFast{0%,100%{box-shadow:0 0 0 0 rgba(111,207,151,0.6)}50%{box-shadow:0 0 0 3px transparent}}
      `}</style>

      {/* Cancel popup */}
      {cancelTarget && (
        <CancelPopup
          booking={cancelTarget}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
          cancelling={cancelling}
        />
      )}

      <header style={S.topbar}>
        <button style={S.backBtn} onClick={()=>navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 12L6 8l4-4"/></svg>
          Back
        </button>
        <h6 style={S.pageTitle}>My Events</h6>
      </header>
      <div style={S.shimmerLine}/>

      <nav style={S.tabs}>
        {['Upcoming','Past','Drafts'].map(tab=>(
          <button key={tab} style={{...S.tab,...(activeTab===tab?S.tabActive:{})}} onClick={()=>setActiveTab(tab)}>
            {tab}
            {tab==='Upcoming'&&upcoming.length>0&&<span style={{ marginLeft:6,fontSize:9,background:'rgba(200,175,120,0.15)',color:'#c8af78',padding:'1px 6px',borderRadius:10 }}>{upcoming.length}</span>}
            {tab==='Past'&&past.length>0&&<span style={{ marginLeft:6,fontSize:9,background:'rgba(200,175,120,0.08)',color:'rgba(200,175,120,0.4)',padding:'1px 6px',borderRadius:10 }}>{past.length}</span>}
          </button>
        ))}
      </nav>

      <main style={{...S.body, alignItems:'flex-start', justifyContent:'flex-start'}}>
        {loading ? (
          <div style={{ width:'100%',padding:'60px 0',textAlign:'center',color:'rgba(200,175,120,0.4)',fontSize:13 }}>Loading your events…</div>
        ) : activeTab==='Upcoming' ? (
          upcoming.length===0
            ? <div style={{width:'100%',display:'flex',justifyContent:'center'}}><EmptyState tab="Upcoming" navigate={navigate}/></div>
            : <div style={{width:'100%',maxWidth:860}}>
                <p style={{fontSize:11,color:'rgba(200,175,120,0.35)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:20}}>{upcoming.length} upcoming event{upcoming.length!==1?'s':''}</p>
                {upcoming.map(b=><EventCard key={b.id} booking={b} navigate={navigate} onCancel={setCancelTarget}/>)}
              </div>
        ) : activeTab==='Past' ? (
          past.length===0
            ? <div style={{width:'100%',display:'flex',justifyContent:'center'}}><EmptyState tab="Past" navigate={navigate}/></div>
            : <div style={{width:'100%',maxWidth:860}}>
                <p style={{fontSize:11,color:'rgba(200,175,120,0.35)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:20}}>{past.length} past event{past.length!==1?'s':''}</p>
                {past.map(b=><PastEventCard key={b.id} booking={b}/>)}
              </div>
        ) : (
          <div style={{width:'100%',display:'flex',justifyContent:'center'}}><EmptyState tab="Drafts" navigate={navigate}/></div>
        )}
      </main>
    </div>
  );
}

const S = {
  root:{ minHeight:'100vh', background:'#1a1612', fontFamily:"'DM Sans',sans-serif", color:'#e8dcc8', display:'flex', flexDirection:'column', paddingTop:'70px', position:'relative', zIndex:1 },
  topbar:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', borderBottom:'0.5px solid rgba(255,255,255,0.08)' },
  backBtn:{ display:'flex', alignItems:'center', gap:6, color:'#b5a48a', fontSize:13, cursor:'pointer', background:'none', border:'none', padding:0 },
  pageTitle:{ fontFamily:"'Cormorant Garamond',serif", fontSize:50, fontWeight:300, color:'#e8dcc8', margin:0, position:'absolute', left:'50%', transform:'translateX(-50%)' },
  shimmerLine:{ height:'0.5px', background:'linear-gradient(to right,transparent,rgba(201,169,110,0.12),transparent)', margin:'0 32px' },
  tabs:{ display:'flex', padding:'0 32px', background:'#1a1510', gap:0, justifyContent:'flex-start' },
  tab:{ fontFamily:"'Jost',sans-serif", fontSize:11.5, fontWeight:400, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,175,120,0.4)', padding:'18px 0', marginRight:32, cursor:'pointer', background:'none', border:'none', borderBottom:'1.5px solid transparent', transition:'color 0.2s', whiteSpace:'nowrap', display:'flex', alignItems:'center' },
  tabActive:{ color:'#c8af78', borderBottomColor:'#c8af78' },
  body:{ flex:1, display:'flex', flexDirection:'column', padding:'32px 32px 48px' },
  emptyWrap:{ display:'flex', flexDirection:'column', alignItems:'center', maxWidth:380, width:'100%', paddingTop:40 },
  emptyTag:{ fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'#c9a96e', marginBottom:14 },
  emptyHeading:{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:400, color:'#e8dcc8', textAlign:'center', lineHeight:1.2, marginBottom:14 },
  emptySub:{ fontSize:13, color:'rgba(181,164,138,0.5)', textAlign:'center', lineHeight:1.75, marginBottom:32 },
  cta:{ display:'inline-flex', alignItems:'center', gap:8, background:'#c9a96e', color:'#1a1612', fontSize:11, fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase', padding:'13px 32px', border:'none', cursor:'pointer', transition:'background 0.2s,transform 0.15s' },
  divider:{ width:40, height:'0.5px', background:'rgba(181,164,138,0.15)', margin:'28px auto' },
  hint:{ fontSize:11, color:'rgba(181,164,138,0.28)', letterSpacing:'0.04em' },
};
