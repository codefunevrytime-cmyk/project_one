import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from '../config/api';
import { useTheme } from "../hooks/useTheme";
import { getTokens } from "../styles/themeTokens";

const API = API_URL;

/* ─── Date helper ────────────────────────────────────────────────────────────
   Safely parses event_date whether it arrives as a plain "YYYY-MM-DD" string
   or (from older/other endpoints) a full ISO timestamp already containing
   "T". Blindly appending "T00:00:00" to a string that already has a "T"
   produces an Invalid Date, which silently breaks all downstream filtering. */
function toDate(d) {
  if (!d) return null;
  return new Date(d.includes("T") ? d : d + "T00:00:00");
}

/* ─── Status config ──────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  pending:           { label: "Under Review",          color: "#8ab4f8", pulse: "pulseSlow",  dur: "2.4s" },
  admin_reviewing:   { label: "Being Reviewed",         color: "#c084fc", pulse: "pulseMed",   dur: "1.8s" },
  admin_approved:    { label: "Approved — Vendors Contacted", color: "#f59e0b", pulse: "pulseMed", dur: "1.6s" },
  payment_pending:   { label: "Payment Required",       color: "#a78bfa", pulse: "pulseFast",  dur: "1.2s" },
  confirmed:         { label: "Confirmed ✓",            color: "#5fcf7a", pulse: "pulseFast",  dur: "1.0s" },
  cancelled:         { label: "Cancelled",              color: "#f87171", pulse: "pulseNone",  dur: "0s"   },
};

const VENDOR_META = {
  pending:  { icon: "⏳", label: "Awaiting response", color: "rgba(240,230,200,0.4)" },
  viewed:   { icon: "👁",  label: "Viewed",            color: "#8ab4f8" },
  accepted: { icon: "✓",  label: "Confirmed",          color: "#5fcf7a" },
  declined: { icon: "✕",  label: "Unavailable",        color: "#f87171" },
  replaced: { icon: "↩",  label: "Replaced",           color: "rgba(240,230,200,0.25)" },
};

const EVENT_STEPS = [
  { key: "pending",          label: "Submitted" },
  { key: "admin_reviewing",  label: "Reviewing" },
  { key: "admin_approved",   label: "Approved" },
  { key: "payment_pending",  label: "Payment Due" },
  { key: "confirmed",        label: "Confirmed" },
];

function stepIndex(status) {
  const i = EVENT_STEPS.findIndex(s => s.key === status);
  return i === -1 ? 0 : i;
}

function fmt(n) { return Number(n || 0).toLocaleString("en-IN"); }

function fmtDate(d) {
  if (!d) return "—";
  return toDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/* ─── Glow dot ───────────────────────────────────────────────────────────────── */
function GlowDot({ cfg }) {
  if (!cfg || cfg.pulse === "pulseNone") return <span style={{ width:8, height:8, borderRadius:"50%", background: cfg?.color || "#888", display:"inline-block", marginRight:8, flexShrink:0 }}/>;
  return <span style={{ width:8, height:8, borderRadius:"50%", background: cfg.color, display:"inline-block", marginRight:8, flexShrink:0, animation:`${cfg.pulse} ${cfg.dur} ease-in-out infinite` }}/>;
}

/* ─── Timeline ───────────────────────────────────────────────────────────────── */
function Timeline({ status }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  const current = stepIndex(status);
  return (
    <div style={{ display:"flex", alignItems:"flex-start", position:"relative", marginBottom:20 }}>
      <div style={{ position:"absolute", top:13, left:18, right:18, height:2, background:T.borderFaint, zIndex:0 }}/>
      {EVENT_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "future";
        return (
          <div key={step.key} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6, position:"relative", zIndex:1 }}>
            <div style={{
              width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:700, flexShrink:0,
              background: state==="active" ? T.goldStrong : state==="done" ? T.goldSoft : T.borderFaint,
              border: `2px solid ${state==="active" ? T.goldStrong : state==="done" ? T.goldStrong : T.border}`,
              color: state==="active" ? T.goldOnDark : state==="done" ? T.goldStrong : T.textFaint,
              boxShadow: state==="active" ? `0 0 12px ${T.goldBorder}` : "none",
            }}>
              {state==="done" ? "✓" : i+1}
            </div>
            <div style={{ fontSize:10, textAlign:"center", color: state==="active" ? T.goldStrong : state==="done" ? T.textSecondary : T.textFaint, fontWeight: state==="active" ? 600 : 400, maxWidth:70, lineHeight:1.3 }}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Vendor chips ───────────────────────────────────────────────────────────── */
function DetailRow({ label, value }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  if (!value && value !== 0) return null;
  return (
    <div style={{ display:"flex", gap:16, padding:"8px 0", borderBottom:`0.5px solid ${T.borderFaint}` }}>
      <span style={{ fontSize:11, color:T.textFaint, minWidth:130, flexShrink:0, paddingTop:1 }}>{label}</span>
      <span style={{ fontSize:13, color:T.textAlt, lineHeight:1.5 }}>{value}</span>
    </div>
  );
}

function RefImageRow({ label, imageUrl, title, type, city }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  if (!imageUrl && !title) return null;
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:T.textFaint, marginBottom:8 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:T.borderFaint, border:`0.5px solid ${T.border}`, borderRadius:10 }}>
        {imageUrl && <img src={imageUrl} alt={title||"Reference"} style={{ width:72, height:52, objectFit:"cover", borderRadius:7, flexShrink:0 }}/>}
        <div>
          {title && <div style={{ fontSize:13, fontWeight:600, color:T.textAlt, marginBottom:2 }}>{title}</div>}
          {(type||city) && <div style={{ fontSize:11, color:T.textMuted }}>{[type, city].filter(Boolean).join(" · ")}</div>}
        </div>
      </div>
    </div>
  );
}
function VendorChips({ vendors, eventId, navigate }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  if (!vendors?.length) return null;
  const visible = vendors.filter(v => v.status !== "replaced");
  return (
    <div style={{ marginTop:4 }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:T.textFaint, marginBottom:8 }}>Vendors</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {visible.map(v => {
          const meta = VENDOR_META[v.status] || VENDOR_META.pending;
          return (
            <div key={v.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, padding:"6px 10px", background:T.borderFaint, border:`1px solid ${T.border}`, borderRadius:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:14 }}>{meta.icon}</span>
              <span style={{ fontWeight:600, color:T.textAlt }}>{v.business_name || v.vendor_name || "Vendor"}</span>
              <span style={{ color:T.textMuted, fontSize:12 }}>({v.service_type})</span>
              <span style={{ marginLeft:"auto", fontSize:12, fontWeight:500, color:meta.color }}>{meta.label}</span>
              {v.status === "declined" && (
                <button onClick={() => navigate(`/services/photography`)} style={{ background:T.goldSoft, border:`1px solid ${T.goldBorder}`, borderRadius:6, color:T.goldStrong, fontSize:11, fontWeight:600, padding:"3px 10px", cursor:"pointer" }}>
                  Choose another →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* ─── Expanded detail panel ───────────────────────────────────────────────────── */
function ExpandedDetails({ ev }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  const ps = ev.vendors?.find(v => v.service_type === "Photography" && v.status !== "replaced");
  const is = ev.vendors?.find(v => v.service_type === "Custom Invitations" && v.status !== "replaced");

  return (
    <div style={{ borderTop:`1px solid ${T.divider}`, marginTop:16, paddingTop:20 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:T.textFaint, marginBottom:12 }}>Event details</div>
        <DetailRow label="Event name" value={ev.event_name}/>
        <DetailRow label="Type" value={ev.event_type}/>
        <DetailRow label="Date" value={fmtDate(ev.event_date)}/>
        <DetailRow label="Time" value={ev.event_time}/>
        <DetailRow label="Location" value={ev.location}/>
        <DetailRow label="Capacity" value={ev.capacity ? `${ev.capacity} guests` : null}/>
        <DetailRow label="Decoration" value={ev.decoration_type}/>
        {ev.reference_event_image && (
          <RefImageRow label="Reference event" imageUrl={ev.reference_event_image} title={ev.reference_event_title} type={ev.reference_event_type}/>
        )}
      </div>

      {ev.additional_details && (
        <div style={{ background:T.borderFaint, border:`0.5px solid ${T.border}`, borderRadius:12, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:T.textFaint, marginBottom:10 }}>Additional Details</div>
          <div style={{ fontSize:13, color:T.textAlt, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{ev.additional_details}</div>
        </div>
      )}

      {ps && (
        <div style={{ background:T.borderFaint, border:`0.5px solid ${T.border}`, borderRadius:12, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:T.textFaint, marginBottom:12 }}>Photography</div>
          <DetailRow label="Vendor" value={ps.business_name || ps.vendor_name}/>
          <DetailRow label="Coverage types" value={Array.isArray(ps.coverage_types) ? ps.coverage_types.join(", ") : ps.coverage_types}/>
          <DetailRow label="Days" value={ps.days ? `${ps.days} day${ps.days>1?"s":""}` : null}/>
          <DetailRow label="Quoted price" value={ps.quoted_price ? `₹${fmt(ps.quoted_price)}` : null}/>
          <DetailRow label="Notes" value={ps.vendor_notes}/>
          {ps.reference_event_image && <RefImageRow label="Style reference" imageUrl={ps.reference_event_image}/>}
        </div>
      )}

      {is && (
        <div style={{ background:T.borderFaint, border:`0.5px solid ${T.border}`, borderRadius:12, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:T.textFaint, marginBottom:12 }}>Custom Invitations</div>
          <DetailRow label="Vendor" value={is.business_name || is.vendor_name}/>
          <DetailRow label="Types" value={Array.isArray(is.coverage_types) ? is.coverage_types.join(", ") : is.coverage_types}/>
          <DetailRow label="Quantity" value={is.quantity ? `${is.quantity} pieces` : null}/>
          <DetailRow label="Quoted price" value={is.quoted_price ? `₹${fmt(is.quoted_price)}` : null}/>
          <DetailRow label="Notes" value={is.vendor_notes}/>
          {is.reference_event_image && <RefImageRow label="Style reference" imageUrl={is.reference_event_image}/>}
        </div>
      )}

      {ev.budget_estimate > 0 && (
        <div style={{ background:T.goldSoftAlt, border:`0.5px solid ${T.goldBorder}`, borderRadius:12, padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:T.textFaint, marginBottom:12 }}>Cost estimate</div>
          {ev.vendors?.filter(v=>v.status!=="replaced"&&v.quoted_price>0).map(v=>(
            <div key={v.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`0.5px solid ${T.divider}`, fontSize:13 }}>
              <span style={{ color:T.textSecondary }}>{v.service_type}</span>
              <span style={{ color:T.goldStrong, fontWeight:500 }}>₹{fmt(v.quoted_price)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`0.5px solid ${T.divider}`, fontSize:13, opacity:0.6 }}>
            <span style={{ color:T.textSecondary }}>Contingency (5%)</span>
            <span style={{ color:T.goldStrong }}>₹{fmt(Math.round(ev.budget_estimate * 0.05 / 1.05))}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:12, marginTop:4 }}>
            <span style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", color:T.textFaint }}>Total estimate</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:300, color:T.textAlt }}>₹{fmt(ev.budget_estimate)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Cancel popup ───────────────────────────────────────────────────────────── */
function CancelPopup({ ev, onConfirm, onClose, cancelling }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  const now = new Date();
  const eventDate = toDate(ev.event_date);
  const daysToEvent = eventDate ? (eventDate - now) / (1000*60*60*24) : 999;
  const hasPaid = ev.payment_status === "advance_paid";
  let refundPct = 0;
  if (daysToEvent > 7) refundPct = 100;
  else if ((now - new Date(ev.created_at)) / (1000*60*60) <= 48) refundPct = 50;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:T.cardBg,border:`0.5px solid ${T.borderStrong}`,borderRadius:16,padding:32,maxWidth:420,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
          <div style={{ width:40,height:40,borderRadius:"50%",background:T.dangerBg,border:`0.5px solid ${T.dangerBorder}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div>
            <div style={{ fontSize:16,fontWeight:500,color:T.textAlt }}>Cancel event</div>
            <div style={{ fontSize:11,color:T.textFaint }}>{ev.event_name} · {fmtDate(ev.event_date)}</div>
          </div>
        </div>

        <div style={{ background:T.borderFaint,border:`0.5px solid ${T.border}`,borderRadius:10,padding:14,marginBottom:16 }}>
          <div style={{ fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:T.textFaint,marginBottom:10 }}>Refund policy</div>
          {[
            { color:"#3aa860", bold:"100% refund", rest:"— cancelled more than 7 days before event", active: daysToEvent > 7 },
            { color:"#e0a020", bold:"50% refund",  rest:"— cancelled within 48 hours of booking",   active: (now-new Date(ev.created_at))/(1000*60*60)<=48 && daysToEvent<=7 },
            { color:"#e05252", bold:"No refund",   rest:"— after 48 hours and within 7 days",       active: daysToEvent<=7 && (now-new Date(ev.created_at))/(1000*60*60)>48 },
          ].map(({color,bold,rest,active})=>(
            <div key={bold} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",borderBottom:`0.5px solid ${T.borderFaint}`,opacity:active?1:0.4 }}>
              <span style={{ width:8,height:8,borderRadius:"50%",background:color,flexShrink:0,marginTop:4 }}/>
              <div style={{ fontSize:12,color:T.textSecondary,lineHeight:1.5 }}>
                <strong style={{ color:T.textAlt }}>{bold}</strong> {rest}
                {active&&<span style={{ marginLeft:6,fontSize:10,background:T.goldSoft,color:T.goldStrong,padding:"2px 8px",borderRadius:10 }}>← applies</span>}
              </div>
            </div>
          ))}
        </div>

        {hasPaid && (
          <div style={{ background: refundPct>0?T.successBg:T.dangerBg, border:`0.5px solid ${refundPct>0?T.successBorder:T.dangerBorder}`, borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
            <div style={{ fontSize:12, color:refundPct>0?T.success:"#f87171", fontWeight:500 }}>
              {refundPct>0 ? `${refundPct}% refund will be issued to your original payment method.` : "No refund applicable."}
            </div>
          </div>
        )}

        <div style={{ fontSize:12,color:T.textMuted,marginBottom:24,lineHeight:1.6 }}>This action is permanent and cannot be undone.</div>

        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} disabled={cancelling} style={{ flex:1,padding:"11px 0",background:"none",border:`0.5px solid ${T.border}`,borderRadius:8,color:T.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>Keep event</button>
          <button onClick={onConfirm} disabled={cancelling} style={{ flex:1,padding:"11px 0",background:T.dangerBg,border:`0.5px solid ${T.dangerBorder}`,borderRadius:8,color:"#f87171",fontSize:13,fontWeight:500,cursor:cancelling?"not-allowed":"pointer",fontFamily:"inherit",opacity:cancelling?0.6:1 }}>
            {cancelling ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Event card ─────────────────────────────────────────────────────────────── */
function EventCard({ ev, navigate, onCancel }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  const [expanded, setExpanded] = useState(false);
  const detailRef = useRef(null);

  const cfg = STATUS_CFG[ev.status] || STATUS_CFG.pending;
  const isPayReq = ev.status === "payment_pending" && ev.payment_status !== "advance_paid";
  const displayCfg = isPayReq ? STATUS_CFG.payment_pending : cfg;
  const isCancelled = ev.status === "cancelled";

  const vendorSlotTotal = (ev.vendors || [])
    .filter(v => v.status !== "replaced")
    .reduce((s, v) => s + (Number(v.effective_price ?? v.quoted_price) || 0), 0);
  const effectiveTotal = Number(ev.budget_estimate) > 0 ? Number(ev.budget_estimate) : vendorSlotTotal;
  const advance = effectiveTotal > 0 ? Math.round(effectiveTotal * 0.3) : 0;

  const handleExpand = () => {
    setExpanded(e => {
      if (!e) setTimeout(() => detailRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" }), 60);
      return !e;
    });
  };

  const handlePay = () => {
    navigate("/payments/checkout", { state: { event: {
      id: `EVT-${ev.id}`, bookingId: ev.id, name: ev.event_name, type: ev.event_type,
      venue: ev.location, guests: ev.capacity || 0, date: fmtDate(ev.event_date), time: ev.event_time || "18:00",
      breakdown: (ev.vendors||[]).filter(v=>(v.effective_price ?? v.quoted_price)>0 && v.status!=="replaced").map(v=>({
        label: v.service_type, sub: v.business_name || v.vendor_name || "", amount: Number(v.effective_price ?? v.quoted_price),
      })),
      gst: 0.18, budgetTotal: effectiveTotal, advanceAmount: advance,
    }}});
  };

  return (
    <div style={{
      background: isCancelled ? T.cardBgMuted : T.cardBg,
      border:`0.5px solid ${isCancelled? T.dangerBorder : expanded? T.goldBorder : T.borderFaint}`,
      borderRadius:16, overflow:"hidden", marginBottom:14,
      opacity: isCancelled ? 0.75 : 1,
      transition:"border-color 0.2s, box-shadow 0.2s",
      boxShadow: expanded ? `0 4px 24px ${T.goldSoft}` : "none",
    }}>
      <div style={{ display:"flex" }}>
        <div style={{ width:3, background: displayCfg.color, opacity:0.7, flexShrink:0 }}/>
        <div style={{ flex:1, padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            {ev.reference_event_image && (
              <img src={ev.reference_event_image} alt="ref" style={{ width:56, height:42, objectFit:"cover", borderRadius:8, flexShrink:0, border:`0.5px solid ${T.borderFaint}` }}/>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:T.goldStrong, marginBottom:4 }}>{ev.event_type}</div>
              <div style={{ fontSize:18, fontWeight:700, color:T.textAlt, marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.event_name}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, fontSize:12, color:T.textSecondary }}>
                <span>📅 {fmtDate(ev.event_date)}</span>
                {ev.event_time && <span>🕐 {ev.event_time}</span>}
                <span>📍 {ev.location}</span>
                {ev.capacity && <span>👥 {ev.capacity} guests</span>}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0, marginLeft:8 }}>
              {effectiveTotal > 0 && <div style={{ fontSize:18, fontWeight:700, color:T.goldStrong }}>₹{fmt(effectiveTotal)}</div>}
              <div style={{ display:"flex", alignItems:"center", background:T.borderFaint, border:`0.5px solid ${displayCfg.color}44`, borderRadius:20, padding:"4px 12px" }}>
                <GlowDot cfg={displayCfg}/>
                <span style={{ fontSize:11, fontWeight:500, color:displayCfg.color, whiteSpace:"nowrap" }}>{displayCfg.label}</span>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {!isCancelled && ev.status !== "confirmed" && (
                  <button onClick={() => onCancel(ev)} title="Cancel event" style={{ width:26, height:26, borderRadius:"50%", background:T.dangerBg, border:`0.5px solid ${T.dangerBorder}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#f87171", transition:"all 0.2s" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
                <button onClick={handleExpand} style={{ display:"flex", alignItems:"center", gap:5, background:T.borderFaint, border:`0.5px solid ${T.border}`, borderRadius:8, padding:"5px 12px", color:T.textSecondary, fontSize:11, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                  {expanded ? "▲ Less" : "▼ Details"}
                </button>
              </div>
            </div>
          </div>

          {!isCancelled && <div style={{ marginTop:16 }}><Timeline status={ev.status}/></div>}
          <VendorChips vendors={ev.vendors} eventId={ev.id} navigate={navigate}/>

          {isPayReq && advance > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, padding:"12px 16px", background:T.goldSoftAlt, border:`1px solid ${T.goldBorder}`, borderRadius:10, flexWrap:"wrap", gap:10 }}>
              <span style={{ fontSize:13, color:T.textAlt }}>🎉 All set — pay advance to confirm</span>
              <button onClick={handlePay} style={{ background:T.goldStrong, color:T.goldOnDark, border:"none", borderRadius:8, fontSize:13, fontWeight:700, padding:"9px 20px", cursor:"pointer", transition:"background 0.2s" }}>
                Pay ₹{fmt(advance)}
              </button>
            </div>
          )}

          {ev.payment_status === "advance_paid" && !isCancelled && (
            <div style={{ marginTop:12, display:"inline-flex", alignItems:"center", gap:6, fontSize:11, color:T.success, background:T.successBg, border:`0.5px solid ${T.successBorder}`, borderRadius:20, padding:"5px 12px" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Advance paid · Balance due before event
            </div>
          )}

          {isCancelled && (
            <div style={{ marginTop:12, padding:"8px 12px", background:T.dangerBg, border:`0.5px solid ${T.dangerBorder}`, borderRadius:8, fontSize:12, color:"#f87171", textAlign:"center" }}>
              This event has been cancelled
            </div>
          )}

          <div ref={detailRef}>{expanded && <ExpandedDetails ev={ev}/>}</div>
        </div>
      </div>
    </div>
  );
}


/* ─── Empty state ────────────────────────────────────────────────────────────── */
function EmptyState({ navigate }) {
  const { isLight } = useTheme();
  const T = getTokens(isLight);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"80px 24px" }}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ opacity:0.3, marginBottom:28 }}>
        <rect x="8" y="16" width="56" height="46" rx="3" stroke={T.gold} strokeWidth="1.5"/>
        <path d="M8 26h56" stroke={T.gold} strokeWidth="1.5"/>
        <path d="M24 8v16M48 8v16" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:T.gold, marginBottom:14 }}>Nothing here yet</p>
      <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:400, color:T.textAlt, marginBottom:14, lineHeight:1.2 }}>
        Your events will<br/>appear here
      </h2>
      <p style={{ fontSize:13, color:T.textSecondary, marginBottom:32, lineHeight:1.75, maxWidth:340 }}>
        Create your first event and we'll keep you updated every step of the way.
      </p>
      <button onClick={()=>navigate("/create-event")} style={{ background:T.gold, color:T.goldOnDark, fontSize:12, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", padding:"13px 32px", border:"none", borderRadius:8, cursor:"pointer", transition:"background 0.2s" }}>
        + Plan your first event
      </button>
    </div>
  );
}

/* ─── MAIN ───────────────────────────────────────────────────────────────────── */
export default function MyEvents() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isLight } = useTheme();
  const T = getTokens(isLight);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const showSuccess = location.state?.eventSuccess;

  const fetchEvents = useCallback(() => {
    const token = localStorage.getItem("celeste_token") || localStorage.getItem("token");
    fetch(`${API}/events/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const token = localStorage.getItem("celeste_token") || localStorage.getItem("token");
      await fetch(`${API}/events/${cancelTarget.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      setCancelTarget(null);
      fetchEvents();
    } catch {}
    setCancelling(false);
  };

  const now = new Date();
  const upcoming = events.filter(e => e.status !== "cancelled" && (!e.event_date || toDate(e.event_date) >= now));
  const past     = events.filter(e => e.status === "confirmed" && e.event_date && toDate(e.event_date) < now);
  const cancelled= events.filter(e => e.status === "cancelled");

  const TABS = [
    { key:"Upcoming", list: upcoming },
    { key:"Past",     list: past },
    { key:"Cancelled",list: cancelled },
  ];

  return (
    <div style={{ minHeight:"100vh", background:T.pageBg, fontFamily:"'DM Sans',sans-serif", color:T.text, paddingTop:"70px" }}>
      <style>{`
        @keyframes pulseSlow{0%,100%{opacity:1}50%{opacity:0.55}}
        @keyframes pulseMed {0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes pulseFast{0%,100%{opacity:1}50%{opacity:0.35}}
      `}</style>

      {cancelTarget && <CancelPopup ev={cancelTarget} onConfirm={handleCancelConfirm} onClose={()=>setCancelTarget(null)} cancelling={cancelling}/>}

      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 32px", borderBottom:`0.5px solid ${T.borderFaint}` }}>
        <button onClick={()=>navigate(-1)} style={{ display:"flex", alignItems:"center", gap:6, color:T.textSecondary, fontSize:13, cursor:"pointer", background:"none", border:"none", padding:0 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 12L6 8l4-4"/></svg>
          Back
        </button>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:48, fontWeight:300, color:T.textAlt, margin:0, position:"absolute", left:"50%", transform:"translateX(-50%)" }}>My Events</h1>
        <button onClick={()=>navigate("/create-event")} style={{ background:T.goldStrong, color:T.goldOnDark, border:"none", borderRadius:8, fontSize:13, fontWeight:700, padding:"9px 20px", cursor:"pointer" }}>
          + New event
        </button>
      </header>

      <div style={{ height:"0.5px", background:isLight ? "linear-gradient(to right,transparent,rgba(255,148,120,0.25),transparent)" : "linear-gradient(to right,transparent,rgba(201,169,110,0.12),transparent)", margin:"0 32px" }}/>

      {showSuccess && (
        <div style={{ margin:"16px 32px 0", padding:"12px 18px", background:T.successBg, border:`0.5px solid ${T.successBorder}`, borderRadius:10, display:"flex", alignItems:"center", gap:10, fontSize:13, color:T.success }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          Event submitted! Our team will review it within 24 hours.
        </div>
      )}

      <nav style={{ display:"flex", padding:"0 32px", background:T.navBg, gap:0, zIndex:1 }}>
        {TABS.map(({ key, list }) => (
          <button key={key} onClick={()=>setActiveTab(key)} style={{
            fontFamily:"inherit", fontSize:11.5, fontWeight:400, letterSpacing:"0.18em", textTransform:"uppercase",
            color: activeTab===key ? T.gold : T.textMuted,
            padding:"18px 0", marginRight:32, cursor:"pointer", background:"none", border:"none",
            borderBottom: activeTab===key ? `1.5px solid ${T.gold}` : "1.5px solid transparent",
            transition:"color 0.2s", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6,
          }}>
            {key}
            {list.length > 0 && (
              <span style={{ fontSize:9, background: activeTab===key? T.goldSoft : T.borderFaint, color: activeTab===key? T.gold : T.textMuted, padding:"1px 6px", borderRadius:10 }}>
                {list.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main style={{ padding:"28px 32px 60px", maxWidth:900, margin:"0 auto" }}>
        {loading ? (
          <div style={{ padding:"60px 0", textAlign:"center", color:T.textMuted, fontSize:13 }}>Loading your events…</div>
        ) : (() => {
          const currentList = TABS.find(t=>t.key===activeTab)?.list || [];
          if (currentList.length === 0) {
            if (activeTab === "Upcoming") return <EmptyState navigate={navigate}/>;
            return <div style={{ padding:"60px 0", textAlign:"center", color:T.textFaint, fontSize:13 }}>No {activeTab.toLowerCase()} events.</div>;
          }
          return (
            <>
              <p style={{ fontSize:11, color:T.textFaint, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:20 }}>
                {currentList.length} event{currentList.length!==1?"s":""}
              </p>
              {currentList.map(ev => <EventCard key={ev.id} ev={ev} navigate={navigate} onCancel={setCancelTarget}/>)}
            </>
          );
        })()}
      </main>
    </div>
  );
}