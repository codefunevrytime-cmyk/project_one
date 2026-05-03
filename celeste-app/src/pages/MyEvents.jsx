import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const API = "http://localhost:5000/api";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  new: {
    label: "Soon to be Reviewed",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.25)",
    glow: "rgba(96,165,250,0.5)",
    pulse: "pulseSlow",
  },
  contacted: {
    label: "You'll be Contacted Soon!",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    glow: "rgba(245,158,11,0.5)",
    pulse: "pulseMed",
  },
  confirmed: {
    label: "Confirmed!",
    color: "#6fcf97",
    bg: "rgba(111,207,151,0.08)",
    border: "rgba(111,207,151,0.25)",
    glow: "rgba(111,207,151,0.6)",
    pulse: "pulseFast",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isPast(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function parseEventDetails(message) {
  if (!message) return {};
  const result = {};
  const lines = message.split('\n');
  lines.forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) result[key.trim().toLowerCase()] = rest.join(':').trim();
  });
  return result;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Glow dot component ────────────────────────────────────────────────────────
function GlowDot({ config }) {
  return (
    <>
      <style>{`
        @keyframes pulseSlow {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 ${config.glow}; }
          50% { opacity: 0.6; transform: scale(0.85); box-shadow: 0 0 0 6px transparent; }
        }
        @keyframes pulseMed {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 ${config.glow}; }
          50% { opacity: 0.7; transform: scale(0.9); box-shadow: 0 0 0 5px transparent; }
        }
        @keyframes pulseFast {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 ${config.glow}; }
          50% { opacity: 0.8; transform: scale(0.95); box-shadow: 0 0 0 4px transparent; }
        }
      `}</style>
      <span style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        background: config.color,
        marginRight: 8,
        flexShrink: 0,
        animation: `${config.pulse} ${config.pulse === 'pulseSlow' ? '2.4s' : config.pulse === 'pulseMed' ? '1.8s' : '1.2s'} ease-in-out infinite`,
      }} />
    </>
  );
}

// ── Event Card (list view) ────────────────────────────────────────────────────
function EventCard({ booking }) {
  const details  = parseEventDetails(booking.message);
  const cfg      = STATUS_CONFIG[booking.status] || STATUS_CONFIG.new;
  const eventDate = booking.event_date
    ? new Date(booking.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date TBD';
  const receivedDate = new Date(booking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Extract readable fields
  const location  = details['location'] || '—';
  const time      = details['time'] || '—';
  const capacity  = details['capacity'] || '—';
  const vendors   = details['vendors'] || null;
  const extras    = details['extras'] || null;
  const budget    = details['est. budget'] || details['estimated budget'] || null;

  return (
    <div style={{
      display: 'flex',
      background: '#1e1a14',
      border: `0.5px solid ${cfg.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 16,
      transition: 'border-color 0.3s',
      position: 'relative',
    }}>
      {/* Left color strip */}
      <div style={{ width: 4, background: cfg.color, flexShrink: 0, opacity: 0.7 }} />

      {/* Left: image placeholder */}
      <div style={{
        width: 200, minHeight: 180, flexShrink: 0,
        background: `linear-gradient(135deg, #2a2118, #1a1612)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '0.5px solid rgba(200,175,120,0.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        <EventTypeIcon type={booking.event_type} />
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,175,120,0.4)' }}>
            {booking.event_type}
          </span>
        </div>
      </div>

      {/* Right: details */}
      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Top row: title + status badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: '#e8dcc8', margin: '0 0 4px' }}>
              {details['event'] || booking.event_type || 'My Event'}
            </h3>
            <div style={{ fontSize: 11, color: 'rgba(200,175,120,0.4)', letterSpacing: '0.04em' }}>
              Submitted {receivedDate}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: cfg.bg,
            border: `0.5px solid ${cfg.border}`,
            borderRadius: 20, padding: '5px 12px',
            flexShrink: 0, marginLeft: 16,
          }}>
            <GlowDot config={cfg} />
            <span style={{ fontSize: 11, fontWeight: 500, color: cfg.color, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            ['📅 Date', eventDate],
            ['📍 Location', location],
            ['⏰ Time', time],
            ['👥 Capacity', capacity],
            ...(budget ? [['💰 Est. Budget', budget]] : []),
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'rgba(200,175,120,0.04)', border: '0.5px solid rgba(200,175,120,0.08)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,175,120,0.35)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: '#e8dcc8', fontWeight: 400 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Vendors + extras */}
        {(vendors || extras) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {vendors && vendors.split(',').map(v => (
              <span key={v} style={{ fontSize: 10, padding: '3px 10px', border: '0.5px solid rgba(200,175,120,0.15)', borderRadius: 20, color: 'rgba(200,175,120,0.55)', letterSpacing: '0.04em' }}>
                {v.trim()}
              </span>
            ))}
            {extras && extras.split(',').slice(0, 3).map(e => (
              <span key={e} style={{ fontSize: 10, padding: '3px 10px', border: '0.5px solid rgba(200,175,120,0.1)', borderRadius: 20, color: 'rgba(200,175,120,0.35)', letterSpacing: '0.04em' }}>
                {e.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event type icon ───────────────────────────────────────────────────────────
function EventTypeIcon({ type }) {
  const icons = {
    Wedding: '💍', Birthday: '🎂', Corporate: '💼', Concert: '🎵',
    Festival: '🎊', Sports: '🏆', Outdoor: '🌿', Expo: '🏛',
    Cultural: '🎭', Charity: '❤️', Food: '🍽', Other: '📅',
  };
  return <span style={{ fontSize: 48, opacity: 0.6 }}>{icons[type] || '📅'}</span>;
}

// ── Past Event Card (simpler, no status) ─────────────────────────────────────
function PastEventCard({ booking }) {
  const details   = parseEventDetails(booking.message);
  const eventDate = booking.event_date
    ? new Date(booking.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date TBD';

  return (
    <div style={{
      display: 'flex', background: '#1a1612',
      border: '0.5px solid rgba(200,175,120,0.08)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 16, opacity: 0.75,
    }}>
      <div style={{ width: 4, background: 'rgba(200,175,120,0.2)', flexShrink: 0 }} />
      <div style={{
        width: 160, minHeight: 140, flexShrink: 0,
        background: '#1e1a14', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '0.5px solid rgba(200,175,120,0.06)',
      }}>
        <EventTypeIcon type={booking.event_type} />
      </div>
      <div style={{ flex: 1, padding: '18px 22px' }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400, color: 'rgba(232,220,200,0.7)', margin: '0 0 6px' }}>
          {details['event'] || booking.event_type || 'My Event'}
        </h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'rgba(200,175,120,0.4)' }}>📅 {eventDate}</span>
          {details['location'] && <span style={{ fontSize: 12, color: 'rgba(200,175,120,0.4)' }}>📍 {details['location']}</span>}
          <span style={{ fontSize: 11, padding: '2px 10px', border: '0.5px solid rgba(200,175,120,0.12)', borderRadius: 20, color: 'rgba(200,175,120,0.35)' }}>Completed</span>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ tab, navigate }) {
  const copy = {
    Upcoming: {
      tag: "Your journey begins here",
      heading: <><span>No events yet,</span><br /><em>your story awaits</em></>,
      sub: "You haven't joined or created any upcoming events yet. When you do, every experience will live right here.",
    },
    Past: {
      tag: "Nothing in the archive",
      heading: <><span>No past events</span><br /><em>just yet</em></>,
      sub: "Attended events and completed experiences will appear here once your first adventure wraps up.",
    },
    Drafts: {
      tag: "Your ideas in progress",
      heading: <><span>No drafts saved</span><br /><em>start building</em></>,
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
      {tab === 'Upcoming' && (
        <>
          <button style={styles.cta} onClick={() => navigate('/create-event')}
            onMouseEnter={e => { e.currentTarget.style.background = '#d9be8a'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#c9a96e'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <PlusIcon /> Create your first event
          </button>
          <div style={styles.divider} />
          <p style={styles.hint}>Or browse events others are hosting →</p>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyEvents() {
  const navigate          = useNavigate();
  const { user }          = useAuth();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    fetch(`${API}/bookings/my?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => { setBookings(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const upcoming = bookings.filter(b => !isPast(b.event_date) && b.status !== 'completed');
  const past     = bookings.filter(b => isPast(b.event_date) || b.status === 'completed');

  const TABS = ['Upcoming', 'Past', 'Drafts'];

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes pulseSlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(96,165,250,0.5); }
          50% { box-shadow: 0 0 0 5px transparent; }
        }
        @keyframes pulseMed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50% { box-shadow: 0 0 0 4px transparent; }
        }
        @keyframes pulseFast {
          0%, 100% { box-shadow: 0 0 0 0 rgba(111,207,151,0.6); }
          50% { box-shadow: 0 0 0 3px transparent; }
        }
      `}</style>

      {/* Top bar */}
      <header style={styles.topbar}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}><BackIcon /> Back</button>
        <h6 style={styles.pageTitle}>My Events</h6>
      </header>

      <div style={styles.shimmerLine} />

      {/* Tabs */}
      <nav style={styles.tabs}>
        {TABS.map(tab => (
          <button key={tab} style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }} onClick={() => setActiveTab(tab)}>
            {tab}
            {tab === 'Upcoming' && upcoming.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(200,175,120,0.15)', color: '#c8af78', padding: '1px 6px', borderRadius: 10 }}>{upcoming.length}</span>
            )}
            {tab === 'Past' && past.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(200,175,120,0.08)', color: 'rgba(200,175,120,0.4)', padding: '1px 6px', borderRadius: 10 }}>{past.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Body */}
      <main style={{ ...styles.body, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        {loading ? (
          <div style={{ width: '100%', maxWidth: 800, padding: '60px 0', textAlign: 'center', color: 'rgba(200,175,120,0.4)', fontSize: 13 }}>Loading your events…</div>
        ) : activeTab === 'Upcoming' ? (
          upcoming.length === 0
            ? <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}><EmptyState tab="Upcoming" navigate={navigate} /></div>
            : <div style={{ width: '100%', maxWidth: 860 }}>
                <p style={{ fontSize: 11, color: 'rgba(200,175,120,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>{upcoming.length} upcoming event{upcoming.length !== 1 ? 's' : ''}</p>
                {upcoming.map(b => <EventCard key={b.id} booking={b} />)}
              </div>
        ) : activeTab === 'Past' ? (
          past.length === 0
            ? <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}><EmptyState tab="Past" navigate={navigate} /></div>
            : <div style={{ width: '100%', maxWidth: 860 }}>
                <p style={{ fontSize: 11, color: 'rgba(200,175,120,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>{past.length} past event{past.length !== 1 ? 's' : ''}</p>
                {past.map(b => <PastEventCard key={b.id} booking={b} />)}
              </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}><EmptyState tab="Drafts" navigate={navigate} /></div>
        )}
      </main>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 12L6 8l4-4" /></svg>;
}
function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v8M2 6h8" /></svg>;
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: { minHeight: '100vh', background: '#1a1612', fontFamily: "'DM Sans', sans-serif", color: '#e8dcc8', display: 'flex', flexDirection: 'column', paddingTop: '70px', position: 'relative', zIndex: 1 },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, color: '#b5a48a', fontSize: 13, cursor: 'pointer', letterSpacing: '0.02em', background: 'none', border: 'none', padding: 0 },
  pageTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 50, fontWeight: 300, color: '#e8dcc8', margin: 0, position: 'absolute', left: '50%', transform: 'translateX(-50%)' },
  shimmerLine: { height: '0.5px', background: 'linear-gradient(to right, transparent, rgba(201,169,110,0.12), transparent)', margin: '0 32px' },
  tabs: { display: 'flex', padding: '0 32px', background: '#1a1510', gap: 0, justifyContent: 'flex-start' },
  tab: { fontFamily: "'Jost', sans-serif", fontSize: 11.5, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,175,120,0.4)', padding: '18px 0', marginRight: 32, cursor: 'pointer', background: 'none', border: 'none', borderBottom: '1.5px solid transparent', transition: 'color 0.2s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' },
  tabActive: { color: '#c8af78', borderBottomColor: '#c8af78' },
  body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 32px 48px' },
  emptyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 380, width: '100%', paddingTop: 40 },
  emptyTag: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 14 },
  emptyHeading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 400, color: '#e8dcc8', textAlign: 'center', lineHeight: 1.2, marginBottom: 14 },
  emptySub: { fontSize: 13, color: 'rgba(181,164,138,0.5)', textAlign: 'center', lineHeight: 1.75, marginBottom: 32 },
  cta: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#c9a96e', color: '#1a1612', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '13px 32px', border: 'none', cursor: 'pointer', transition: 'background 0.2s, transform 0.15s' },
  divider: { width: 40, height: '0.5px', background: 'rgba(181,164,138,0.15)', margin: '28px auto' },
  hint: { fontSize: 11, color: 'rgba(181,164,138,0.28)', letterSpacing: '0.04em' },
};