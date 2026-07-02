import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { eventsData } from "../context/data/eventsData";
import { EVENT_CATEGORIES } from "../context/data/events";
import styles from "./CreateEventPage.module.css";
import { VENDOR_SERVICE_CONFIGS } from "../context/data/vendorServiceConfig";


import { API_URL } from '../config/api';

const API = API_URL;

/* ─── draft persistence — so navigating away to /explore or a vendor
   listing page to "pick" something doesn't lose in-progress form state ── */
const DRAFT_KEY = "celeste_create_event_draft";

function saveEventDraft(step, form, vendorSelections) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form, vendorSelections }));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}
function loadEventDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearEventDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

/* ─── constants ─────────────────────────────────────────────────────────────── */
const STEPS = ["Basics", "Vendors", "Budget", "Review"];

const EVENT_TYPES = [
  "Wedding","Birthday","Corporate","Concert","Festival",
  "Sports","Outdoor","Expo","Cultural","Charity","Food","Other",
];

const DECORATION_LOCATIONS = [
  { value: "", label: "None" },
  { value: "home", label: "Home" },
  { value: "lawn", label: "Lawn / Garden" },
  { value: "hotel", label: "Hotel" },
  { value: "restaurant", label: "Restaurant" },
  { value: "banquet", label: "Banquet Hall" },
  { value: "outdoor", label: "Outdoor / Open Ground" },
];

const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/* ─── Fallback extra-field defaults for services that haven't yet been
   migrated to declare `extraFields`/`pricingModel` on their serviceConfig
   entry. ─────────────────────────────────────────────────────────────── */
const FALLBACK_SERVICE_FIELDS = {
  photography: {
    pricingModel: "perDay",
    extraFields: [
      {
        key: "days", type: "counter", label: "Number of days", min: 1,
      },
      {
        key: "coverage_types", type: "multiselect", label: "Coverage types",
        options: ["Candid","Traditional","Pre-Wedding","Drone Coverage","Cinematic Film","Reels / Shorts","Photo Booth","Live Screening"],
      },
    ],
  },
  "custom-invitations": {
    pricingModel: "flat",
    extraFields: [
      {
        key: "coverage_types", type: "multiselect", label: "Invitation types",
        options: ["Digital Invite","Printed Cards","Luxury Box","Save The Date","Wedding Website","Foil Print","Handmade"],
      },
      {
        key: "quantity", type: "number", label: "Quantity", placeholder: "e.g. 200",
      },
    ],
  },
};

function getServiceFields(serviceConfig) {
  return {
    pricingModel: serviceConfig?.pricingModel
      || FALLBACK_SERVICE_FIELDS[serviceConfig?.id]?.pricingModel
      || "perDay",
    extraFields: serviceConfig?.extraFields
      || FALLBACK_SERVICE_FIELDS[serviceConfig?.id]?.extraFields
      || [],
  };
}

function computeVendorTotal(pricingModel, vendorData) {
  const pricePerUnit = vendorData.vendor?.price_per_day ? Number(vendorData.vendor.price_per_day) : 0;
  if (pricingModel === "flat") return pricePerUnit;
  const days = Number(vendorData.days) || 1;
  return pricePerUnit * days;
}

/* ─── small helpers ──────────────────────────────────────────────────────────── */
function getEmoji(type) {
  return EVENT_CATEGORIES.find(c => c.type === type)?.icon ?? "📅";
}

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

/* ─── Availability Calendar ──────────────────────────────────────────────────── */
function AvailabilityCalendar({ value, onChange, availability }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const initDate = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const statusMap = {};
  availability.forEach(a => {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    statusMap[key] = a.status;
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  return (
    <div style={{ background:"#1e1a14", border:"0.5px solid rgba(200,175,120,0.2)", borderRadius:10, padding:16, width:280 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <button onClick={prevMonth} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:"rgba(200,175,120,0.5)",lineHeight:1,padding:"0 6px" }}>‹</button>
        <span style={{ fontSize:13,fontWeight:500,color:"#c8af78",letterSpacing:"0.05em" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:"rgba(200,175,120,0.5)",lineHeight:1,padding:"0 6px" }}>›</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4 }}>
        {DAY_NAMES.map(d=><div key={d} style={{ textAlign:"center",fontSize:9,color:"rgba(200,175,120,0.3)",fontWeight:600,padding:"2px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
        {cells.map((day,idx)=>{
          if(!day) return <div key={`e-${idx}`}/>;
          const dateKey=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const status=statusMap[dateKey];
          const thisDate=new Date(viewYear,viewMonth,day);
          const isPast=thisDate<today;
          const isBusy=status==="busy";
          const isFree=status==="free";
          const isSel=value===dateKey;
          const disabled=isPast||isBusy;
          let bg="transparent",color="rgba(200,175,120,0.7)",border="0.5px solid transparent",cursor="pointer",fw=400;
          if(isPast){color="rgba(200,175,120,0.2)";cursor="not-allowed";}
          if(isFree){bg="rgba(111,207,151,0.12)";color="#6fcf97";border="0.5px solid rgba(111,207,151,0.3)";}
          if(isBusy){bg="rgba(235,87,87,0.1)";color="rgba(235,87,87,0.55)";border="0.5px solid rgba(235,87,87,0.22)";cursor="not-allowed";}
          if(isSel){bg="#c8af78";color="#141210";border="0.5px solid #c8af78";fw=700;}
          return (
            <div key={dateKey} onClick={()=>!disabled&&onChange(dateKey)} style={{ textAlign:"center",fontSize:11,padding:"5px 2px",borderRadius:5,background:bg,color,border,cursor,fontWeight:fw,userSelect:"none",transition:"all 0.15s" }}>{day}</div>
          );
        })}
      </div>
      {value&&(
        <div style={{ marginTop:10,fontSize:11,color:"rgba(200,175,120,0.4)",textAlign:"center",borderTop:"0.5px solid rgba(200,175,120,0.08)",paddingTop:10 }}>
          <span style={{ color:"#c8af78" }}>{new Date(value+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</span>
        </div>
      )}
    </div>
  );
}

function DatePickerField({ value, onChange, availability }) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  const displayValue=value ? new Date(value+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}) : "";
  return (
    <div ref={ref} style={{ position:"relative",maxWidth:320 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ background:"#1e1a14",border:`0.5px solid ${open?"rgba(200,175,120,0.45)":"rgba(200,175,120,0.15)"}`,borderRadius:8,padding:"11px 14px",fontSize:13,color:value?"#e8dcc8":"rgba(200,175,120,0.22)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",userSelect:"none",transition:"border-color 0.2s" }}>
        <span>{displayValue||"Select date…"}</span>
        <span style={{ fontSize:9,color:"rgba(200,175,120,0.4)",marginLeft:8 }}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          <AvailabilityCalendar value={value} onChange={d=>{onChange(d);setOpen(false);}} availability={availability}/>
        </div>
      )}
    </div>
  );
}

/* ─── Field wrapper ───────────────────────────────────────────────────────────── */
function Field({ label, hint, children, required }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}{required&&<span style={{ color:"rgba(200,175,120,0.5)",marginLeft:4 }}>*</span>}</label>
      {children}
      {hint&&<p className={styles.hint}>{hint}</p>}
    </div>
  );
}

/* ─── STEP 1 — Basics ─────────────────────────────────────────────────────────── */
function StepBasics({ form, setForm, availability, onNext, onBrowseReference }) {
  const canNext = form.event_name && form.event_type && form.event_date && form.location && form.reference_event;

  const setF = key => val => setForm(f => ({ ...f, [key]: val }));
  const setE = key => e => setF(key)(e.target.value);

  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Tell us the basics — all fields marked * are required</p>

      <div className={styles.basicsLayout}>
        <div className={styles.basicsLeft}>
          <div className={styles.fieldRow}>
            <Field label="Event name" required>
              <input className={styles.input} placeholder="e.g. Rohan & Priya's Wedding" value={form.event_name} onChange={setE("event_name")}/>
            </Field>
            <Field label="Type of event" required>
              <select className={styles.input} value={form.event_type} onChange={setE("event_type")}>
                <option value="">Select type…</option>
                {EVENT_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className={styles.fieldRow}>
            <Field label="Date of event" required>
              <DatePickerField value={form.event_date} onChange={setF("event_date")} availability={availability}/>
            </Field>
            <Field label="Time">
              <input className={styles.input} type="time" value={form.event_time} onChange={setE("event_time")} style={{ maxWidth:200 }}/>
            </Field>
          </div>

          <Field label="Location" required hint='e.g. "Lucknow, The Taj Hotel (Near Hazratganj)"'>
            <input className={styles.input} placeholder="City, Venue (Landmark)" value={form.location} onChange={setE("location")}/>
          </Field>

          <Field label="Decoration location">
            <select className={styles.input} value={form.decoration_type} onChange={setE("decoration_type")}>
              {DECORATION_LOCATIONS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>

          <Field label={`Expected capacity — ${form.capacity} guests`}>
            <input type="range" min={10} max={2000} step={10} value={form.capacity} onChange={e=>setF("capacity")(Number(e.target.value))} className={styles.slider}/>
            <div className={styles.sliderLabels}><span>10</span><span>2,000</span></div>
          </Field>

          <div className={styles.btnRow}>
            <button className={styles.btnPrimary} onClick={onNext} disabled={!canNext}>
              Next — Choose vendors
            </button>
          </div>
          {!canNext && <p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>Complete all required fields and pick a reference event to continue.</p>}
        </div>

        {/* RIGHT — reference event (compulsory) */}
        <div className={styles.basicsRight}>
          <div className={styles.refPanelHeader}>
            <span className={styles.sectionLabel}>Reference event <span style={{ color:"rgba(200,175,120,0.5)" }}>*</span></span>
          </div>

          {form.reference_event ? (
            <div className={styles.refPanelCard}>
              <div className={styles.refPanelImage}>
                {form.reference_event.img
                  ? <img src={form.reference_event.img} alt={form.reference_event.title} style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:"10px 10px 0 0" }}/>
                  : <span style={{ fontSize:56 }}>{getEmoji(form.reference_event.type)}</span>}
              </div>
              <div className={styles.refPanelCostBar}>
                <span className={styles.refPanelCostLabel}>{form.reference_event.type}</span>
                <span className={styles.refPanelCostAmt}>{form.reference_event.price}</span>
              </div>
              <div className={styles.refPanelInfo}>
                <div className={styles.refName}>{form.reference_event.title}</div>
                <div className={styles.refMeta}>{form.reference_event.city} · {form.reference_event.dateLabel}</div>
                <button className={styles.refRemove} onClick={()=>setF("reference_event")(null)}>✕ Remove</button>
              </div>
            </div>
          ) : (
            <div className={styles.refPanelEmpty}>
              <div className={styles.refPanelEmptyIcon}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="24" rx="4" stroke="rgba(200,175,120,0.25)" strokeWidth="1.5"/><path d="M4 14h32" stroke="rgba(200,175,120,0.2)" strokeWidth="1"/></svg>
              </div>
              <p className={styles.refPanelEmptyText}>No reference selected</p>
              <p className={styles.refPanelEmptySub}>Required — pick an event that matches your vision</p>
              <button onClick={onBrowseReference} style={{ marginTop:8,background:"rgba(200,175,120,0.1)",border:"0.5px solid rgba(200,175,120,0.3)",borderRadius:8,padding:"8px 18px",fontSize:12,color:"#c8af78",cursor:"pointer",fontFamily:"inherit" }}>Browse events</button>
            </div>
          )}

          {form.reference_event && (
            <button onClick={onBrowseReference} style={{ marginTop:10,width:"100%",background:"none",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:8,padding:"7px 0",fontSize:12,color:"rgba(200,175,120,0.5)",cursor:"pointer",fontFamily:"inherit" }}>Change reference</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Generic extra-field renderer ────────────────────────────────────────────── */
function ExtraField({ field, vendorData, onChange }) {
  const value = vendorData[field.key];

  if (field.type === "counter") {
    const count = Number(value) || field.min || 1;
    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>{field.label}</div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={()=>onChange({...vendorData,[field.key]: Math.max(field.min||1, count-1)})} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(200,175,120,0.08)",border:"0.5px solid rgba(200,175,120,0.2)",color:"#c8af78",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
          <span style={{ fontSize:16,fontWeight:600,color:"#e8dcc8",minWidth:24,textAlign:"center" }}>{count}</span>
          <button onClick={()=>onChange({...vendorData,[field.key]: count+1})} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(200,175,120,0.08)",border:"0.5px solid rgba(200,175,120,0.2)",color:"#c8af78",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
        </div>
      </div>
    );
  }

  if (field.type === "multiselect") {
    const selected = vendorData[field.key] || [];
    const toggle = (val) => onChange({ ...vendorData, [field.key]: selected.includes(val) ? selected.filter(x=>x!==val) : [...selected, val] });
    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>
          {field.label} <span style={{ textTransform:"none",letterSpacing:0,color:"rgba(200,175,120,0.3)" }}>(select all that apply)</span>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
          {(field.options||[]).map(opt=>{
            const sel = selected.includes(opt);
            return <button key={opt} onClick={()=>toggle(opt)} style={{ fontSize:11,padding:"5px 12px",borderRadius:20,border:`0.5px solid ${sel?"rgba(200,175,120,0.45)":"rgba(200,175,120,0.15)"}`,background:sel?"rgba(200,175,120,0.1)":"none",color:sel?"#c8af78":"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s" }}>{opt}</button>;
          })}
        </div>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>{field.label}</div>
        <input type="number" min={1} placeholder={field.placeholder} value={value||""} onChange={e=>onChange({...vendorData,[field.key]:e.target.value})} style={{ background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.18)",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#e8dcc8",outline:"none",fontFamily:"inherit",width:140 }}/>
      </div>
    );
  }

  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>{field.label}</div>
      <input type="text" placeholder={field.placeholder} value={value||""} onChange={e=>onChange({...vendorData,[field.key]:e.target.value})} style={{ background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.18)",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#e8dcc8",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box" }}/>
    </div>
  );
}

/* ─── Vendor service block (inside Step 2) ───────────────────────────────────── */
function VendorBlock({ serviceType, serviceConfig, vendorData, onChange, onPickVendor, onPickVendorRef }) {
  const { pricingModel, extraFields } = getServiceFields(serviceConfig);
  const pricePerUnit = vendorData.vendor?.price_per_day ? Number(vendorData.vendor.price_per_day) : 0;
  const totalCost = computeVendorTotal(pricingModel, vendorData);

  return (
    <div style={{ background:"rgba(200,175,120,0.03)",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:14,padding:"20px 22px",marginBottom:20 }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
        <div>
          <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(200,175,120,0.5)",marginBottom:4 }}>Service</div>
          <div style={{ fontSize:16,fontWeight:600,color:"#e8dcc8" }}>{serviceType}</div>
        </div>
        <button onClick={()=>onChange({ ...vendorData, enabled: !vendorData.enabled })} style={{ background:vendorData.enabled?"rgba(200,175,120,0.12)":"rgba(200,175,120,0.04)",border:`0.5px solid ${vendorData.enabled?"rgba(200,175,120,0.4)":"rgba(200,175,120,0.15)"}`,borderRadius:20,padding:"5px 14px",fontSize:12,color:vendorData.enabled?"#c8af78":"rgba(200,175,120,0.4)",cursor:"pointer",fontFamily:"inherit" }}>
          {vendorData.enabled ? "✓ Added" : "+ Add"}
        </button>
      </div>

      {vendorData.enabled && (
        <>
          {/* Vendor selector — redirects to the actual vendor listing page */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Vendor</div>
            {vendorData.vendor ? (
              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:10 }}>
                <div style={{ width:40,height:40,borderRadius:7,overflow:"hidden",flexShrink:0,background:"#2a2018" }}>
                  {(vendorData.vendor.portfolio?.[0]?.image_url || vendorData.vendor.photo_url)
                    ? <img src={vendorData.vendor.portfolio?.[0]?.image_url || vendorData.vendor.photo_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                    : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center" }}>📷</div>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:"#e8dcc8" }}>{vendorData.vendor.name}</div>
                  <div style={{ fontSize:11,color:"rgba(200,175,120,0.45)" }}>{vendorData.vendor.specialty||serviceType}</div>
                </div>
                {pricePerUnit>0&&<div style={{ fontSize:12,fontWeight:600,color:"#c8af78" }}>₹{fmt(pricePerUnit)}{pricingModel==="perDay"?"/day":""}</div>}
                <button onClick={onPickVendor} style={{ fontSize:11,color:"rgba(200,175,120,0.45)",background:"none",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit" }}>Change</button>
              </div>
            ) : (
              <button onClick={onPickVendor} style={{ width:"100%",padding:"12px",background:"#1e1a14",border:"0.5px dashed rgba(200,175,120,0.25)",borderRadius:10,fontSize:13,color:"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>
                + Select {serviceType} vendor
              </button>
            )}
          </div>

          {/* Service-specific fields */}
          {extraFields.map(field => (
            <ExtraField key={field.key} field={field} vendorData={vendorData} onChange={onChange} />
          ))}
          {pricingModel === "perDay" && pricePerUnit > 0 && Number(vendorData.days) > 1 && (
            <p style={{ fontSize:11,color:"rgba(200,175,120,0.4)",marginTop:-8,marginBottom:14 }}>= ₹{fmt(totalCost)} total</p>
          )}

          {/* Notes */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Additional notes to vendor</div>
            <textarea value={vendorData.notes||""} onChange={e=>onChange({...vendorData,notes:e.target.value})} placeholder="Specific requirements, style preferences…" rows={2} style={{ width:"100%",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.18)",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#e8dcc8",outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box" }}/>
          </div>

          {/* Vendor-specific reference event — redirects to Explore */}
          <div>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Reference event for this vendor <span style={{ textTransform:"none",letterSpacing:0,color:"rgba(200,175,120,0.3)" }}>(shows vendor what style you want)</span></div>
            {vendorData.reference_event ? (
              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:10 }}>
                {vendorData.reference_event.img&&<img src={vendorData.reference_event.img} style={{ width:48,height:36,objectFit:"cover",borderRadius:6,flexShrink:0 }}/>}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"#e8dcc8" }}>{vendorData.reference_event.title}</div>
                  <div style={{ fontSize:10,color:"rgba(200,175,120,0.4)" }}>{vendorData.reference_event.type} · {vendorData.reference_event.city}</div>
                </div>
                <button onClick={onPickVendorRef} style={{ fontSize:11,color:"rgba(200,175,120,0.45)",background:"none",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit" }}>Change</button>
                <button onClick={()=>onChange({...vendorData,reference_event:null})} style={{ fontSize:11,color:"rgba(200,175,120,0.35)",background:"none",border:"none",cursor:"pointer",padding:"4px 6px" }}>✕</button>
              </div>
            ) : (
              <button onClick={onPickVendorRef} style={{ width:"100%",padding:"10px",background:"#1e1a14",border:"0.5px dashed rgba(200,175,120,0.2)",borderRadius:10,fontSize:12,color:"rgba(200,175,120,0.4)",cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>
                + Pick reference for {serviceType}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── STEP 2 — Vendors ────────────────────────────────────────────────────────── */
function StepVendors({ vendors, vendorSelections, setVendorSelections, onNext, onBack, onPickVendor, onPickVendorRef }) {
  const vendorsForService = (serviceId, includeUnassigned) => vendors.filter(v => {
    const sid = String(v.service_id || "").trim();
    if (sid === String(serviceId)) return true;
    return includeUnassigned && !sid;
  });

  const serviceBlocks = VENDOR_SERVICE_CONFIGS.map(cfg => ({
    key: cfg.id,
    config: cfg,
    vendors: vendorsForService(cfg.serviceId, cfg.includeUnassigned),
  }));

  const anyEnabled = serviceBlocks.some(({ key }) => vendorSelections[key]?.enabled);
  const allOk = serviceBlocks.every(({ key }) => !vendorSelections[key]?.enabled || vendorSelections[key]?.vendor);
  const canNext = anyEnabled && allOk;

  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Select vendors for your event. Toggle a service on to configure it.</p>

      {serviceBlocks.map(({ key, config }) => (
        <VendorBlock
          key={key}
          serviceType={config.title || config.singular || key}
          serviceConfig={config}
          vendorData={vendorSelections[key] || { enabled: false, vendor: null, notes: "", reference_event: null }}
          onChange={data => setVendorSelections(s => ({ ...s, [key]: data }))}
          onPickVendor={() => onPickVendor(key, config)}
          onPickVendorRef={() => onPickVendorRef(key)}
        />
      ))}

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onNext} disabled={!canNext}>Next — View budget</button>
      </div>
      {!canNext&&anyEnabled&&<p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>Please select a vendor for each enabled service.</p>}
      {!anyEnabled&&<p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>Add at least one vendor service to continue.</p>}
    </div>
  );
}

/* ─── STEP 3 — Budget ─────────────────────────────────────────────────────────── */
function StepBudget({ budget, onNext, onBack }) {
  const rows = budget.rows;
  const contingency = budget.contingency;
  const total = budget.total;

  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Your estimated event cost with a 5% contingency buffer</p>

      <div className={styles.budgetCard}>
        <div className={styles.budgetTitle}>Cost breakdown</div>

        {rows.map((r,i)=>(
          <div key={i} className={styles.budgetRow}>
            <div>
              <span className={styles.budgetLabel}>{r.label}</span>
              {r.sub&&<span style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginLeft:8 }}>{r.sub}</span>}
            </div>
            <span className={styles.budgetAmt}>₹{fmt(r.amt)}</span>
          </div>
        ))}

        <div className={styles.budgetRow} style={{ opacity:0.6 }}>
          <span className={styles.budgetLabel}>Contingency (5%)</span>
          <span className={styles.budgetAmt}>₹{fmt(contingency)}</span>
        </div>

        <div className={styles.budgetTotal}>
          <span className={styles.budgetTotalLabel}>Estimated total</span>
          <span className={styles.budgetTotalAmt}>₹{fmt(total)}</span>
        </div>
      </div>

      <div style={{ background:"rgba(200,175,120,0.04)",border:"0.5px solid rgba(200,175,120,0.12)",borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:12,color:"rgba(200,175,120,0.45)",lineHeight:1.7 }}>
        This is an estimate based on vendor rates. Final pricing will be confirmed with each vendor. Advance payment (30%) will be collected once admin approves your event.
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onNext}>Review & submit</button>
      </div>
    </div>
  );
}

/* ─── STEP 4 — Review ─────────────────────────────────────────────────────────── */
function ReviewItem({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex",gap:12,padding:"8px 0",borderBottom:"0.5px solid rgba(200,175,120,0.06)" }}>
      <span style={{ fontSize:11,color:"rgba(200,175,120,0.4)",minWidth:120,flexShrink:0,paddingTop:1 }}>{label}</span>
      <span style={{ fontSize:13,color:"#e8dcc8",lineHeight:1.5 }}>{value}</span>
    </div>
  );
}

function RefImageBlock({ label, event }) {
  if (!event) return null;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.4)",marginBottom:8 }}>{label}</div>
      <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:10 }}>
        {event.img&&<img src={event.img} alt={event.title} style={{ width:64,height:48,objectFit:"cover",borderRadius:7,flexShrink:0 }}/>}
        <div>
          <div style={{ fontSize:13,fontWeight:600,color:"#e8dcc8",marginBottom:2 }}>{event.title}</div>
          <div style={{ fontSize:11,color:"rgba(200,175,120,0.4)" }}>{event.type} · {event.city} · {event.dateLabel}</div>
          {event.price&&<div style={{ fontSize:11,color:"#c8af78",marginTop:2 }}>{event.price}</div>}
        </div>
      </div>
    </div>
  );
}

function StepReview({ form, vendorSelections, budget, submitting, submitError, onBack, onSubmit }) {
  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Review everything before submitting. Your event will be reviewed by admin within 24 hours.</p>

      <div style={{ background:"rgba(200,175,120,0.03)",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:14,padding:"20px 22px",marginBottom:20 }}>
        <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(200,175,120,0.5)",marginBottom:14 }}>Event details</div>
        <ReviewItem label="Event name" value={form.event_name}/>
        <ReviewItem label="Type" value={form.event_type}/>
        <ReviewItem label="Date" value={form.event_date ? new Date(form.event_date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : ""}/>
        <ReviewItem label="Time" value={form.event_time}/>
        <ReviewItem label="Location" value={form.location}/>
        <ReviewItem label="Capacity" value={form.capacity ? `${form.capacity} guests` : ""}/>
        <ReviewItem label="Decoration" value={DECORATION_LOCATIONS.find(l=>l.value===form.decoration_type)?.label}/>
        <div style={{ marginTop:14 }}>
          <RefImageBlock label="Reference event" event={form.reference_event}/>
        </div>
      </div>

      {VENDOR_SERVICE_CONFIGS.map(cfg => {
        const sel = vendorSelections[cfg.id];
        if (!sel?.enabled || !sel?.vendor) return null;
        const { pricingModel, extraFields } = getServiceFields(cfg);
        return (
          <div key={cfg.id} style={{ background:"rgba(200,175,120,0.03)",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:14,padding:"20px 22px",marginBottom:20 }}>
            <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(200,175,120,0.5)",marginBottom:14 }}>{cfg.title || cfg.singular}</div>
            <ReviewItem label="Vendor" value={sel.vendor.name}/>
            {extraFields.map(f => (
              <ReviewItem
                key={f.key}
                label={f.label}
                value={Array.isArray(sel[f.key]) ? sel[f.key].join(", ") : sel[f.key]}
              />
            ))}
            <ReviewItem label="Notes" value={sel.notes}/>
            <ReviewItem label="Rate" value={sel.vendor.price_per_day ? `₹${fmt(sel.vendor.price_per_day)}${pricingModel==="perDay"?" / day":""}` : "To be confirmed"}/>
            {sel.reference_event&&<div style={{ marginTop:14 }}><RefImageBlock label={`Reference for ${cfg.title || cfg.singular}`} event={sel.reference_event}/></div>}
          </div>
        );
      })}

      <div style={{ background:"rgba(200,175,120,0.05)",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:14,padding:"20px 22px",marginBottom:20 }}>
        <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(200,175,120,0.5)",marginBottom:14 }}>Budget summary</div>
        {budget.rows.map((r,i)=>(
          <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"0.5px solid rgba(200,175,120,0.06)",fontSize:13 }}>
            <span style={{ color:"rgba(200,175,120,0.6)" }}>{r.label}{r.sub&&<span style={{ fontSize:11,color:"rgba(200,175,120,0.3)",marginLeft:6 }}>{r.sub}</span>}</span>
            <span style={{ color:"#c8af78",fontWeight:500 }}>₹{fmt(r.amt)}</span>
          </div>
        ))}
        <div style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"0.5px solid rgba(200,175,120,0.06)",fontSize:13,opacity:0.6 }}>
          <span style={{ color:"rgba(200,175,120,0.6)" }}>Contingency (5%)</span>
          <span style={{ color:"#c8af78" }}>₹{fmt(budget.contingency)}</span>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",paddingTop:12,marginTop:4,borderTop:"0.5px solid rgba(200,175,120,0.18)" }}>
          <span style={{ fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(200,175,120,0.45)" }}>Total estimate</span>
          <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:300,color:"#e8dcc8" }}>₹{fmt(budget.total)}</span>
        </div>
      </div>

      {submitError&&<div style={{ background:"rgba(235,87,87,0.1)",border:"0.5px solid rgba(235,87,87,0.3)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#eb5757" }}>{submitError}</div>}

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onSubmit} disabled={submitting} style={{ minWidth:160 }}>
          {submitting ? "Submitting…" : "Submit event →"}
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────────────────────── */
export default function CreateEventPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const prefillEvent = location.state?.referenceEvent ?? null;

  const [step, setStep] = useState(0);
  const [availability, setAvailability] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    event_name: "",
    event_type: prefillEvent?.type || "",
    event_date: "",
    event_time: "18:00",
    location: "",
    capacity: 150,
    decoration_type: "",
    reference_event: prefillEvent || null,
  });

  const [vendorSelections, setVendorSelections] = useState(() =>
    Object.fromEntries(VENDOR_SERVICE_CONFIGS.map(cfg => [
      cfg.id,
      { enabled: false, vendor: null, notes: "", reference_event: null },
    ]))
  );

  // ── Restore draft (if we navigated away to pick a reference event or a
  //    vendor) and merge in whatever was picked on the return trip. ──────
  useEffect(() => {
    const draft = loadEventDraft();
    const pickResult = location.state?.celestePickResult;

    if (draft) {
      setStep(draft.step ?? 0);
      setForm(draft.form);
      setVendorSelections(draft.vendorSelections || {});
    }

    if (pickResult) {
      if (pickResult.type === "globalRef") {
        setForm(f => ({ ...f, reference_event: pickResult.event }));
      } else if (pickResult.type === "vendorRef") {
        setVendorSelections(vs => ({
          ...vs,
          [pickResult.serviceKey]: { ...(vs[pickResult.serviceKey] || {}), reference_event: pickResult.event },
        }));
      } else if (pickResult.type === "vendor") {
        setVendorSelections(vs => ({
          ...vs,
          [pickResult.serviceKey]: { ...(vs[pickResult.serviceKey] || {}), vendor: pickResult.vendor, enabled: true },
        }));
      }
    }

    if (draft || pickResult) {
      clearEventDraft();
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch availability + vendors
  useEffect(() => {
    fetch(`${API}/availability`).then(r=>r.json()).then(d=>setAvailability(Array.isArray(d)?d:[])).catch(()=>{});
    fetch(`${API}/vendors`).then(r=>r.json()).then(async data=>{
      if(!Array.isArray(data)) return;
      const active = data.filter(v=>v.is_active);
      const enriched = await Promise.all(active.map(async v=>{
        try {
          const p = await fetch(`${API}/vendors/${v.id}/portfolio`).then(r=>r.json());
          return { ...v, portfolio: Array.isArray(p)?p:[] };
        } catch { return { ...v, portfolio:[] }; }
      }));
      setAllVendors(enriched);
    }).catch(()=>{});
  }, []);

  // ── Navigation-based pickers ────────────────────────────────────────────
  const handleBrowseReference = () => {
    saveEventDraft(step, form, vendorSelections);
    navigate("/explore", { state: { celestePick: { type: "globalRef" } } });
  };

  const handlePickVendorRef = (serviceKey) => {
    saveEventDraft(step, form, vendorSelections);
    navigate("/explore", { state: { celestePick: { type: "vendorRef", serviceKey } } });
  };

  const handlePickVendor = (serviceKey, serviceConfig) => {
    saveEventDraft(step, form, vendorSelections);
    navigate(serviceConfig.path, { state: { celestePick: { type: "vendor", serviceKey } } });
  };

  const budget = (() => {
    const rows = [];
    for (const cfg of VENDOR_SERVICE_CONFIGS) {
      const sel = vendorSelections[cfg.id];
      if (!sel?.enabled || !sel?.vendor?.price_per_day) continue;
      const { pricingModel } = getServiceFields(cfg);
      const amt = computeVendorTotal(pricingModel, sel);
      const days = Number(sel.days) || 1;
      rows.push({
        label: cfg.title || cfg.singular,
        sub: pricingModel === "perDay" && days > 1 ? `${sel.vendor.name} × ${days} days` : sel.vendor.name,
        amt,
      });
    }
    const subtotal = rows.reduce((s,r)=>s+r.amt, 0);
    const contingency = Math.round(subtotal * 0.05);
    const total = subtotal + contingency;
    return { rows, subtotal, contingency, total };
  })();

  const handleSubmit = useCallback(async () => {
    setSubmitting(true); setSubmitError("");

    const vendorsPayload = [];
    for (const cfg of VENDOR_SERVICE_CONFIGS) {
      const sel = vendorSelections[cfg.id];
      if (!sel?.enabled || !sel?.vendor) continue;
      const { pricingModel, extraFields } = getServiceFields(cfg);
      const quoted_price = computeVendorTotal(pricingModel, sel);
      const entry = {
        vendor_id: sel.vendor.id,
        service_type: cfg.title || cfg.singular,
        quoted_price,
        vendor_notes: sel.notes || "",
        reference_event_id: sel.reference_event?.id || null,
        reference_event_image: sel.reference_event?.img || null,
      };
      for (const f of extraFields) entry[f.key] = sel[f.key];
      vendorsPayload.push(entry);
    }

    const payload = {
      event_name: form.event_name,
      event_type: form.event_type,
      event_date: form.event_date,
      event_time: form.event_time,
      location: form.location,
      capacity: form.capacity,
      decoration_type: form.decoration_type,
      budget_estimate: budget.total,
      client_name: user?.name || "Guest",
      client_email: user?.email || "",
      client_phone: user?.phone || "",
      reference_event_id: form.reference_event?.id || null,
      reference_event_image: form.reference_event?.img || null,
      reference_event_title: form.reference_event?.title || null,
      reference_event_type:  form.reference_event?.type  || null,
      vendors: vendorsPayload,
    };

    try {
      const res = await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("celeste_token") || localStorage.getItem("token")}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success || data.id || res.ok) {
        navigate("/my-events", { state: { eventSuccess: true } });
      } else {
        setSubmitError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Could not connect to server. Please try again.");
    }
    setSubmitting(false);
  }, [form, vendorSelections, budget, user, navigate]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={()=>step>0?setStep(s=>s-1):navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 12L6 8l4-4"/></svg>
          {step > 0 ? "Back" : "Home"}
        </button>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Plan <em>Event</em></h1>
        </div>
      </header>

      <nav className={styles.stepNav}>
        {STEPS.map((label, i) => (
          <button
            key={label}
            className={`${styles.stepPill} ${i === step ? styles.stepActive : ""} ${i < step ? styles.stepDone : ""}`}
            onClick={() => i < step && setStep(i)}
          >
            {i < step && <span className={styles.checkMark}>✓</span>}
            {label}
          </button>
        ))}
      </nav>
      <div className={styles.shimmerLine}/>

      <main className={styles.body}>
        {step === 0 && (
          <StepBasics
            form={form}
            setForm={setForm}
            availability={availability}
            onNext={() => setStep(1)}
            onBrowseReference={handleBrowseReference}
          />
        )}
        {step === 1 && (
          <StepVendors
            vendors={allVendors}
            vendorSelections={vendorSelections}
            setVendorSelections={setVendorSelections}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
            onPickVendor={handlePickVendor}
            onPickVendorRef={handlePickVendorRef}
          />
        )}
        {step === 2 && (
          <StepBudget
            budget={budget}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepReview
            form={form}
            vendorSelections={vendorSelections}
            budget={budget}
            submitting={submitting}
            submitError={submitError}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
          />
        )}
      </main>
    </div>
  );
}