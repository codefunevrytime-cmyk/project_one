import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EVENTS, EVENT_CATEGORIES, THEME_GRADIENTS } from "../context/data/events";
import styles from "./CreateEventPage.module.css";

// ── helpers ───────────────────────────────────────────────────────────────────
function getGradient(type) {
  const g = THEME_GRADIENTS[type] || ["#f5f5f5", "#e0e0e0"];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}
function getEmoji(type) {
  return EVENT_CATEGORIES.find((c) => c.type === type)?.icon ?? "📅";
}

// ── vendor catalogue ──────────────────────────────────────────────────────────
const VENDOR_CATALOGUE = [
  {
    category: "Food & Drink",
    items: [
      { name: "Catering service",  cost: 18000 },
      { name: "Bar / cocktail setup", cost: 12000 },
      { name: "Dessert & cake",    cost: 4000  },
      { name: "Coffee station",    cost: 3000  },
    ],
  },
  {
    category: "Entertainment",
    items: [
      { name: "Live music / band", cost: 25000 },
      { name: "DJ",                cost: 15000 },
      { name: "MC / host",         cost: 8000  },
      { name: "Photo booth",       cost: 5000  },
    ],
  },
  {
    category: "Venue & Setup",
    items: [
      { name: "Venue hire",        cost: 40000 },
      { name: "Lighting & AV",     cost: 12000 },
      { name: "Stage / podium",    cost: 9000  },
      { name: "Furniture rental",  cost: 6000  },
    ],
  },
  {
    category: "Photography",
    items: [
      { name: "Photographer",      cost: 20000 },
      { name: "Videographer",      cost: 18000 },
      { name: "Drone coverage",    cost: 10000 },
    ],
  },
  {
    category: "Decor & Styling",
    items: [
      { name: "Florist",           cost: 8000  },
      { name: "Event stylist",     cost: 15000 },
      { name: "Custom signage",    cost: 4000  },
    ],
  },
  {
    category: "Logistics",
    items: [
      { name: "Transport / shuttles", cost: 10000 },
      { name: "Security",             cost: 8000  },
      { name: "Event coordinator",    cost: 12000 },
    ],
  },
];

const EXTRA_PILLS = [
  "Accessibility ramps", "Valet parking", "Live translation",
  "Prayer / quiet room", "Kids zone", "Merchandise stall",
  "First aid station", "Green room / backstage",
  "Permit / license help", "Guest gifting",
  "Halal / Jain menu", "Live social media wall",
];

const EVENT_TYPES = [
  "Wedding", "Birthday", "Corporate", "Concert",
  "Festival", "Sports", "Outdoor", "Expo",
  "Cultural", "Charity", "Food", "Other",
];

const STEPS = ["Basics", "Vendors", "Extras", "Budget"];

// ── main component ────────────────────────────────────────────────────────────
export default function CreateEventPage() {
  const navigate   = useNavigate();
  const location   = useLocation();

  // pre-filled reference event passed from ExplorePage via navigate state
  const prefillEvent = location.state?.referenceEvent ?? null;

  // ── form state ──
  const [step, setStep]       = useState(0); // 0-3 + 4=calculating + 5=done
  const [calcStep, setCalcStep] = useState(false);
  const [done, setDone]       = useState(false);

  const [name,     setName]    = useState("");
  const [evType,   setEvType]  = useState("");
  const [date,     setDate]    = useState("");
  const [time,     setTime]    = useState("18:00");
  const [location_, setLocation] = useState("");
  const [capacity, setCapacity] = useState(150);
  const [refEvent, setRefEvent] = useState(prefillEvent);

  const [vendors,  setVendors] = useState({}); // { name: cost }
  const [extras,   setExtras]  = useState(new Set());
  const [extraNote, setExtraNote] = useState("");

  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketQty,   setTicketQty]   = useState("");
  const [budget,      setBudget]      = useState(null);

  // pre-fill from explore card
  useEffect(() => {
    if (prefillEvent) {
      setEvType(prefillEvent.type || "");
      setRefEvent(prefillEvent);
    }
  }, [prefillEvent]);

  // ── vendor toggle ──
  const toggleVendor = (name, cost) => {
    setVendors((prev) => {
      const next = { ...prev };
      if (next[name] !== undefined) delete next[name];
      else next[name] = cost;
      return next;
    });
  };

  // ── extra toggle ──
  const toggleExtra = (pill) => {
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill);
      else next.add(pill);
      return next;
    });
  };

  // ── budget calculation ──
  const calculateBudget = () => {
    setCalcStep(true);
    const vendorTotal = Object.values(vendors).reduce((a, b) => a + b, 0);
    const cateringEst = capacity * 180;
    const extrasCost  = extras.size * 3500;
    const buffer      = Math.round((vendorTotal + cateringEst + extrasCost) * 0.12);
    const grand       = vendorTotal + cateringEst + extrasCost + buffer;
    setTimeout(() => {
      setBudget({ vendorTotal, cateringEst, extrasCost, buffer, grand });
      setCalcStep(false);
      setStep(3);
    }, 2200);
  };

  const revenue =
    ticketPrice && ticketQty
      ? Math.round(parseFloat(ticketPrice) * parseFloat(ticketQty))
      : null;

  // ── step navigation ──
  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // ── today date for min ──
  const today = new Date().toISOString().split("T")[0];

  // ── render ────────────────────────────────────────────────────────────────
  if (done) return <DoneScreen name={name} evType={evType} location_={location_} capacity={capacity} vendors={vendors} navigate={navigate} />;
  if (calcStep) return <CalcScreen />;

  return (
    <div className={styles.root}>
      {/* ── page header ── */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <BackIcon /> Back
        </button>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>
            Create <em>Event</em>
          </h1>
        </div>
      </header>

      {/* ── step pills ── */}
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

      <div className={styles.shimmerLine} />

      {/* ── step bodies ── */}
      <main className={styles.body}>
        {step === 0 && (
          <StepBasics
            name={name} setName={setName}
            evType={evType} setEvType={setEvType}
            date={date} setDate={setDate}
            time={time} setTime={setTime}
            location_={location_} setLocation={setLocation}
            capacity={capacity} setCapacity={setCapacity}
            refEvent={refEvent} setRefEvent={setRefEvent}
            today={today}
            onNext={goNext}
          />
        )}
        {step === 1 && (
          <StepVendors
            vendors={vendors}
            toggleVendor={toggleVendor}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 2 && (
          <StepExtras
            extras={extras}
            toggleExtra={toggleExtra}
            extraNote={extraNote}
            setExtraNote={setExtraNote}
            onCalc={calculateBudget}
            onBack={goBack}
          />
        )}
        {step === 3 && budget && (
          <StepBudget
            budget={budget}
            vendors={vendors}
            capacity={capacity}
            extras={extras}
            ticketPrice={ticketPrice} setTicketPrice={setTicketPrice}
            ticketQty={ticketQty}    setTicketQty={setTicketQty}
            revenue={revenue}
            onBack={goBack}
            onDone={() => setDone(true)}
          />
        )}
      </main>
    </div>
  );
}

// ── Step 1: Basics ────────────────────────────────────────────────────────────
function StepBasics({ name, setName, evType, setEvType, date, setDate, time, setTime, location_, setLocation, capacity, setCapacity, refEvent, setRefEvent, today, onNext }) {
  const handleSelectRef = (ev) => {
    setRefEvent((prev) => (prev?.id === ev.id ? null : ev));
    if (!evType) setEvType(ev.type);
  };

  return (
    <div className={styles.stepWrap}>
      <div className={styles.fieldRow}>
        <Field label="Event name">
          <input
            className={styles.input}
            placeholder="e.g. Shubh's Summer Gala"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Type of event">
          <select className={styles.input} value={evType} onChange={(e) => setEvType(e.target.value)}>
            <option value="">Select type...</option>
            {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <div className={styles.fieldRow}>
        <Field label="Date of event">
          <input className={styles.input} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time">
          <input className={styles.input} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>

      <Field label="Location">
        <input
          className={styles.input}
          placeholder="City, Venue name (Landmark near venue)"
          value={location_}
          onChange={(e) => setLocation(e.target.value)}
        />
        <p className={styles.hint}>e.g. "Mumbai, The Taj Mahal Palace (Gateway of India)"</p>
      </Field>

      <Field label={`Expected capacity — ${capacity} guests`}>
        <input
          type="range" min={10} max={2000} step={10}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}><span>10</span><span>2,000</span></div>
      </Field>

      {/* ── reference event from Explore ── */}
      <div className={styles.sectionLabel}>
        Reference event from Explore Events
        <span className={styles.sectionNote}> — pick one to use as inspiration, or{" "}
          <button className={styles.linkBtn} onClick={() => window.open("/explore", "_blank")}>browse all events ↗</button>
        </span>
      </div>

      {refEvent && (
        <div className={styles.refSelected}>
          <div className={styles.refThumb} style={{ background: getGradient(refEvent.type) }}>
            <span>{getEmoji(refEvent.type)}</span>
          </div>
          <div className={styles.refInfo}>
            <div className={styles.refName}>{refEvent.title}</div>
            <div className={styles.refMeta}>{refEvent.type} · {refEvent.venue} · {refEvent.month} {refEvent.year}</div>
          </div>
          <button className={styles.refRemove} onClick={() => setRefEvent(null)}>✕ Remove</button>
        </div>
      )}

      <div className={styles.gallery}>
        {EVENTS.slice(0, 6).map((ev) => (
          <div
            key={ev.id}
            className={`${styles.galCard} ${refEvent?.id === ev.id ? styles.galSel : ""}`}
            onClick={() => handleSelectRef(ev)}
          >
            <div className={styles.galImg} style={{ background: getGradient(ev.type) }}>
              {ev.image
                ? <img src={ev.image} alt={ev.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                : <span style={{ fontSize: 24 }}>{getEmoji(ev.type)}</span>
              }
            </div>
            <div className={styles.galName}>{ev.title}</div>
            <div className={styles.galMeta}>{ev.type} · {ev.venue}</div>
            {refEvent?.id === ev.id && <div className={styles.galCheck}>✓</div>}
          </div>
        ))}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={() => alert("Saved to drafts")}>Save as draft</button>
        <button className={styles.btnPrimary} onClick={onNext} disabled={!name || !evType}>
          Next — Choose vendors
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Vendors ───────────────────────────────────────────────────────────
function StepVendors({ vendors, toggleVendor, onNext, onBack }) {
  const count = Object.keys(vendors).length;
  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>Select vendors for your event — mix and match like ingredients</p>
      <div className={styles.vendorGrid}>
        {VENDOR_CATALOGUE.map((cat) => (
          <div key={cat.category} className={styles.vCat}>
            <div className={styles.vCatTitle}>{cat.category}</div>
            {cat.items.map((item) => {
              const sel = vendors[item.name] !== undefined;
              return (
                <div
                  key={item.name}
                  className={`${styles.vItem} ${sel ? styles.vItemSel : ""}`}
                  onClick={() => toggleVendor(item.name, item.cost)}
                >
                  <span className={styles.vItemName}>{item.name}</span>
                  <div className={styles.vItemRight}>
                    <span className={styles.vItemCost}>₹{item.cost.toLocaleString("en-IN")}</span>
                    <div className={styles.vCheck}>{sel ? "✓" : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className={styles.vCount}>
        Selected: <strong>{count} vendor{count !== 1 ? "s" : ""}</strong>
        {count > 0 && ` · Est. vendor cost ₹${Object.values(vendors).reduce((a, b) => a + b, 0).toLocaleString("en-IN")}`}
      </p>
      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onNext}>Next — Extra requirements</button>
      </div>
    </div>
  );
}

// ── Step 3: Extras ────────────────────────────────────────────────────────────
function StepExtras({ extras, toggleExtra, extraNote, setExtraNote, onCalc, onBack }) {
  return (
    <div className={styles.stepWrap}>
      <p className={styles.stepDesc}>What else do you need? Pick any that apply</p>
      <div className={styles.extraPills}>
        {EXTRA_PILLS.map((pill) => (
          <button
            key={pill}
            className={`${styles.extraPill} ${extras.has(pill) ? styles.extraPillSel : ""}`}
            onClick={() => toggleExtra(pill)}
          >
            {pill}
          </button>
        ))}
      </div>
      <Field label="Anything else? Describe freely">
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          placeholder="e.g. Need a charging station, sunrise schedule, specific colour theme ivory and gold..."
          value={extraNote}
          onChange={(e) => setExtraNote(e.target.value)}
        />
      </Field>
      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onCalc}>
          Calculate avg budget
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Budget ────────────────────────────────────────────────────────────
function StepBudget({ budget, vendors, capacity, extras, ticketPrice, setTicketPrice, ticketQty, setTicketQty, revenue, onBack, onDone }) {
  const rows = [
    ...Object.entries(vendors).map(([name, cost]) => ({ label: name, amt: cost })),
    { label: `Per-head catering (${capacity} guests × ₹180)`, amt: budget.cateringEst },
    ...(extras.size > 0 ? [{ label: `Extra requirements (${extras.size} items)`, amt: budget.extrasCost }] : []),
    { label: "Contingency buffer (12%)", amt: budget.buffer },
  ];

  return (
    <div className={styles.stepWrap}>
      <div className={styles.budgetCard}>
        <div className={styles.budgetTitle}>Estimated cost breakdown</div>
        {rows.map((r) => (
          <div key={r.label} className={styles.budgetRow}>
            <span className={styles.budgetLabel}>{r.label}</span>
            <span className={styles.budgetAmt}>₹{r.amt.toLocaleString("en-IN")}</span>
          </div>
        ))}
        <div className={styles.budgetTotal}>
          <span className={styles.budgetTotalLabel}>Avg total estimate</span>
          <span className={styles.budgetTotalAmt}>₹{budget.grand.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className={styles.ticketSection}>
        <div className={styles.sectionLabel}>Ticket pricing (optional)</div>
        <div className={styles.fieldRow}>
          <Field label="Price per ticket (₹)">
            <input
              className={styles.input} type="number" placeholder="e.g. 1500"
              value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)}
            />
          </Field>
          <Field label="Max tickets">
            <input
              className={styles.input} type="number" placeholder="e.g. 200"
              value={ticketQty} onChange={(e) => setTicketQty(e.target.value)}
            />
          </Field>
        </div>
        {revenue !== null && (
          <div className={styles.revenueNote}>
            Potential gross revenue: <strong>₹{revenue.toLocaleString("en-IN")}</strong>
            {revenue >= budget.grand && <span className={styles.revGreen}> · Covers full cost ✓</span>}
          </div>
        )}
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} onClick={onBack}>Back</button>
        <button className={styles.btnPrimary} onClick={onDone}>
          Create event
        </button>
      </div>
    </div>
  );
}

// ── Calculating screen ────────────────────────────────────────────────────────
function CalcScreen() {
  const [widths, setWidths] = useState([0, 0, 0, 0, 0]);
  const labels = ["Vendors", "Venue", "Catering", "Extras", "Buffer"];
  const msgs   = ["Analysing vendor rates...", "Factoring in capacity...", "Applying regional pricing...", "Adding extras buffer...", "Finalising estimate..."];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    labels.forEach((_, i) => {
      setTimeout(() => {
        setWidths((prev) => {
          const next = [...prev];
          next[i] = 55 + Math.random() * 38;
          return next;
        });
        setMsgIdx(i);
      }, i * 400 + 100);
    });
  }, []);

  return (
    <div className={styles.calcRoot}>
      <div className={styles.calcTitle}>Calculating your event cost…</div>
      <div className={styles.calcBars}>
        {labels.map((label, i) => (
          <div key={label} className={styles.calcBarRow}>
            <span className={styles.calcBarLabel}>{label}</span>
            <div className={styles.calcBarTrack}>
              <div className={styles.calcBarFill} style={{ width: `${widths[i]}%`, transition: "width 0.7s ease" }} />
            </div>
          </div>
        ))}
      </div>
      <p className={styles.calcStatus}>{msgs[msgIdx]}</p>
    </div>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────
function DoneScreen({ name, evType, location_, capacity, vendors, navigate }) {
  return (
    <div className={styles.root}>
      <div className={styles.doneWrap}>
        <div className={styles.doneIcon}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M5 14l7 7L23 7" stroke="#c8af78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className={styles.doneTitle}>Event <em>created</em></h2>
        <p className={styles.doneSub}>Your event has been saved. Publish it now or find it in My Events under Drafts.</p>
        <div className={styles.donePills}>
          {[name || "Untitled", evType, location_ || "Location TBD", `${capacity} guests`, `${Object.keys(vendors).length} vendors`].filter(Boolean).map((t) => (
            <span key={t} className={styles.donePill}>{t}</span>
          ))}
        </div>
        <div className={styles.btnRow} style={{ justifyContent: "center" }}>
          <button className={styles.btnPrimary} onClick={() => alert("Publishing event...")}>Publish now</button>
          <button className={styles.btnSecondary} onClick={() => navigate("/my-events")}>Go to My Events</button>
        </div>
      </div>
    </div>
  );
}

// ── tiny shared components ────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 12L6 8l4-4" />
    </svg>
  );
}
