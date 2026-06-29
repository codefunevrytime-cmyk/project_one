import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { eventsData } from "../context/data/eventsData";
import { EVENT_CATEGORIES } from "../context/data/events";
import styles from "./CreateEventPage.module.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

const PHOTOGRAPHY_TYPES = [
  "Candid","Traditional","Pre-Wedding","Drone Coverage",
  "Cinematic Film","Reels / Shorts","Photo Booth","Live Screening",
];

const INVITATION_TYPES = [
  "Digital Invite","Printed Cards","Luxury Box",
  "Save The Date","Wedding Website","Foil Print","Handmade",
];

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

/* ─── Reference Event Picker Modal ───────────────────────────────────────────── */
function RefEventModal({ bookmarkedIds, onSelect, onClose, title="Pick a reference event" }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("explore"); // "explore" | "bookmarks"

  const bookmarkedEvents = eventsData.filter(e => bookmarkedIds.includes(String(e.id)) || bookmarkedIds.includes(e.id));
  const displayList = tab === "bookmarks" ? bookmarkedEvents : eventsData;
  const filtered = displayList.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#1c1812",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:16,width:"100%",maxWidth:720,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px",borderBottom:"0.5px solid rgba(200,175,120,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <div style={{ fontSize:15,fontWeight:600,color:"#e8dcc8" }}>{title}</div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(200,175,120,0.4)",fontSize:20,lineHeight:1 }}>✕</button>
        </div>
        {/* Tabs + Search */}
        <div style={{ padding:"12px 24px",borderBottom:"0.5px solid rgba(200,175,120,0.08)",display:"flex",alignItems:"center",gap:12,flexShrink:0,flexWrap:"wrap" }}>
          {["explore","bookmarks"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ background:tab===t?"rgba(200,175,120,0.12)":"none",border:`0.5px solid ${tab===t?"rgba(200,175,120,0.4)":"rgba(200,175,120,0.12)"}`,borderRadius:20,padding:"5px 14px",fontSize:12,color:tab===t?"#c8af78":"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize" }}>
              {t==="bookmarks"?`Bookmarks (${bookmarkedEvents.length})`:t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events…" style={{ marginLeft:"auto",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:8,padding:"7px 12px",fontSize:12,color:"#e8dcc8",outline:"none",fontFamily:"inherit",width:180 }}/>
        </div>
        {/* Grid */}
        <div style={{ overflowY:"auto",padding:16,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
          {filtered.length===0&&<div style={{ gridColumn:"1/-1",textAlign:"center",padding:40,color:"rgba(200,175,120,0.3)",fontSize:13 }}>No events found</div>}
          {filtered.map(ev=>(
            <div key={ev.id} onClick={()=>onSelect(ev)} style={{ cursor:"pointer",borderRadius:10,overflow:"hidden",border:"0.5px solid rgba(200,175,120,0.12)",background:"#211c14",transition:"border-color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(200,175,120,0.4)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(200,175,120,0.12)"}>
              <div style={{ height:110,overflow:"hidden",position:"relative" }}>
                {ev.img ? <img src={ev.img} alt={ev.title} style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,background:"#2a2018" }}>{getEmoji(ev.type)}</div>}
                <div style={{ position:"absolute",bottom:6,left:8,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#c8af78",background:"rgba(0,0,0,0.65)",padding:"2px 8px",borderRadius:20 }}>{ev.type}</div>
              </div>
              <div style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:12,fontWeight:600,color:"#e8dcc8",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ev.title}</div>
                <div style={{ fontSize:10,color:"rgba(200,175,120,0.4)" }}>{ev.city} · {ev.dateLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Vendor Picker Modal ─────────────────────────────────────────────────────── */
function VendorPickerModal({ vendors, bookmarkedIds, serviceType, onSelect, onClose }) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  // bookmarked vendors: those with id prefixed db_ in bookmarkedIds
  const bookmarkedVendorDbIds = bookmarkedIds
    .filter(id => String(id).startsWith("db_"))
    .map(id => String(id).replace("db_",""));
  const bookmarkedVendors = vendors.filter(v => bookmarkedVendorDbIds.includes(String(v.id)));

  const displayList = tab === "bookmarks" ? bookmarkedVendors : vendors;
  const filtered = displayList.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#1c1812",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:16,width:"100%",maxWidth:640,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ padding:"20px 24px",borderBottom:"0.5px solid rgba(200,175,120,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
          <div style={{ fontSize:15,fontWeight:600,color:"#e8dcc8" }}>Choose {serviceType} vendor</div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(200,175,120,0.4)",fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:"12px 24px",borderBottom:"0.5px solid rgba(200,175,120,0.08)",display:"flex",alignItems:"center",gap:12,flexShrink:0,flexWrap:"wrap" }}>
          {["all","bookmarks"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ background:tab===t?"rgba(200,175,120,0.12)":"none",border:`0.5px solid ${tab===t?"rgba(200,175,120,0.4)":"rgba(200,175,120,0.12)"}`,borderRadius:20,padding:"5px 14px",fontSize:12,color:tab===t?"#c8af78":"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize" }}>
              {t==="bookmarks"?`Bookmarks (${bookmarkedVendors.length})`:t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ marginLeft:"auto",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:8,padding:"7px 12px",fontSize:12,color:"#e8dcc8",outline:"none",fontFamily:"inherit",width:160 }}/>
        </div>
        <div style={{ overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10 }}>
          {filtered.length===0&&<div style={{ textAlign:"center",padding:40,color:"rgba(200,175,120,0.3)",fontSize:13 }}>No vendors found</div>}
          {filtered.map(v=>{
            const cover = v.portfolio?.[0]?.image_url || v.photo_url;
            return (
              <div key={v.id} onClick={()=>onSelect(v)} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderRadius:10,border:"0.5px solid rgba(200,175,120,0.12)",background:"#211c14",cursor:"pointer",transition:"border-color 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(200,175,120,0.4)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(200,175,120,0.12)"}>
                <div style={{ width:52,height:52,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#2a2018" }}>
                  {cover?<img src={cover} alt={v.name} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>📷</div>}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:"#e8dcc8",marginBottom:2 }}>{v.name}</div>
                  <div style={{ fontSize:11,color:"rgba(200,175,120,0.45)" }}>{v.specialty||serviceType}</div>
                </div>
                {v.price_per_day&&<div style={{ fontSize:13,fontWeight:600,color:"#c8af78",flexShrink:0 }}>₹{fmt(v.price_per_day)}<span style={{ fontSize:10,color:"rgba(200,175,120,0.4)",fontWeight:400 }}>/day</span></div>}
              </div>
            );
          })}
        </div>
      </div>
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
function StepBasics({ form, setForm, availability, bookmarkedIds, onNext }) {
  const [showRefModal, setShowRefModal] = useState(false);

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
              <button onClick={()=>setShowRefModal(true)} style={{ marginTop:8,background:"rgba(200,175,120,0.1)",border:"0.5px solid rgba(200,175,120,0.3)",borderRadius:8,padding:"8px 18px",fontSize:12,color:"#c8af78",cursor:"pointer",fontFamily:"inherit" }}>Browse events</button>
            </div>
          )}

          {form.reference_event && (
            <button onClick={()=>setShowRefModal(true)} style={{ marginTop:10,width:"100%",background:"none",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:8,padding:"7px 0",fontSize:12,color:"rgba(200,175,120,0.5)",cursor:"pointer",fontFamily:"inherit" }}>Change reference</button>
          )}
        </div>
      </div>

      {showRefModal && <RefEventModal bookmarkedIds={bookmarkedIds} onSelect={ev=>{setF("reference_event")(ev);setShowRefModal(false);}} onClose={()=>setShowRefModal(false)}/>}
    </div>
  );
}

/* ─── Vendor service block (inside Step 2) ───────────────────────────────────── */
function VendorBlock({ serviceType, serviceId, vendors, bookmarkedIds, vendorData, onChange }) {
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showRefModal, setShowRefModal] = useState(false);

  const isPhotography = serviceType === "Photography";
  const coverTypes = isPhotography ? PHOTOGRAPHY_TYPES : INVITATION_TYPES;
  const svcVendors = vendors.filter(v => String(v.service_id) === String(serviceId));

  const toggle = (key, val) => {
    const arr = vendorData[key] || [];
    onChange({ ...vendorData, [key]: arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val] });
  };

  const pricePerDay = vendorData.vendor?.price_per_day ? Number(vendorData.vendor.price_per_day) : 0;
  const days = isPhotography ? (Number(vendorData.days) || 1) : 1;
  const totalCost = pricePerDay * days;

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
          {/* Vendor selector */}
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
                {pricePerDay>0&&<div style={{ fontSize:12,fontWeight:600,color:"#c8af78" }}>₹{fmt(pricePerDay)}/day</div>}
                <button onClick={()=>setShowVendorModal(true)} style={{ fontSize:11,color:"rgba(200,175,120,0.45)",background:"none",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit" }}>Change</button>
              </div>
            ) : (
              <button onClick={()=>setShowVendorModal(true)} style={{ width:"100%",padding:"12px",background:"#1e1a14",border:"0.5px dashed rgba(200,175,120,0.25)",borderRadius:10,fontSize:13,color:"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>
                + Select {serviceType} vendor
              </button>
            )}
          </div>

          {/* Service-specific fields */}
          {isPhotography ? (
            <>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Number of days</div>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <button onClick={()=>onChange({...vendorData,days:Math.max(1,(Number(vendorData.days)||1)-1)})} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(200,175,120,0.08)",border:"0.5px solid rgba(200,175,120,0.2)",color:"#c8af78",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                  <span style={{ fontSize:16,fontWeight:600,color:"#e8dcc8",minWidth:24,textAlign:"center" }}>{vendorData.days||1}</span>
                  <button onClick={()=>onChange({...vendorData,days:(Number(vendorData.days)||1)+1})} style={{ width:32,height:32,borderRadius:"50%",background:"rgba(200,175,120,0.08)",border:"0.5px solid rgba(200,175,120,0.2)",color:"#c8af78",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                  {pricePerDay>0&&<span style={{ fontSize:11,color:"rgba(200,175,120,0.4)",marginLeft:8 }}>= ₹{fmt(totalCost)} total</span>}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Coverage types <span style={{ textTransform:"none",letterSpacing:0,color:"rgba(200,175,120,0.3)" }}>(select all that apply)</span></div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {coverTypes.map(t=>{
                    const sel=(vendorData.coverage_types||[]).includes(t);
                    return <button key={t} onClick={()=>toggle("coverage_types",t)} style={{ fontSize:11,padding:"5px 12px",borderRadius:20,border:`0.5px solid ${sel?"rgba(200,175,120,0.45)":"rgba(200,175,120,0.15)"}`,background:sel?"rgba(200,175,120,0.1)":"none",color:sel?"#c8af78":"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s" }}>{t}</button>;
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Invitation types</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {coverTypes.map(t=>{
                    const sel=(vendorData.coverage_types||[]).includes(t);
                    return <button key={t} onClick={()=>toggle("coverage_types",t)} style={{ fontSize:11,padding:"5px 12px",borderRadius:20,border:`0.5px solid ${sel?"rgba(200,175,120,0.45)":"rgba(200,175,120,0.15)"}`,background:sel?"rgba(200,175,120,0.1)":"none",color:sel?"#c8af78":"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s" }}>{t}</button>;
                  })}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Quantity</div>
                <input type="number" min={1} placeholder="e.g. 200" value={vendorData.quantity||""} onChange={e=>onChange({...vendorData,quantity:e.target.value})} style={{ background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.18)",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#e8dcc8",outline:"none",fontFamily:"inherit",width:140 }}/>
              </div>
            </>
          )}

          {/* Notes */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Additional notes to vendor</div>
            <textarea value={vendorData.notes||""} onChange={e=>onChange({...vendorData,notes:e.target.value})} placeholder="Specific requirements, style preferences…" rows={2} style={{ width:"100%",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.18)",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#e8dcc8",outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box" }}/>
          </div>

          {/* Vendor-specific reference event */}
          <div>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Reference event for this vendor <span style={{ textTransform:"none",letterSpacing:0,color:"rgba(200,175,120,0.3)" }}>(shows vendor what style you want)</span></div>
            {vendorData.reference_event ? (
              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.2)",borderRadius:10 }}>
                {vendorData.reference_event.img&&<img src={vendorData.reference_event.img} style={{ width:48,height:36,objectFit:"cover",borderRadius:6,flexShrink:0 }}/>}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"#e8dcc8" }}>{vendorData.reference_event.title}</div>
                  <div style={{ fontSize:10,color:"rgba(200,175,120,0.4)" }}>{vendorData.reference_event.type} · {vendorData.reference_event.city}</div>
                </div>
                <button onClick={()=>setShowRefModal(true)} style={{ fontSize:11,color:"rgba(200,175,120,0.45)",background:"none",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit" }}>Change</button>
                <button onClick={()=>onChange({...vendorData,reference_event:null})} style={{ fontSize:11,color:"rgba(200,175,120,0.35)",background:"none",border:"none",cursor:"pointer",padding:"4px 6px" }}>✕</button>
              </div>
            ) : (
              <button onClick={()=>setShowRefModal(true)} style={{ width:"100%",padding:"10px",background:"#1e1a14",border:"0.5px dashed rgba(200,175,120,0.2)",borderRadius:10,fontSize:12,color:"rgba(200,175,120,0.4)",cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>
                + Pick reference for {serviceType}
              </button>
            )}
          </div>
        </>
      )}

      {showVendorModal&&<VendorPickerModal vendors={svcVendors} bookmarkedIds={bookmarkedIds} serviceType={serviceType} onSelect={v=>{onChange({...vendorData,vendor:v});setShowVendorModal(false);}} onClose={()=>setShowVendorModal(false)}/>}
      {showRefModal&&<RefEventModal bookmarkedIds={bookmarkedIds} title={`Reference for ${serviceType}`} onSelect={ev=>{onChange({...vendorData,reference_event:ev});setShowRefModal(false);}} onClose={()=>setShowRefModal(false)}/>}
    </div>
  );
}

/* ─── STEP 2 — Vendors ────────────────────────────────────────────────────────── */
function StepVendors({ vendors, vendorSelections, setVendorSelections, bookmarkedIds, onNext, onBack }) {
  const photoVendors = vendors.filter(v => String(v.service_id) === "1");
  const inviteVendors = vendors.filter(v => String(v.service_id) === "5");

  const atLeastOne = vendorSelections.photography.enabled || vendorSelections.invitations.enabled;
  const photoOk = !vendorSelections.photography.enabled || vendorSelections.photography.vendor;
  const inviteOk = !vendorSelections.invitations.enabled || vendorSelections.invitations.vendor;
  const canNext = atLeastOne && photoOk && inviteOk;

  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Select vendors for your event. Toggle a service on to configure it.</p>

      <VendorBlock
        serviceType="Photography"
        serviceId="1"
        vendors={photoVendors}
        bookmarkedIds={bookmarkedIds}
        vendorData={vendorSelections.photography}
        onChange={data=>setVendorSelections(s=>({...s,photography:data}))}
      />

      <VendorBlock
        serviceType="Custom Invitations"
        serviceId="5"
        vendors={inviteVendors}
        bookmarkedIds={bookmarkedIds}
        vendorData={vendorSelections.invitations}
        onChange={data=>setVendorSelections(s=>({...s,invitations:data}))}
      />

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onNext} disabled={!canNext}>Next — View budget</button>
      </div>
      {!canNext&&atLeastOne&&<p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>Please select a vendor for each enabled service.</p>}
      {!atLeastOne&&<p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>Add at least one vendor service to continue.</p>}
    </div>
  );
}

/* ─── STEP 3 — Budget ─────────────────────────────────────────────────────────── */
function StepBudget({ form, vendorSelections, budget, onNext, onBack }) {
  const rows = budget.rows;
  const subtotal = budget.subtotal;
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
        This is an estimate based on vendor day rates. Final pricing will be confirmed with each vendor. Advance payment (30%) will be collected once admin approves your event.
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
  const photoSel = vendorSelections.photography;
  const inviteSel = vendorSelections.invitations;

  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Review everything before submitting. Your event will be reviewed by admin within 24 hours.</p>

      {/* Event details */}
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

      {/* Photography */}
      {photoSel.enabled && photoSel.vendor && (
        <div style={{ background:"rgba(200,175,120,0.03)",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:14,padding:"20px 22px",marginBottom:20 }}>
          <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(200,175,120,0.5)",marginBottom:14 }}>Photography</div>
          <ReviewItem label="Vendor" value={photoSel.vendor.name}/>
          <ReviewItem label="Days" value={photoSel.days ? `${photoSel.days} day${photoSel.days>1?"s":""}` : "1 day"}/>
          <ReviewItem label="Coverage" value={(photoSel.coverage_types||[]).join(", ") || "—"}/>
          <ReviewItem label="Notes" value={photoSel.notes}/>
          <ReviewItem label="Rate" value={photoSel.vendor.price_per_day ? `₹${fmt(photoSel.vendor.price_per_day)} / day` : "To be confirmed"}/>
          {photoSel.reference_event&&<div style={{ marginTop:14 }}><RefImageBlock label="Reference for Photography" event={photoSel.reference_event}/></div>}
        </div>
      )}

      {/* Invitations */}
      {inviteSel.enabled && inviteSel.vendor && (
        <div style={{ background:"rgba(200,175,120,0.03)",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:14,padding:"20px 22px",marginBottom:20 }}>
          <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(200,175,120,0.5)",marginBottom:14 }}>Custom Invitations</div>
          <ReviewItem label="Vendor" value={inviteSel.vendor.name}/>
          <ReviewItem label="Type" value={(inviteSel.coverage_types||[]).join(", ") || "—"}/>
          <ReviewItem label="Quantity" value={inviteSel.quantity ? `${inviteSel.quantity} pieces` : "—"}/>
          <ReviewItem label="Notes" value={inviteSel.notes}/>
          {inviteSel.reference_event&&<div style={{ marginTop:14 }}><RefImageBlock label="Reference for Invitations" event={inviteSel.reference_event}/></div>}
        </div>
      )}

      {/* Budget summary */}
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
  const { user, bookmarkedEventIds } = useAuth();

  const prefillEvent = location.state?.referenceEvent ?? null;

  const [step, setStep] = useState(0);
  const [availability, setAvailability] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Step 1 form
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

  // Step 2 vendor selections
  const [vendorSelections, setVendorSelections] = useState({
    photography: { enabled: false, vendor: null, days: 1, coverage_types: [], notes: "", reference_event: null },
    invitations:  { enabled: false, vendor: null, coverage_types: [], quantity: "", notes: "", reference_event: null },
  });

  // Fetch availability + vendors
  useEffect(() => {
    fetch(`${API}/api/availability`).then(r=>r.json()).then(d=>setAvailability(Array.isArray(d)?d:[])).catch(()=>{});
    fetch(`${API}/api/vendors`).then(r=>r.json()).then(async data=>{
      if(!Array.isArray(data)) return;
      const active = data.filter(v=>v.is_active);
      const enriched = await Promise.all(active.map(async v=>{
        try {
          const p = await fetch(`${API}/api/vendors/${v.id}/portfolio`).then(r=>r.json());
          return { ...v, portfolio: Array.isArray(p)?p:[] };
        } catch { return { ...v, portfolio:[] }; }
      }));
      setAllVendors(enriched);
    }).catch(()=>{});
  }, []);

  // Compute budget
  const budget = (() => {
    const rows = [];
    const ps = vendorSelections.photography;
    const is = vendorSelections.invitations;
    if (ps.enabled && ps.vendor?.price_per_day) {
      const days = Number(ps.days) || 1;
      rows.push({ label: "Photography", sub: `${ps.vendor.name} × ${days} day${days>1?"s":""}`, amt: Number(ps.vendor.price_per_day) * days });
    }
    if (is.enabled && is.vendor?.price_per_day) {
      rows.push({ label: "Custom Invitations", sub: is.vendor.name, amt: Number(is.vendor.price_per_day) });
    }
    const subtotal = rows.reduce((s,r)=>s+r.amt, 0);
    const contingency = Math.round(subtotal * 0.05);
    const total = subtotal + contingency;
    return { rows, subtotal, contingency, total };
  })();

  const handleSubmit = useCallback(async () => {
    setSubmitting(true); setSubmitError("");

    const ps = vendorSelections.photography;
    const is = vendorSelections.invitations;

    const vendorsPayload = [];
    if (ps.enabled && ps.vendor) {
      vendorsPayload.push({
        vendor_id: ps.vendor.id,
        service_type: "Photography",
        quoted_price: Number(ps.vendor.price_per_day||0) * (Number(ps.days)||1),
        vendor_notes: ps.notes || "",
        coverage_types: ps.coverage_types,
        days: ps.days || 1,
        reference_event_id: ps.reference_event?.id || null,
        reference_event_image: ps.reference_event?.img || null,
      });
    }
    if (is.enabled && is.vendor) {
      vendorsPayload.push({
        vendor_id: is.vendor.id,
        service_type: "Custom Invitations",
        quoted_price: Number(is.vendor.price_per_day||0),
        vendor_notes: is.notes || "",
        coverage_types: is.coverage_types,
        quantity: is.quantity,
        reference_event_id: is.reference_event?.id || null,
        reference_event_image: is.reference_event?.img || null,
      });
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
      const res = await fetch(`${API}/api/events`, {
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

      {/* Step nav */}
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
            bookmarkedIds={bookmarkedEventIds || []}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepVendors
            vendors={allVendors}
            vendorSelections={vendorSelections}
            setVendorSelections={setVendorSelections}
            bookmarkedIds={bookmarkedEventIds || []}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepBudget
            form={form}
            vendorSelections={vendorSelections}
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