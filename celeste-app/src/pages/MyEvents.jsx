import { useState } from "react";
import { useNavigate } from "react-router-dom"; // remove if not using React Router

// ─── Mock data shape – replace with real API call later ───────────────────────
const MOCK_EVENTS = []; // keep empty for now; fill with real data when ready
/*
  Each event object will look like:
  {
    id: "evt_001",
    title: "Wilderness Trek – Himalayas",
    date: "2025-11-14",
    location: "Manali, HP",
    status: "upcoming" | "past" | "draft",
    coverImage: "https://...",
  }
*/

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS = ["Upcoming", "Past", "Drafts"];

export default function MyEvents() {
  const navigate = useNavigate(); // swap for your router's hook if different
  const [activeTab, setActiveTab] = useState("Upcoming");

  const filtered = MOCK_EVENTS.filter(
    (e) => e.status === activeTab.toLowerCase()
  );

  return (
    <div style={styles.root}>
      {/* ── Top bar ── */}
      <header style={styles.topbar}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <BackIcon />
          Back
        </button>
        <h6 style={styles.pageTitle}>My Events</h6>
      </header>

      <div style={styles.shimmerLine} />

      {/* ── Tabs ── */}
      <nav style={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* ── Body ── */}
      <main style={styles.body}>
        {filtered.length === 0 ? (
          <EmptyState tab={activeTab} navigate={navigate} />
        ) : (
          <EventGrid events={filtered} navigate={navigate} />
        )}
      </main>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ tab, navigate }) {
  const copy = {
    Upcoming: {
      tag: "Your journey begins here",
      heading: (
        <>
          No events yet,
          <br />
          <em>your story awaits</em>
        </>
      ),
      sub: "You haven't joined or created any upcoming events yet. When you do, every experience will live right here.",
    },
    Past: {
      tag: "Nothing in the archive",
      heading: (
        <>
          No past events
          <br />
          <em>just yet</em>
        </>
      ),
      sub: "Attended events and completed experiences will appear here once your first adventure wraps up.",
    },
    Drafts: {
      tag: "Your ideas in progress",
      heading: (
        <>
          No drafts saved
          <br />
          <em>start building</em>
        </>
      ),
      sub: "Events you've started creating but haven't published will be saved here automatically.",
    },
  };

  const { tag, heading, sub } = copy[tab];

  return (
    <div style={styles.emptyWrap}>
      <CalendarIcon />
      <p style={styles.emptyTag}>{tag}</p>
      <h2 style={styles.emptyHeading}>{heading}</h2>
      <p style={styles.emptySub}>{sub}</p>

      <button
        style={styles.cta}
        onClick={() => navigate("/events/create")} // ← adjust route as needed
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#d9be8a";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#c9a96e";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <PlusIcon />
        Create your first event
      </button>

      <div style={styles.divider} />
      <p style={styles.hint}>Or browse events others are hosting →</p>
    </div>
  );
}

// ─── Event Grid (used once you have real data) ─────────────────────────────────
function EventGrid({ events, navigate }) {
  return (
    <div style={styles.grid}>
      {events.map((evt) => (
        <div
          key={evt.id}
          style={styles.card}
          onClick={() => navigate(`/events/${evt.id}`)}
        >
          <div
            style={{
              ...styles.cardImg,
              backgroundImage: evt.coverImage
                ? `url(${evt.coverImage})`
                : "none",
              background: evt.coverImage ? undefined : "#2a2420",
            }}
          />
          <div style={styles.cardBody}>
            <span style={styles.cardStatus}>{evt.status}</span>
            <p style={styles.cardTitle}>{evt.title}</p>
            <p style={styles.cardMeta}>
              {evt.date} · {evt.location}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 12L6 8l4-4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2v8M2 6h8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ opacity: 0.22, marginBottom: 28 }}>
      <rect x="8" y="16" width="56" height="46" rx="3" stroke="#c9a96e" strokeWidth="1.5" />
      <path d="M8 26h56" stroke="#c9a96e" strokeWidth="1.5" />
      <path d="M24 8v16M48 8v16" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="36" cy="47" r="8" stroke="#c9a96e" strokeWidth="1.2" strokeDasharray="3 2" />
      <path d="M36 43v4l2.5 2" stroke="#c9a96e" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
// Using plain JS objects so this file needs zero extra dependencies.
// If you use Tailwind or CSS modules, converting is straightforward.
const styles = {
  root: {
  minHeight: "100vh",
  background: "#1a1612",
  fontFamily: "'DM Sans', sans-serif",
  color: "#e8dcc8",
  display: "flex",
  flexDirection: "column",
  paddingTop: "70px",   // ← keeps page below navbar
  position: "relative",
  zIndex: 1,            // ← ADD THIS so dropdowns don't bleed over
},
  topbar: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 32px",
  borderBottom: "0.5px solid rgba(255,255,255,0.08)",
},
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#b5a48a",
    fontSize: 13,
    cursor: "pointer",
    letterSpacing: "0.02em",
    background: "none",
    border: "none",
    padding: 0,
    transition: "color 0.2s",
  },

pageTitle: {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 50,
  fontWeight: 300,
  color: "#e8dcc8",
  margin: 0,
  position: "absolute",   // ← ADD
  left: "50%",            // ← ADD
  transform: "translateX(-50%)",  // ← ADD
},
  breadcrumb: {
    fontSize: 11,
    color: "rgba(181,164,138,0.4)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  shimmerLine: {
    height: "0.5px",
    background: "linear-gradient(to right, transparent, rgba(201,169,110,0.12), transparent)",
    margin: "0 32px",
  },
  tabs: {
  display: "flex",
  padding: "0 32px",
  background: "#1a1510",
  gap: 0,
  justifyContent: "flex-start",  // ← ADD THIS

},
tab: {
  fontFamily: "'Jost', sans-serif",
  fontSize: 11.5,
  fontWeight: 400,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(200,175,120,0.4)",
  padding: "18px 0",
  marginRight: 40,
  cursor: "pointer",
  background: "none",
  border: "none",
  borderBottom: "1.5px solid transparent",
  transition: "color 0.2s, borderBottomColor 0.2s",
  whiteSpace: "nowrap",
},
tabActive: {
  color: "#c8af78",
  borderBottomColor: "#c8af78",
},
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    
      padding: "24px 32px",  // ← CHANGE 48px to 24px

  },
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 380,
    width: "100%",
      paddingTop: "8px",  // ← ADD THIS LINE

  },
  emptyTag: {
    fontSize: 10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#c9a96e",
    marginBottom: 14,
  },
  emptyHeading: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 34,
    fontWeight: 400,
    color: "#e8dcc8",
    textAlign: "center",
    lineHeight: 1.2,
    marginBottom: 14,
    letterSpacing: "0.01em",
  },
  emptySub: {
    fontSize: 13,
    color: "rgba(181,164,138,0.5)",
    textAlign: "center",
    lineHeight: 1.75,
    marginBottom: 32,
  },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#c9a96e",
    color: "#1a1612",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "13px 32px",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.15s",
  },
  divider: {
    width: 40,
    height: "0.5px",
    background: "rgba(181,164,138,0.15)",
    margin: "28px auto",
  },
  hint: {
    fontSize: 11,
    color: "rgba(181,164,138,0.28)",
    letterSpacing: "0.04em",
  },
  // ── event grid (for when data exists) ──
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
    width: "100%",
    maxWidth: 900,
  },
  card: {
    background: "#221e1a",
    border: "0.5px solid rgba(255,255,255,0.07)",
    borderRadius: 8,
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.2s, transform 0.2s",
  },
  cardImg: {
    height: 140,
    backgroundSize: "cover",
    backgroundPosition: "center",
  },
  cardBody: {
    padding: "14px 16px",
  },
  cardStatus: {
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#c9a96e",
    display: "block",
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    fontWeight: 500,
    color: "#e8dcc8",
    margin: "0 0 4px",
  },
  cardMeta: {
    fontSize: 12,
    color: "rgba(181,164,138,0.5)",
    margin: 0,
  },
};
