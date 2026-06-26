import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EVENTS, EVENT_CATEGORIES, THEME_GRADIENTS } from "../context/data/events";
import { useAuth } from "../hooks/useAuth";
import styles from "./CreateEventPage.module.css";

const API = "http://localhost:5000/api";

function getGradient(type) {
  const g = THEME_GRADIENTS[type] || ["#f5f5f5", "#e0e0e0"];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}
function getEmoji(type) {
  return EVENT_CATEGORIES.find((c) => c.type === type)?.icon ?? "📅";
}

const VENDOR_CATALOGUE = [
  { category: "Food & Drink", items: [{ name: "Catering service", cost: 18000 }, { name: "Bar / cocktail setup", cost: 12000 }, { name: "Dessert & cake", cost: 4000 }, { name: "Coffee station", cost: 3000 }] },
  { category: "Entertainment", items: [{ name: "Live music / band", cost: 25000 }, { name: "DJ", cost: 15000 }, { name: "MC / host", cost: 8000 }, { name: "Photo booth", cost: 5000 }] },
  { category: "Venue & Setup", items: [{ name: "Venue hire", cost: 40000 }, { name: "Lighting & AV", cost: 12000 }, { name: "Stage / podium", cost: 9000 }, { name: "Furniture rental", cost: 6000 }] },
  { category: "Photography", items: [{ name: "Photographer", cost: 20000 }, { name: "Videographer", cost: 18000 }, { name: "Drone coverage", cost: 10000 }] },
  { category: "Decor & Styling", items: [{ name: "Florist", cost: 8000 }, { name: "Event stylist", cost: 15000 }, { name: "Custom signage", cost: 4000 }] },
  { category: "Logistics", items: [{ name: "Transport / shuttles", cost: 10000 }, { name: "Security", cost: 8000 }, { name: "Event coordinator", cost: 12000 }] },
];

const EXTRA_PILLS = ["Accessibility ramps", "Valet parking", "Live translation", "Prayer / quiet room", "Kids zone", "Merchandise stall", "First aid station", "Green room / backstage", "Permit / license help", "Guest gifting", "Halal / Jain menu", "Live social media wall"];
const EVENT_TYPES = ["Wedding", "Birthday", "Corporate", "Concert", "Festival", "Sports", "Outdoor", "Expo", "Cultural", "Charity", "Food", "Other"];
const DECORATION_LOCATIONS = [
  { value: "", label: "None" },
  { value: "home", label: "Home" },
  { value: "lawn", label: "Lawn / Garden" },
  { value: "hotel", label: "Hotel" },
  { value: "restaurant", label: "Restaurant" },
  { value: "banquet", label: "Banquet Hall" },
  { value: "outdoor", label: "Outdoor / Open Ground" },
];
const STEPS = ["Basics", "Vendors",  "Budget"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── Availability Calendar ─────────────────────────────────────────────────────
function AvailabilityCalendar({ value, onChange, availability }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initDate = value ? new Date(value + 'T00:00:00') : today;
  const [viewYear, setViewYear]   = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const statusMap = {};
  availability.forEach(a => {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    statusMap[key] = a.status;
  });

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: '#1e1a14', border: '0.5px solid rgba(200,175,120,0.2)', borderRadius: 10, padding: 16, width: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'rgba(200,175,120,0.5)', lineHeight: 1, padding: '0 6px' }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#c8af78', letterSpacing: '0.05em' }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'rgba(200,175,120,0.5)', lineHeight: 1, padding: '0 6px' }}>›</button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 10, color: 'rgba(200,175,120,0.4)', letterSpacing: '0.05em' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(111,207,151,0.7)', display: 'inline-block' }} />Free</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(235,87,87,0.6)', display: 'inline-block' }} />Busy</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(200,175,120,0.3)', fontWeight: 600, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateKey  = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const status   = statusMap[dateKey];
          const thisDate = new Date(viewYear, viewMonth, day);
          const isPast   = thisDate < today;
          const isBusy   = status === 'busy';
          const isFree   = status === 'free';
          const isSel    = value === dateKey;
          const disabled = isPast || isBusy;

          let bg = 'transparent', color = 'rgba(200,175,120,0.7)', border = '0.5px solid transparent', cursor = 'pointer', fw = 400;
          if (isPast)  { color = 'rgba(200,175,120,0.2)'; cursor = 'not-allowed'; }
          if (isFree)  { bg = 'rgba(111,207,151,0.12)'; color = '#6fcf97'; border = '0.5px solid rgba(111,207,151,0.3)'; }
          if (isBusy)  { bg = 'rgba(235,87,87,0.1)'; color = 'rgba(235,87,87,0.55)'; border = '0.5px solid rgba(235,87,87,0.22)'; cursor = 'not-allowed'; }
          if (isSel)   { bg = '#c8af78'; color = '#141210'; border = '0.5px solid #c8af78'; fw = 700; }

          return (
            <div key={dateKey} onClick={() => !disabled && onChange(dateKey)} title={isBusy ? 'Not available' : isFree ? 'Available' : ''} style={{ textAlign: 'center', fontSize: 11, padding: '5px 2px', borderRadius: 5, background: bg, color, border, cursor, fontWeight: fw, userSelect: 'none', transition: 'all 0.15s' }}>
              {day}
            </div>
          );
        })}
      </div>

      {value && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(200,175,120,0.4)', textAlign: 'center', borderTop: '0.5px solid rgba(200,175,120,0.08)', paddingTop: 10 }}>
          <span style={{ color: '#c8af78' }}>{new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      )}
    </div>
  );
}

// ── Date Picker Toggle ────────────────────────────────────────────────────────
function DatePickerField({ value, onChange, availability }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div ref={ref} style={{ position: 'relative', maxWidth: 320 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ background: '#1e1a14', border: `0.5px solid ${open ? 'rgba(200,175,120,0.45)' : 'rgba(200,175,120,0.15)'}`, borderRadius: 8, padding: '11px 14px', fontSize: 13, color: value ? '#e8dcc8' : 'rgba(200,175,120,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none', transition: 'border-color 0.2s' }}
      >
        <span>{displayValue || 'Select date…'}</span>
        <span style={{ fontSize: 9, color: 'rgba(200,175,120,0.4)', marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <AvailabilityCalendar value={value} onChange={(d) => { onChange(d); setOpen(false); }} availability={availability} />
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CreateEventPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const prefillEvent = location.state?.referenceEvent ?? null;

  const cameFromExplore = location.pathname === '/create-events' || !!prefillEvent;
  const [showEmpty, setShowEmpty]   = useState(!cameFromExplore);
  const [step, setStep]             = useState(0);
  const [calcStep, setCalcStep]     = useState(false);
  const [done, setDone]             = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [availability, setAvailability] = useState([]);

  const [name,      setName]     = useState("");
  const [evType,    setEvType]   = useState(prefillEvent?.type || "");
  const [date,      setDate]     = useState("");
  const [time,      setTime]     = useState("18:00");
  const [location_, setLocation] = useState("");
  const [capacity,  setCapacity] = useState(150);
  const [refEvent,  setRefEvent] = useState(prefillEvent);
  const [decorationLocation, setDecorationLocation] = useState("");

  const [vendors,   setVendors]   = useState({});
  const [extras,    setExtras]    = useState(new Set());
  const [extraNote, setExtraNote] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketQty,   setTicketQty]   = useState("");
  const [budget,      setBudget]      = useState(null);

  useEffect(() => {
    fetch(`${API}/availability`).then(r => r.json()).then(d => setAvailability(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const toggleVendor = (n, cost) => setVendors(prev => { const next = { ...prev }; next[n] !== undefined ? delete next[n] : (next[n] = cost); return next; });
  const toggleExtra  = (pill)    => setExtras(prev  => { const next = new Set(prev); next.has(pill) ? next.delete(pill) : next.add(pill); return next; });

  const calculateBudget = () => {
  setCalcStep(true);
  const vendorTotal = Object.values(vendors).reduce((a, b) => a + b, 0);
  const grand = vendorTotal;
  setTimeout(() => {
    setBudget({ vendorTotal, grand });
    setCalcStep(false);
    setStep(2);
  }, 2200);
};

  const handleCreateEvent = useCallback(async () => {
    setSubmitting(true); setSubmitError('');
    const msg = [
      `Event: ${name}`, `Location: ${location_}`, `Time: ${time}`, `Capacity: ${capacity} guests`,
      decorationLocation ? `Decoration: ${decorationLocation}` : null,
      Object.keys(vendors).length ? `Vendors: ${Object.keys(vendors).join(', ')}` : null,
      extras.size ? `Extras: ${[...extras].join(', ')}` : null,
      extraNote ? `Notes: ${extraNote}` : null,
      budget ? `Est. Budget: ₹${budget.grand.toLocaleString('en-IN')}` : null,
    ].filter(Boolean).join('\n');
    // Get reference image from prefill event
    const refImg = refEvent?.image_url || '';
    try {
      const res  = await fetch(`${API}/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_name: user?.name || 'Guest', email: user?.email || '', phone: '', event_type: evType, event_date: date, message: msg, reference_image: refImg, decoration_location: decorationLocation }) });
      const data = await res.json();
if (data.success) {
  navigate("/my-events", { state: { bookingSuccess: true } });
} else {
  setSubmitError('Something went wrong. Please try again.');
}
} catch { setSubmitError('Could not connect to server.'); }
    setSubmitting(false);
  }, [user, name, evType, date, time, location_, capacity, vendors, extras, extraNote, budget, refEvent]);

  const revenue = ticketPrice && ticketQty ? Math.round(parseFloat(ticketPrice) * parseFloat(ticketQty)) : null;
  const goNext  = () => setStep(s => Math.min(s + 1, 2));
  const goBack  = () => setStep(s => Math.max(s - 1, 0));

  // if (done)     return <DoneScreen name={name} evType={evType} location_={location_} capacity={capacity} vendors={vendors} navigate={navigate} />;
  if (calcStep) return <CalcScreen />;

  if (showEmpty) return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}><BackIcon /> Back</button>
        <div className={styles.titleBlock}><h1 className={styles.pageTitle}>Create <em>Event</em></h1></div>
      </header>
      <EmptyState onStart={(type) => { if (type) setEvType(type); setShowEmpty(false); }} />
    </div>
  );

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}><BackIcon /> Back</button>
        <div className={styles.titleBlock}><h1 className={styles.pageTitle}>Create <em>Event</em></h1></div>
      </header>

      <nav className={styles.stepNav}>
        {STEPS.map((label, i) => (
          <button key={label} className={`${styles.stepPill} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`} onClick={() => i < step && setStep(i)}>
            {i < step && <span className={styles.checkMark}>✓</span>}{label}
          </button>
        ))}
      </nav>
      <div className={styles.shimmerLine} />

      <main className={styles.body}>
        {step === 0 && <StepBasics name={name} setName={setName} evType={evType} setEvType={setEvType} date={date} setDate={setDate} time={time} setTime={setTime} location_={location_} setLocation={setLocation} capacity={capacity} setCapacity={setCapacity} decorationLocation={decorationLocation} setDecorationLocation={setDecorationLocation} refEvent={refEvent} setRefEvent={setRefEvent} availability={availability} onNext={goNext} />}
        {step === 1 && <StepVendors vendors={vendors} toggleVendor={toggleVendor} onNext={calculateBudget} onBack={goBack} />}
        {step === 2 && budget && <StepBudget budget={budget} vendors={vendors} capacity={capacity} extras={extras} submitting={submitting} submitError={submitError} onBack={goBack} onDone={handleCreateEvent} />}
      </main>
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function StepBasics({ name, setName, evType, setEvType, date, setDate, time, setTime, location_, setLocation, capacity, setCapacity, decorationLocation, setDecorationLocation, refEvent, setRefEvent, availability, onNext }) {
  return (
    <div className={styles.stepWrap}>
      <div className={styles.basicsLayout}>
        {/* LEFT — form fields */}
        <div className={styles.basicsLeft}>
          <div className={styles.fieldRow}>
            <Field label="Event name"><input className={styles.input} placeholder="e.g. Shubh's Summer Gala" value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Type of event">
              <select className={styles.input} value={evType} onChange={e => setEvType(e.target.value)}>
                <option value="">Select type...</option>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Date of event">
            <DatePickerField value={date} onChange={setDate} availability={availability} />
          </Field>

          <Field label="Time">
            <input className={styles.input} type="time" value={time} onChange={e => setTime(e.target.value)} style={{ maxWidth: 200 }} />
          </Field>

          <Field label="Location">
            <input className={styles.input} placeholder='City, Venue name (Landmark near venue)' value={location_} onChange={e => setLocation(e.target.value)} />
            <p className={styles.hint}>e.g. "Mumbai, The Taj Mahal Palace (Gateway of India)"</p>
          </Field>

          <Field label="Event decoration location">
            <select className={styles.input} value={decorationLocation} onChange={e => setDecorationLocation(e.target.value)}>
              <option value="">None</option>
              {DECORATION_LOCATIONS.filter(l => l.value).map(loc => (
                <option key={loc.value} value={loc.value}>{loc.label}</option>
              ))}
            </select>
          </Field>

          <Field label={`Expected capacity — ${capacity} guests`}>
            <input type="range" min={10} max={2000} step={10} value={capacity} onChange={e => setCapacity(Number(e.target.value))} className={styles.slider} />
            <div className={styles.sliderLabels}><span>10</span><span>2,000</span></div>
          </Field>

          <div className={styles.btnRow}>
            <button className={styles.btnSecondary} onClick={() => alert('Saved to drafts')}>Save as draft</button>
            <button className={styles.btnPrimary} onClick={onNext} disabled={!name || !evType || !date}>Next — Choose vendors</button>
          </div>
        </div>

        {/* RIGHT — reference event panel */}
        <div className={styles.basicsRight}>
          <div className={styles.refPanelHeader}>
            <span className={styles.sectionLabel}>Reference event <span className={styles.sectionNote}>— optional</span></span>
            <button className={styles.linkBtn} onClick={() => window.open('/explore', '_blank')}>Browse Explore Events ↗</button>
          </div>

          {refEvent ? (
            <div className={styles.refPanelCard}>
              <div className={styles.refPanelImage} style={{ background: getGradient(refEvent.type) }}>
                {refEvent.image_url
                  ? <img src={refEvent.image_url} alt={refEvent.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                  : <span style={{ fontSize: 56 }}>{getEmoji(refEvent.type)}</span>
                }
              </div>
              <div className={styles.refPanelInfo}>
                <div className={styles.refName}>{refEvent.title}</div>
                <div className={styles.refMeta}>{refEvent.type} · {refEvent.venue} · {refEvent.month} {refEvent.year}</div>
                <button className={styles.refRemove} onClick={() => setRefEvent(null)}>✕ Remove</button>
              </div>
            </div>
          ) : (
            <div className={styles.refPanelEmpty}>
              <div className={styles.refPanelEmptyIcon}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="24" rx="4" stroke="rgba(200,175,120,0.25)" strokeWidth="1.5"/><path d="M4 14h32" stroke="rgba(200,175,120,0.2)" strokeWidth="1"/><circle cx="10" cy="22" r="3" stroke="rgba(200,175,120,0.2)" strokeWidth="1.2"/><path d="M15 28l4-5 4 4 3-3 6 7H4l6-7 5 4z" fill="rgba(200,175,120,0.08)" stroke="rgba(200,175,120,0.18)" strokeWidth="1"/></svg>
              </div>
              <p className={styles.refPanelEmptyText}>No reference selected</p>
              <p className={styles.refPanelEmptySub}>Browse past events to use one as inspiration for your setup</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function StepVendors({ vendors, toggleVendor, onNext, onBack }) {
  const count = Object.keys(vendors).length;
  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Select vendors for your event — mix and match like ingredients</p>
      <div className={styles.vendorGrid}>
        {VENDOR_CATALOGUE.map(cat => (
          <div key={cat.category} className={styles.vCat}>
            <div className={styles.vCatTitle}>{cat.category}</div>
            {cat.items.map(item => {
              const sel = vendors[item.name] !== undefined;
              return (
                <div key={item.name} className={`${styles.vItem} ${sel ? styles.vItemSel : ''}`} onClick={() => toggleVendor(item.name, item.cost)}>
                  <span className={styles.vItemName}>{item.name}</span>
                  <div className={styles.vItemRight}>
                    <span className={styles.vItemCost}>₹{item.cost.toLocaleString('en-IN')}</span>
                    <div className={styles.vCheck}>{sel ? '✓' : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className={styles.vCount}>Selected: <strong>{count} vendor{count !== 1 ? 's' : ''}</strong>{count > 0 && ` · Est. ₹${Object.values(vendors).reduce((a,b)=>a+b,0).toLocaleString('en-IN')}`}</p>
      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
<button className={styles.btnPrimary} onClick={onNext}>Calculate avg budget</button>
      </div>
    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function StepExtras({ extras, toggleExtra, extraNote, setExtraNote, onCalc, onBack }) {
  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>What else do you need? Pick any that apply</p>
      <div className={styles.extraPills}>
        {EXTRA_PILLS.map(pill => <button key={pill} className={`${styles.extraPill} ${extras.has(pill) ? styles.extraPillSel : ''}`} onClick={() => toggleExtra(pill)}>{pill}</button>)}
      </div>
      <Field label="Anything else? Describe freely">
        <textarea className={`${styles.input} ${styles.textarea}`} placeholder="e.g. charging station, ivory and gold theme..." value={extraNote} onChange={e => setExtraNote(e.target.value)} />
      </Field>
      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onCalc}>Calculate avg budget</button>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────────────
function StepBudget({ budget, vendors, capacity, extras, submitting, submitError, onBack, onDone }) {
const rows = [
  ...Object.entries(vendors).map(([n, cost]) => ({ label: n, amt: cost })),
];
  return (
    <div className={styles.stepWrap}>
      <div className={styles.budgetCard}>
        <div className={styles.budgetTitle}>Estimated cost breakdown</div>
        {rows.map(r => <div key={r.label} className={styles.budgetRow}><span className={styles.budgetLabel}>{r.label}</span><span className={styles.budgetAmt}>₹{r.amt.toLocaleString('en-IN')}</span></div>)}
        <div className={styles.budgetTotal}><span className={styles.budgetTotalLabel}>Avg total estimate</span><span className={styles.budgetTotalAmt}>₹{budget.grand.toLocaleString('en-IN')}</span></div>
      </div>
      {submitError && <div style={{ background: 'rgba(235,87,87,0.1)', border: '0.5px solid rgba(235,87,87,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#eb5757' }}>{submitError}</div>}
      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onDone} disabled={submitting}>{submitting ? 'Submitting…' : 'Create event'}</button>
      </div>
    </div>
  );
}

// ── Calc ──────────────────────────────────────────────────────────────────────
function CalcScreen() {
  const [widths, setWidths] = useState([0,0,0,0,0]);
  const labels = ["Vendors","Venue","Catering",];
  const msgs   = ["Analysing vendor rates...","Factoring in capacity...","Applying regional pricing...","Adding extras buffer...","Finalising estimate..."];
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => { labels.forEach((_,i) => setTimeout(() => { setWidths(p => { const n=[...p]; n[i]=55+Math.random()*38; return n; }); setMsgIdx(i); }, i*400+100)); }, []);
  return (
    <div className={styles.calcRoot}>
      <div className={styles.calcTitle}>Calculating your event cost…</div>
      <div className={styles.calcBars}>{labels.map((label,i) => <div key={label} className={styles.calcBarRow}><span className={styles.calcBarLabel}>{label}</span><div className={styles.calcBarTrack}><div className={styles.calcBarFill} style={{ width:`${widths[i]}%`, transition:'width 0.7s ease' }} /></div></div>)}</div>
      <p className={styles.calcStatus}>{msgs[msgIdx]}</p>
    </div>
  );
}

// ── Done ──────────────────────────────────────────────────────────────────────
function DoneScreen({ name, evType, location_, capacity, vendors, navigate }) {
  return (
    <div className={styles.root}>
      <div className={styles.doneWrap}>
        <div className={styles.doneIcon}><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M5 14l7 7L23 7" stroke="#c8af78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <h2 className={styles.doneTitle}>Booking <em>submitted!</em></h2>
        <p className={styles.doneSub}>Your booking request has been sent. The team will review it and get back to you soon.</p>
        <div className={styles.donePills}>{[name||'Untitled', evType, location_||'Location TBD', `${capacity} guests`, `${Object.keys(vendors).length} vendors`].filter(Boolean).map(t => <span key={t} className={styles.donePill}>{t}</span>)}</div>
        <div className={styles.btnRow} style={{ justifyContent:'center' }}>
          <button className={styles.btnPrimary} onClick={() => navigate('/')}>Back to Home</button>
          <button className={styles.btnSecondary} onClick={() => navigate('/my-events')}>Go to My Events</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) { return <div className={styles.field}><label className={styles.fieldLabel}>{label}</label>{children}</div>; }
function BackIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 12L6 8l4-4" /></svg>; }

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onStart }) {
  return (
    <div className={styles.emptyRoot}>
      <div className={styles.emptyGlow} />

      <div className={styles.emptyInner}>
        {/* Decorative top line */}
        <div className={styles.emptyRule} />

        <p className={styles.emptyEyebrow}>Arc Events</p>

        <h2 className={styles.emptyHeading}>
          Build your<br /><em>perfect event</em>
        </h2>

        <p className={styles.emptyBody}>
          Start with the basics — name, date, and type — then layer in vendors,
          extras, and a live budget estimate. Everything in four steps.
        </p>

        {/* Flow preview */}
        <div className={styles.emptyFlow}>
          {[
            { n: "01", label: "Event basics", sub: "Name, date, location, type" },
            { n: "02", label: "Build lineup", sub: "Pick vendors like ingredients" },
            { n: "03", label: "Extras", sub: "Special requirements" },
            { n: "04", label: "Budget", sub: "Live cost estimate" },
          ].map((s, i) => (
            <div key={s.n} className={styles.emptyFlowItem}>
              <span className={styles.emptyFlowNum}>{s.n}</span>
              <span className={styles.emptyFlowLabel}>{s.label}</span>
              <span className={styles.emptyFlowSub}>{s.sub}</span>
              {i < 3 && <span className={styles.emptyFlowArrow}>›</span>}
            </div>
          ))}
        </div>

        {/* Quick-start pills */}
        <div className={styles.emptyPillRow}>
          {["Wedding", "Birthday", "Corporate", "Concert", "Festival"].map(t => (
            <button key={t} className={styles.emptyPill} onClick={() => onStart(t)}>
              + {t}
            </button>
          ))}
        </div>

        <button className={styles.emptyCtaBtn} onClick={() => onStart("")}>
          Start from scratch
        </button>

        <div className={styles.emptyRule} style={{ marginTop: 40, marginBottom: 0 }} />
      </div>
    </div>
  );
}