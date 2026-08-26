import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { EVENT_CATEGORIES } from "../context/data/events";
import styles from "./CreateEventPage.module.css";
import { VENDOR_SERVICE_CONFIGS } from "../context/data/vendorServiceConfig";
import { VendorAvailabilityNote } from "../components/VendorAvailabilityNote";


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

// Case-insensitive matcher so a reference event's `type` (sourced from the
// gallery/DB `event_type` column) reliably maps onto one of the fixed
// EVENT_TYPES dropdown options, regardless of how it was cased when the
// admin created the gallery row (e.g. "sports" or "SPORTS" -> "Sports").
function matchEventType(rawType) {
  if (!rawType) return null;
  const found = EVENT_TYPES.find(
    t => t.toLowerCase() === String(rawType).trim().toLowerCase()
  );
  return found || null;
}

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
  const prices = vendorData.vendor?.prices || {};
  const selectedServices = vendorData.coverage_types || [];

  let base;
  if (selectedServices.length > 0) {
    // Sum the actual per-service prices the vendor set in their profile
    base = selectedServices.reduce((sum, svc) => sum + (Number(prices[svc]) || 0), 0);
  } else {
    // No sub-service picked yet — fall back to the vendor's average price
    base = vendorData.vendor?.price_per_day ? Number(vendorData.vendor.price_per_day) : 0;
  }

  if (pricingModel === "flat") return base;
  const days = Number(vendorData.days) || 1;
  return base * days;
}

/* ─── Reference-event price parsing ───────────────────────────────────────────
   `form.reference_event.price` comes from the events DB/explore page as a
   display-ready string, e.g. "₹20,000", "₹20,000 - ₹35,000", or occasionally
   a bare number. The budget step never parsed this at all, so a picked
   reference event's own price silently never made it into the estimated
   total. This pulls the first number out of that string (the lower bound,
   if it's a range) so it can be added to the budget like any other line
   item. ─────────────────────────────────────────────────────────────── */
function parsePriceString(priceStr) {
  if (priceStr == null) return 0;
  if (typeof priceStr === "number") return priceStr;
  const match = String(priceStr).replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
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

/* ─── Reference source picker ──────────────────────────────────────────────────
   Triggered by "Browse events" / "Change reference" on Step 1. Gives the
   client a choice: pull from our curated gallery (existing /explore
   navigation flow) or upload their own reference photo from their device.
   Uploads go to POST {API}/upload/reference (multipart) and come back as a
   plain URL, which gets wrapped into the same shape a gallery reference_event
   already has (img/title/type/city/dateLabel/price) so every downstream
   consumer — budget calc, review step, admin panel — keeps working untouched.
   `isCustom: true` is the only new field, and it's what the admin panel and
   review step use to know this didn't come from the gallery. ─────────────── */
function ReferenceSourceModal({ open, onClose, onBrowse, onUploadComplete }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large — please choose one under 8MB.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/upload/reference`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");

      onUploadComplete({
  id: null,
  img: data.url.startsWith("http")
    ? data.url
    : `${API_URL.replace(/\/api\/?$/, "")}${data.url}`,
  title: file.name.replace(/\.[^/.]+$/, ""),
  type: "",
  city: "",
  dateLabel: "",
  price: null,
  isCustom: true,
});
      onClose();
    } catch {
      setError("Could not upload that image. Please try again.");
    }
    setUploading(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,8,5,0.72)",
        backdropFilter: "blur(3px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380, background: "#1e1a14",
          border: "0.5px solid rgba(200,175,120,0.25)", borderRadius: 16,
          padding: "24px 22px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e8dcc8", marginBottom: 4 }}>
          Choose a reference
        </div>
        <p style={{ fontSize: 12, color: "rgba(200,175,120,0.45)", marginBottom: 18, lineHeight: 1.6 }}>
          Pick something from our collection, or upload a photo of your own.
        </p>

        <button
          onClick={() => { onClose(); onBrowse(); }}
          style={{
            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
            background: "rgba(200,175,120,0.06)", border: "0.5px solid rgba(200,175,120,0.2)",
            borderRadius: 10, padding: "13px 14px", marginBottom: 10, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 18 }}>🖼️</span>
          <span>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e8dcc8" }}>Browse our collection</div>
            <div style={{ fontSize: 11, color: "rgba(200,175,120,0.4)" }}>Pick from events we've done before</div>
          </span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
            background: "rgba(200,175,120,0.06)", border: "0.5px solid rgba(200,175,120,0.2)",
            borderRadius: 10, padding: "13px 14px", marginBottom: 6,
            cursor: uploading ? "wait" : "pointer", fontFamily: "inherit",
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: 18 }}>📤</span>
          <span>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e8dcc8" }}>
              {uploading ? "Uploading…" : "Upload your own image"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(200,175,120,0.4)" }}>
              Something you saw elsewhere — Pinterest, Instagram, a photo you took
            </div>
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {error && (
          <p style={{ fontSize: 11.5, color: "#eb5757", marginTop: 8, marginBottom: 0 }}>{error}</p>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: 14, background: "none", border: "none",
            fontSize: 12, color: "rgba(200,175,120,0.4)", cursor: "pointer", fontFamily: "inherit", padding: "6px 0",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Decoration venue picker — the "secondary screen with real images"
   that replaces the old emoji-only dropdown. Opened whenever the client
   picks a category (home/lawn/hotel/restaurant/banquet/outdoor) from the
   "Decoration location" dropdown on Step 1. Fetches real admin-uploaded
   photos for that category from GET /api/decoration-venues?type=... (see
   server/routes/decorationVenues.js) and lets the client pick one specific
   look, which then gets stored on form.decoration_venue and carried
   through Review + the final submit payload. ─────────────────────────── */
function DecorationVenuePicker({ open, venueType, onClose, onSelect }) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !venueType) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API}/decoration-venues?type=${encodeURIComponent(venueType)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setVenues(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setError("Could not load venue photos. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, venueType]);

  if (!open) return null;

  const label = DECORATION_LOCATIONS.find(l => l.value === venueType)?.label || venueType;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,8,5,0.78)",
        backdropFilter: "blur(3px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 740, maxHeight: "84vh", overflowY: "auto",
          background: "#1e1a14", border: "0.5px solid rgba(200,175,120,0.25)",
          borderRadius: 16, padding: "24px 24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e8dcc8" }}>Choose a {label} look</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(200,175,120,0.5)", fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "rgba(200,175,120,0.45)", marginBottom: 18 }}>
          Pick a real setup from past events — this helps vendors understand the exact style you want.
        </p>

        {loading && (
          <p style={{ fontSize: 13, color: "rgba(200,175,120,0.4)", padding: "30px 0", textAlign: "center" }}>Loading photos…</p>
        )}
        {error && !loading && (
          <p style={{ fontSize: 12, color: "#eb5757" }}>{error}</p>
        )}

        {!loading && !error && venues.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 10px", color: "rgba(200,175,120,0.4)", fontSize: 13 }}>
            No photos uploaded yet for {label}. You can still continue — admin will follow up with options.
          </div>
        )}

        {!loading && !error && venues.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {venues.map(v => (
              <div
                key={v.id}
                onClick={() => onSelect(v)}
                style={{
                  cursor: "pointer", borderRadius: 12, overflow: "hidden",
                  border: "0.5px solid rgba(200,175,120,0.18)", background: "#15120d",
                  transition: "border-color 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,175,120,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(200,175,120,0.18)"; }}
              >
                <div style={{ height: 120, background: "#0f0d0a" }}>
                  <img src={v.image_url} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "9px 11px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#e8dcc8", marginBottom: v.description ? 2 : 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.title}
                  </div>
                  {v.description && (
                    <div style={{ fontSize: 11, color: "rgba(200,175,120,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: 18, background: "none",
            border: "0.5px solid rgba(200,175,120,0.2)", borderRadius: 8,
            padding: "9px 0", fontSize: 12, color: "rgba(200,175,120,0.5)",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ─── STEP 1 — Basics ─────────────────────────────────────────────────────────── */
function StepBasics({ form, setForm, availability, onNext, onSkipToVendors, onBrowseReference, onOpenDecorationPicker }) {
  // ── Skip logic ─────────────────────────────────────────────────────────
  // "Skip to Vendors" is only meant for a client who hasn't touched this
  // step at all and just wants to jump straight to picking vendors. The
  // moment ANY of these fields has something in it, the normal rules apply
  // again and everything (including the reference event) must be filled in
  // to move forward — no partial skipping. `additional_details` is exempt
  // from both checks; it's always optional.
  const basicsFields = [
    form.event_name,
    form.event_type,
    form.event_date,
    form.location,
    form.reference_event,
  ];
  const filledCount = basicsFields.filter(v => v !== null && v !== undefined && v !== "").length;
  const isCompletelyEmpty = filledCount === 0;
  const isFullyFilled = filledCount === basicsFields.length;

  const canNext = isFullyFilled;
  const canSkip = isCompletelyEmpty;

  const setF = key => val => setForm(f => ({ ...f, [key]: val }));
  const setE = key => e => setF(key)(e.target.value);

  // Decoration category change: switching category invalidates whatever
  // specific venue photo was previously picked (it belonged to the old
  // category), then — if a real category was chosen (not "None") — opens
  // the real-photo picker straight away so choosing a category always
  // flows into choosing a look, instead of leaving it as a bare dropdown.
  const handleDecorationTypeChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, decoration_type: val, decoration_venue: null }));
    if (val) onOpenDecorationPicker(val);
  };

  const decorationLabel = DECORATION_LOCATIONS.find(l => l.value === form.decoration_type)?.label;

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
            <select className={styles.input} value={form.decoration_type} onChange={handleDecorationTypeChange}>
              {DECORATION_LOCATIONS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
            </select>

            {form.decoration_type && (
              form.decoration_venue ? (
                <div style={{
                  marginTop: 10, display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", background: "#1e1a14",
                  border: "0.5px solid rgba(200,175,120,0.2)", borderRadius: 10,
                }}>
                  <img
                    src={form.decoration_venue.image_url}
                    alt={form.decoration_venue.title}
                    style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#e8dcc8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {form.decoration_venue.title}
                    </div>
                    <div style={{ fontSize: 10.5, color: "rgba(200,175,120,0.4)" }}>Decoration reference</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDecorationPicker(form.decoration_type)}
                    style={{ fontSize: 11, color: "rgba(200,175,120,0.5)", background: "none", border: "0.5px solid rgba(200,175,120,0.2)", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenDecorationPicker(form.decoration_type)}
                  style={{
                    marginTop: 10, width: "100%", background: "rgba(200,175,120,0.06)",
                    border: "0.5px dashed rgba(200,175,120,0.3)", borderRadius: 8,
                    padding: "9px 0", fontSize: 12, color: "#c8af78", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  🖼️ Browse {decorationLabel} photos
                </button>
              )
            )}
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

          {/* Standalone skip action — kept out of btnRow (which is styled for
              exactly one/two buttons) so it always renders full-width and
              visible, instead of being squashed/hidden by CSS meant for the
              primary/secondary pair. */}
          <button
            type="button"
            onClick={onSkipToVendors}
            disabled={!canSkip}
            title="Only booking vendors? Skip the reference event and jump straight to Vendors."
            style={{
              marginTop: 10,
              width: "100%",
              background: "rgba(200,175,120,0.07)",
              border: "0.5px dashed rgba(200,175,120,0.35)",
              borderRadius: 8,
              padding: "11px 0",
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: "0.03em",
              fontFamily: "inherit",
              color: canSkip ? "#c8af78" : "rgba(200,175,120,0.25)",
              cursor: canSkip ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            ⏭ Skip to Vendors — I only need to book vendors
          </button>

          {!canNext && (
            <p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>
              {canSkip
                ? "Just here to book vendors? Use “Skip to Vendors” above — no need to fill anything in first."
                : "Once you start filling this in, all fields (including the reference event) are required to continue. Clear everything to use “Skip to Vendors” instead."}
            </p>
          )}
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
                  ? (
                    <a href={form.reference_event.img} target="_blank" rel="noreferrer" title="View full size" style={{ display:"block",width:"100%",height:"100%" }}>
                      <img src={form.reference_event.img} alt={form.reference_event.title} style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:"10px 10px 0 0" }}/>
                    </a>
                  )
                  : <span style={{ fontSize:56 }}>{getEmoji(form.reference_event.type)}</span>}
              </div>
              <div className={styles.refPanelCostBar}>
                <span className={styles.refPanelCostLabel}>
                  {form.reference_event.isCustom ? "Your uploaded reference" : form.reference_event.type}
                </span>
                {/* FIX (Option 1): a gallery reference always has `price`,
                    but a client-uploaded photo never does — it's just an
                    image, not a priced DB event. Previously nothing rendered
                    here at all for a custom upload, so the client had no
                    idea their reference wasn't contributing to the budget.
                    Now it explicitly says so instead of showing nothing. */}
                {form.reference_event.price ? (
                  <span className={styles.refPanelCostAmt}>{form.reference_event.price}</span>
                ) : form.reference_event.isCustom ? (
                  <span style={{ fontSize:11, color:"rgba(200,175,120,0.45)", fontStyle:"italic" }}>
                    Price to be quoted
                  </span>
                ) : null}
              </div>
              <div className={styles.refPanelInfo}>
                <div className={styles.refName}>{form.reference_event.title}</div>
                {(form.reference_event.city || form.reference_event.dateLabel) && (
                  <div className={styles.refMeta}>{form.reference_event.city}{form.reference_event.city && form.reference_event.dateLabel ? " · " : ""}{form.reference_event.dateLabel}</div>
                )}
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

           {/* ── Additional details / instructions box ─────────────────────────
      Fills whatever vertical space is left in the right column. The
      outer box has a fixed height (flex:1 within the column); only the
      textarea inside scrolls when the text overflows it. */}
  <div style={{ marginTop:16, display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>
    <div className={styles.refPanelHeader} style={{ marginBottom:6 }}>
      <span className={styles.sectionLabel}>Additional details / instructions</span>
    </div>
    <p style={{ fontSize:11, color:"rgba(200,175,120,0.4)", margin:"0 0 8px" }}>
      What you need, according to your needs
    </p>
    <div style={{
      flex:1, minHeight:140, background:"#1e1a14",
      border:"0.5px solid rgba(200,175,120,0.15)", borderRadius:10,
      display:"flex", overflow:"hidden",
    }}>
      <textarea
        value={form.additional_details}
        onChange={e=>setF("additional_details")(e.target.value)}
        placeholder="Add any additional details or special instructions for your event…"
        style={{
          flex:1, width:"100%", resize:"none", background:"transparent",
          border:"none", outline:"none", color:"#e8dcc8", fontSize:13,
          lineHeight:1.6, fontFamily:"inherit", padding:14, overflowY:"auto",
          boxSizing:"border-box",
        }}
      />
         </div>
      </div>
          </div>
        </div>
      </div>
    
  );
}

/* ─── Compact event-info panel (Vendors step) ─────────────────────────────────
   "Skip to Vendors" on the Basics step lets a client land here without ever
   filling in name/type/date/time/location/notes. Rather than duplicate that
   state in a second place, this reads and writes the exact same `form`
   object Basics uses — whichever step the client fills in first, the other
   stays in sync automatically. No reference event here by design; this
   panel only covers the essentials needed to book vendors and move on. ──── */
function CompactEventInfo({ form, setForm, availability }) {
  // Auto-collapsed if Basics already filled these in (nothing new to do
  // here) — auto-expanded if they're empty (e.g. client used "Skip to
  // Vendors" and this is the first place they'll see these fields at all).
  // Only runs on mount, so switching steps back and forth re-evaluates it
  // fresh rather than fighting the user's manual expand/collapse clicks.
  const [expanded, setExpanded] = useState(
    () => !(form.event_name && form.event_type && form.event_date && form.location)
  );
  const setF = key => val => setForm(f => ({ ...f, [key]: val }));
  const setE = key => e => setF(key)(e.target.value);

  const requiredFilled = !!(form.event_name && form.event_type && form.event_date && form.location);

  return (
    <div
      style={{
        background: "rgba(200,175,120,0.03)",
        border: `0.5px solid ${requiredFilled ? "rgba(200,175,120,0.18)" : "rgba(235,87,87,0.22)"}`,
        borderRadius: 14,
        padding: "18px 22px",
        marginBottom: 26,
        transition: "border-color 0.2s",
      }}
    >
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(200,175,120,0.5)" }}>
            Event details
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 9px",
              borderRadius: 20,
              background: requiredFilled ? "rgba(111,207,151,0.12)" : "rgba(235,87,87,0.1)",
              color: requiredFilled ? "#6fcf97" : "#eb5757",
              border: `0.5px solid ${requiredFilled ? "rgba(111,207,151,0.3)" : "rgba(235,87,87,0.25)"}`,
              fontWeight: 600,
            }}
          >
            {requiredFilled ? "✓ Complete" : "Needs details"}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(200,175,120,0.4)" }}>{expanded ? "Hide ▲" : "Edit ▼"}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 16 }}>
            <Field label="Event name" required>
              <input className={styles.input} placeholder="e.g. Rohan & Priya's Wedding" value={form.event_name} onChange={setE("event_name")} />
            </Field>
            <Field label="Type of event" required>
              <select className={styles.input} value={form.event_type} onChange={setE("event_type")}>
                <option value="">Select type…</option>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Date" required>
              <DatePickerField value={form.event_date} onChange={setF("event_date")} availability={availability} />
            </Field>
            <Field label="Time">
              <input className={styles.input} type="time" value={form.event_time} onChange={setE("event_time")} />
            </Field>
          </div>

          <Field label="Location" required hint='e.g. "Lucknow, The Taj Hotel (Near Hazratganj)"'>
            <input className={styles.input} placeholder="City, Venue (Landmark)" value={form.location} onChange={setE("location")} />
          </Field>
        </div>
      )}
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
    const prices   = field.prices || {};
    const toggle = (val) => onChange({ ...vendorData, [field.key]: selected.includes(val) ? selected.filter(x=>x!==val) : [...selected, val] });

    if (!field.options || field.options.length === 0) {
      return (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>{field.label}</div>
          <p style={{ fontSize:12,color:"rgba(200,175,120,0.3)",fontStyle:"italic" }}>Select a vendor first to see their sub-services and pricing.</p>
        </div>
      );
    }

    const selectedTotal = selected.reduce((s,v)=>s+(Number(prices[v])||0),0);

    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>
          {field.label} <span style={{ textTransform:"none",letterSpacing:0,color:"rgba(200,175,120,0.3)" }}>(select all that apply — price shown per service)</span>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
          {field.options.map(opt=>{
            const sel = selected.includes(opt);
            const p = Number(prices[opt]) || 0;
            return (
              <button key={opt} onClick={()=>toggle(opt)} style={{ fontSize:11,padding:"5px 12px",borderRadius:20,border:`0.5px solid ${sel?"rgba(200,175,120,0.45)":"rgba(200,175,120,0.15)"}`,background:sel?"rgba(200,175,120,0.1)":"none",color:sel?"#c8af78":"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",display:"flex",alignItems:"center",gap:6 }}>
                <span>{opt}</span>
                <span style={{ fontSize:10, color:sel?"#c8af78":"rgba(200,175,120,0.35)", opacity:0.85 }}>
                  {p > 0 ? `₹${p.toLocaleString("en-IN")}` : "POR"}
                </span>
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div style={{ marginTop:10,fontSize:12,color:"#c8af78" }}>
            Selected sub-services total: <strong>₹{selectedTotal.toLocaleString("en-IN")}</strong>
          </div>
        )}
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
function VendorBlock({ serviceType, serviceConfig, vendorData, onChange, onPickVendor, eventDate }) {
  const { pricingModel, extraFields } = getServiceFields(serviceConfig);
  const pricePerUnit = vendorData.vendor?.price_per_day ? Number(vendorData.vendor.price_per_day) : 0;
  const totalCost = computeVendorTotal(pricingModel, vendorData);

  return (
    <div style={{ background:"rgba(200,175,120,0.03)",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:14,padding:"20px 22px",height:"100%",boxSizing:"border-box" }}>
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
{(vendorData.coverage_types?.length ? totalCost : pricePerUnit) > 0 && (
  <div style={{ fontSize:12,fontWeight:600,color:"#c8af78" }}>
    {vendorData.coverage_types?.length
      ? `₹${fmt(totalCost)}`
      : `~₹${fmt(pricePerUnit)}${pricingModel==="perDay" ? "/day" : ""} avg`}
  </div>
)}                <button onClick={onPickVendor} style={{ fontSize:11,color:"rgba(200,175,120,0.45)",background:"none",border:"0.5px solid rgba(200,175,120,0.15)",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit" }}>Change</button>
              </div>
            ) : (
              <button onClick={onPickVendor} style={{ width:"100%",padding:"12px",background:"#1e1a14",border:"0.5px dashed rgba(200,175,120,0.25)",borderRadius:10,fontSize:13,color:"rgba(200,175,120,0.45)",cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>
                + Select {serviceType} vendor
              </button>
            )}
          </div>

          {/* ── Vendor availability — THIS specific vendor's own calendar,
              independent from the studio-wide Step-1 date picker. Shows
              whether they're free/busy on the client's chosen event date
              once both a vendor and a date are picked. ──────────────────── */}
          {vendorData.vendor && (
            <VendorAvailabilityNote vendorId={vendorData.vendor.id} eventDate={eventDate} />
          )}

          {/* Service-specific fields */}
          {extraFields.map(field => {
            const effectiveField = field.type === "multiselect"
              ? {
                  ...field,
                  // Use the vendor's own "Services Offered" list instead of the
                  // generic static options, so names always match their pricing
                  options: (vendorData.vendor?.services?.length ? vendorData.vendor.services : field.options),
                  prices:  vendorData.vendor?.prices || {},
                }
              : field;
            return <ExtraField key={field.key} field={effectiveField} vendorData={vendorData} onChange={onChange} />;
          })}
          {totalCost > 0 && (
            <p style={{ fontSize:12,color:"#c8af78",fontWeight:600,marginTop:-8,marginBottom:14 }}>
              Estimated cost for this vendor: ₹{fmt(totalCost)}
              {pricingModel === "perDay" && Number(vendorData.days) > 1 ? ` (${vendorData.days} days)` : ""}
            </p>
          )}

          {/* Notes */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"rgba(200,175,120,0.45)",marginBottom:8 }}>Additional notes to vendor</div>
            <textarea value={vendorData.notes||""} onChange={e=>onChange({...vendorData,notes:e.target.value})} placeholder="Specific requirements, style preferences…" rows={2} style={{ width:"100%",background:"#1e1a14",border:"0.5px solid rgba(200,175,120,0.18)",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#e8dcc8",outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box" }}/>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── STEP 2 — Vendors ────────────────────────────────────────────────────────── */
function StepVendors({ vendors, vendorSelections, setVendorSelections, onNext, onBack, onSkipVendors, onPickVendor, form, setForm, availability }) {
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

  // Basics can be skipped entirely ("Skip to Vendors"), so the essentials
  // need to be verifiable/collectable right here before letting the client
  // proceed to Budget/Review with them missing.
  const requiredFilled = !!(form.event_name && form.event_type && form.event_date && form.location);
  const anyEnabled = serviceBlocks.some(({ key }) => vendorSelections[key]?.enabled);
  const allOk = serviceBlocks.every(({ key }) => !vendorSelections[key]?.enabled || vendorSelections[key]?.vendor);
  const canNext = anyEnabled && allOk && requiredFilled;
  const canSkip = requiredFilled;

  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Confirm your event essentials, then pick the services you need — toggle a service on to configure it, or skip vendors entirely if you just want the event booked.</p>

      <CompactEventInfo form={form} setForm={setForm} availability={availability} />

      <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",color:"rgba(200,175,120,0.5)",marginBottom:14 }}>
        Available services
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(360px, 100%), 1fr))", gap:18, marginBottom:20, alignItems:"start" }}>
        {serviceBlocks.map(({ key, config }) => {
          const data = vendorSelections[key] || { enabled: false, vendor: null, notes: "", reference_event: null };
          return (
            <div key={key} style={{ gridColumn: data.enabled ? "1 / -1" : "auto" }}>
              <VendorBlock
                serviceType={config.title || config.singular || key}
                serviceConfig={config}
                vendorData={data}
                onChange={d => setVendorSelections(s => ({ ...s, [key]: d }))}
                onPickVendor={() => onPickVendor(key, config)}
                eventDate={form.event_date}
              />
            </div>
          );
        })}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onNext} disabled={!canNext}>Next — View budget</button>
      </div>

      {/* Standalone skip action — kept out of btnRow (which is styled for
          exactly the back/next pair) so it always renders full-width and
          visible, instead of being squashed/hidden by CSS meant for two
          buttons. */}
      <button
        type="button"
        onClick={onSkipVendors}
        disabled={!canSkip}
        title={canSkip ? "Just want the event without booking vendors here? Skip straight to your budget." : "Fill in the event details above first."}
        style={{
          marginTop: 10,
          width: "100%",
          background: "rgba(200,175,120,0.07)",
          border: "0.5px dashed rgba(200,175,120,0.35)",
          borderRadius: 8,
          padding: "11px 0",
          fontSize: 12.5,
          fontWeight: 500,
          letterSpacing: "0.03em",
          fontFamily: "inherit",
          color: canSkip ? "#c8af78" : "rgba(200,175,120,0.25)",
          cursor: canSkip ? "pointer" : "not-allowed",
          transition: "all 0.15s",
        }}
      >
        ⏭ Skip Vendors — Just book the event
      </button>

      {!requiredFilled && (
        <p style={{ fontSize:11,color:"#eb5757",marginTop:8 }}>Please fill in event name, type, date, and location above before continuing.</p>
      )}
      {requiredFilled && !canNext && anyEnabled && (
        <p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>Please select a vendor for each enabled service, or use “Skip Vendors” above to continue without them.</p>
      )}
      {requiredFilled && !anyEnabled && (
        <p style={{ fontSize:11,color:"rgba(200,175,120,0.35)",marginTop:8 }}>Add at least one vendor service, or tap “Skip Vendors” above if you don't need any right now.</p>
      )}
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
        {event.img && (
          <a href={event.img} target="_blank" rel="noreferrer" title="View full size">
            <img src={event.img} alt={event.title} style={{ width:64,height:48,objectFit:"cover",borderRadius:7,flexShrink:0 }}/>
          </a>
        )}
        <div>
          <div style={{ fontSize:13,fontWeight:600,color:"#e8dcc8",marginBottom:2 }}>{event.title}</div>
          {(event.type || event.city || event.dateLabel) && (
            <div style={{ fontSize:11,color:"rgba(200,175,120,0.4)" }}>
              {event.isCustom
                ? "Your uploaded reference"
                : [event.type, event.city, event.dateLabel].filter(Boolean).join(" · ")}
            </div>
          )}
          {/* FIX (Option 1): same "price to be quoted" transparency as the
              Step 1 panel, so Review doesn't silently show nothing for a
              custom upload with no price. */}
          {event.price ? (
            <div style={{ fontSize:11,color:"#c8af78",marginTop:2 }}>{event.price}</div>
          ) : event.isCustom ? (
            <div style={{ fontSize:11,color:"rgba(200,175,120,0.4)",marginTop:2,fontStyle:"italic" }}>
              Price to be quoted
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepReview({ form, vendorSelections, budget, submitting, submitError, onBack, onSubmit }) {
  const decorationLabel = DECORATION_LOCATIONS.find(l=>l.value===form.decoration_type)?.label;

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
        <ReviewItem label="Decoration" value={decorationLabel}/>
        <ReviewItem label="Additional details" value={form.additional_details}/>
        <div style={{ marginTop:14 }}>
          <RefImageBlock label="Reference event" event={form.reference_event}/>
          {/* NEW — the specific decoration venue photo picked on the
              secondary screen, separate from the plain category label
              already shown above via the "Decoration" ReviewItem row. */}
          {form.decoration_venue && (
            <RefImageBlock
              label="Decoration reference"
              event={{
                img: form.decoration_venue.image_url,
                title: form.decoration_venue.title,
                type: decorationLabel,
                city: "",
                dateLabel: "",
                price: null,
                isCustom: false,
              }}
            />
          )}
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
{Array.isArray(sel.coverage_types) && sel.coverage_types.length > 0 && (
              <ReviewItem
                label="Sub-services"
                value={sel.coverage_types
                  .map(s => `${s} (₹${fmt(sel.vendor?.prices?.[s] || 0)})`)
                  .join(", ")}
              />
            )}
            <ReviewItem label="Total cost" value={`₹${fmt(computeVendorTotal(pricingModel, sel))}`} />
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

  // Which reference slot the "browse or upload" picker is currently open
  // for: null (closed) | "global" (Step-1 event reference). Per-vendor
  // reference pickers were removed — vendors no longer have their own
  // reference-event field.
  const [refPickerTarget, setRefPickerTarget] = useState(null);

  // Which decoration category the real-photo picker is currently open
  // for: null (closed) | "lawn" | "hotel" | etc. Separate from
  // refPickerTarget since this drives a different modal (DecorationVenuePicker).
  const [decorationPickerType, setDecorationPickerType] = useState(null);

  const [form, setForm] = useState({
    event_name: "",
    // FIX: run the initial prefill type through matchEventType() too, so it
    // always lines up with one of the fixed EVENT_TYPES dropdown options
    // (case-insensitive), same as the pick-flow fix below.
    event_type: matchEventType(prefillEvent?.type) || "",
    event_date: "",
    event_time: "18:00",
    location: "",
    capacity: 150,
    decoration_type: "",
    // NEW — the specific real photo picked on the decoration secondary
    // screen: { id, venue_type, title, image_url, description } or null.
    decoration_venue: null,
    reference_event: prefillEvent || null,
    additional_details: "",
 });

  const [vendorSelections, setVendorSelections] = useState(() =>
    Object.fromEntries(VENDOR_SERVICE_CONFIGS.map(cfg => [
      cfg.id,
      { enabled: false, vendor: null, notes: "" },
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
        // FIX: previously only `reference_event` was written here, so
        // picking a reference from the Explore page (Browse events ->
        // "+ Add to Event" -> back to Create Event) left "Type of event"
        // on "Select type…" even though the reference card — and the
        // gallery row behind it — already has its own type (e.g.
        // "Sports"). Auto-fill event_type from the picked reference,
        // matched case-insensitively against the fixed EVENT_TYPES list
        // so it lines up with the dropdown's options.
        setForm(f => ({
          ...f,
          reference_event: pickResult.event,
          event_type: matchEventType(pickResult.event?.type) || f.event_type,
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

  const handlePickVendor = (serviceKey, serviceConfig) => {
    saveEventDraft(step, form, vendorSelections);
    navigate(serviceConfig.path, { state: { celestePick: { type: "vendor", serviceKey } } });
  };

  // ── Reference source picker (browse collection vs upload own image) ────
  // Only the Step-1 global reference uses this now.
  const openGlobalRefPicker = () => setRefPickerTarget("global");
  const closeRefPicker = () => setRefPickerTarget(null);

  const handleBrowseFromPicker = () => {
    handleBrowseReference();
  };

  const handleUploadComplete = (refEvent) => {
    setForm(f => ({ ...f, reference_event: refEvent }));
  };

  // ── Decoration venue picker (real photos, in-page modal — no navigation
  //    needed since these images live entirely inside this flow). ────────
  const openDecorationPicker = (venueType) => setDecorationPickerType(venueType);
  const closeDecorationPicker = () => setDecorationPickerType(null);
  const handleDecorationVenueSelect = (venue) => {
    setForm(f => ({ ...f, decoration_venue: venue }));
    setDecorationPickerType(null);
  };

  // ── Step-skipping shortcuts ──────────────────────────────────────────────
  // "Skip to Vendors" — for clients who only care about booking vendors and
  // don't want to pick a reference event first.
  const handleSkipToVendors = () => setStep(1);
  // "Skip Vendors" — for clients who just want the event itself booked
  // (reference event only) without adding any vendors right now.
  const handleSkipVendors = () => setStep(2);

  const budget = (() => {
    const rows = [];

    // ── Reference event's own price ─────────────────────────────────────
    // form.reference_event (picked on Step 1, e.g. the "Sports · ₹20,000"
    // DB event) previously never contributed to the estimate at all — only
    // vendor rows below did. Add it first, as its own line item, using
    // parsePriceString() since the price arrives as a display string. A
    // client's own uploaded reference has no price, so this naturally
    // contributes 0 and is skipped.
    const refEventPrice = parsePriceString(form.reference_event?.price);
    if (refEventPrice > 0) {
      rows.push({
        label: "Reference event",
        sub: form.reference_event?.title || "",
        amt: refEventPrice,
      });
    } else if (form.reference_event?.isCustom) {
      // FIX (Option 1): a client's own uploaded photo has no price to add,
      // but silently dropping the row made it look like the reference was
      // never considered. Show a ₹0 info line instead so the client can
      // see it's accounted for and knows admin will follow up with a
      // quote — the total itself stays untouched (no invented number).
      rows.push({
        label: "Reference event",
        sub: `${form.reference_event.title || "Your upload"} — price to be quoted after review`,
        amt: 0,
      });
    }

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
    return { rows, subtotal, contingency, total, refEventPrice };
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
  // NEW — the specific real decoration-venue photo picked on the
  // secondary screen (see decorationVenues.js / DecorationVenuePicker
  // above). Null when the client left it on "None" or skipped the picker.
  decoration_venue_id: form.decoration_venue?.id || null,
  decoration_venue_image: form.decoration_venue?.image_url || null,
  decoration_venue_title: form.decoration_venue?.title || null,
  budget_estimate: budget.total,
  additional_details: form.additional_details || "",
  client_name: user?.name || "Guest",
  client_email: user?.email || "",
  client_phone: user?.phone || "",
  // reference_event_id stays null for a client-uploaded image (it isn't a
  // gallery row) — that's exactly the signal the admin panel uses to know
  // to show a full-size lightbox instead of a link into /explore.
  reference_event_id: form.reference_event?.id || null,
  reference_event_image: form.reference_event?.img || null,
  reference_event_title: form.reference_event?.title || null,
  reference_event_type:  form.reference_event?.type  || null,
  reference_event_price: budget.refEventPrice || 0,
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
            onSkipToVendors={handleSkipToVendors}
            onBrowseReference={openGlobalRefPicker}
            onOpenDecorationPicker={openDecorationPicker}
          />
        )}
        {step === 1 && (
          <StepVendors
            vendors={allVendors}
            vendorSelections={vendorSelections}
            setVendorSelections={setVendorSelections}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
            onSkipVendors={handleSkipVendors}
            onPickVendor={handlePickVendor}
            form={form}
            setForm={setForm}
            availability={availability}
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

      <ReferenceSourceModal
        open={!!refPickerTarget}
        onClose={closeRefPicker}
        onBrowse={handleBrowseFromPicker}
        onUploadComplete={handleUploadComplete}
      />

      <DecorationVenuePicker
        open={!!decorationPickerType}
        venueType={decorationPickerType}
        onClose={closeDecorationPicker}
        onSelect={handleDecorationVenueSelect}
      />
    </div>
  );
}