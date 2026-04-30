import { useState } from "react";
import { BookmarkIcon } from "./BookmarkIcon";
import { THEME_GRADIENTS, EVENT_CATEGORIES } from "../context/data/events";
import styles from "./EventCard.module.css";

// ── helpers ───────────────────────────────────────────────────────────────
function getGradient(type) {
  const g = THEME_GRADIENTS[type] || ["#f5f5f5", "#e0e0e0"];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}

function getEmoji(type) {
  return EVENT_CATEGORIES.find((c) => c.type === type)?.icon ?? "📅";
}

function avatarInitials(name) {
  return (name || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAccentColor(type) {
  const map = {
    Wedding: "#fcb69f", Birthday: "#fed6e3", Corporate: "#a8b8ff",
    Concert: "#9b59b6", Festival: "#fad0c4", Sports: "#4fc96d",
    Outdoor: "#3d9970", Expo: "#bdbdbd", Cultural: "#fdcb6e",
    Charity: "#e84393", Food: "#f39c12",
  };
  return map[type] || "#c9a84c";
}

function getRelated(event, allEvents) {
  return allEvents
    .filter((e) => e.id !== event.id && e.type === event.type)
    .concat(allEvents.filter((e) => e.id !== event.id && e.type !== event.type))
    .slice(0, 5);
}

// ── Expand Panel ──────────────────────────────────────────────────────────
function ExpandPanel({ event, allEvents, onClose, onRelatedClick, isBookmarked, onBookmark }) {
  const related = getRelated(event, allEvents);

  return (
    <div style={{
      background: "var(--cream, #FBF6EE)",
      borderRadius: 20,
      border: "1px solid #e8ddd0",
      overflow: "hidden",
      marginBottom: 18,
      animation: "epSlide 0.28s cubic-bezier(0.22,1,0.36,1)",
      boxShadow: "0 8px 40px rgba(26,16,8,0.10)",
    }}>
      <style>{`
        @keyframes epSlide {
          from { opacity:0; transform:translateY(-14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .ep-close:hover { background: rgba(255,255,255,0.45) !important; }
        .ep-bm:hover    { transform: scale(1.12) !important; }
        .ep-cta:hover   { background: #3a2a10 !important; }
        .ep-rel:hover   { transform: scale(1.05) !important; }
      `}</style>

      {/* top: image | details */}
      <div style={{ display: "grid", gridTemplateColumns: "42% 1fr", minHeight: 420 }}>

        {/* image col */}
        <div style={{
          background: getGradient(event.type),
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 108,
        }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.22) 0%,transparent 55%)", pointerEvents:"none" }} />

          {/* type badge */}
          <span style={{
            position:"absolute", top:16, left:16, fontSize:10, fontWeight:700,
            letterSpacing:1.2, textTransform:"uppercase", padding:"5px 13px",
            borderRadius:20, color:"#fff", background:"rgba(0,0,0,0.30)", backdropFilter:"blur(6px)",
          }}>{event.type}</span>

          {/* close */}
          <button className="ep-close" onClick={onClose} style={{
            position:"absolute", top:14, right:14, width:32, height:32,
            borderRadius:"50%", background:"rgba(255,255,255,0.25)", border:"none",
            cursor:"pointer", color:"#fff", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"background 0.18s",
          }}>✕</button>

          {/* bookmark — bottom right of image */}
          <button className="ep-bm" onClick={onBookmark} style={{
            position:"absolute", bottom:16, right:16, width:40, height:40,
            borderRadius:"50%",
            background: isBookmarked ? "rgba(201,168,76,0.88)" : "rgba(255,255,255,0.22)",
            border:"none", cursor:"pointer", color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(4px)",
            transition:"background 0.18s, transform 0.15s",
            boxShadow: isBookmarked ? "0 2px 12px rgba(201,168,76,0.4)" : "none",
          }}>
            <BookmarkIcon filled={isBookmarked} size={20} color="#fff" />
          </button>

          <span style={{ zIndex:1, position:"relative", filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.18))" }}>
            {getEmoji(event.type)}
          </span>
        </div>

        {/* details col */}
        <div style={{ padding:"28px 32px", display:"flex", flexDirection:"column", justifyContent:"space-between", background:"var(--cream, #FBF6EE)" }}>
          <div>
            <div style={{ fontSize:11, letterSpacing:1.6, textTransform:"uppercase", color:"#c4a060", marginBottom:8, fontWeight:600 }}>
              {event.type}
            </div>
            <div style={{ fontSize:28, fontWeight:700, color:"#2E1C10", marginBottom:20, lineHeight:1.2, fontFamily:"'Playfair Display', serif" }}>
              {event.title}
            </div>

            {/* meta grid — 2×2 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
              {[
                ["Date",    `${event.month} ${event.year}`],
                ["Venue",   event.venue],
                ["Scale",   event.scale],
                ["Planner", event.planner],
              ].map(([label, val]) => (
                <div key={label} style={{ background:"rgba(232,221,208,0.35)", borderRadius:10, padding:"11px 13px", border:"1px solid #e8ddd0" }}>
                  <div style={{ fontSize:9, letterSpacing:1.1, textTransform:"uppercase", color:"#b0906a", marginBottom:4, fontWeight:600 }}>{label}</div>
                  <div style={{ fontSize:14, color:"#2E1C10", fontWeight:600 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* pills */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:20 }}>
              {[event.type, event.venue, `${event.scale} scale`].map((pill) => (
                <span key={pill} style={{ fontSize:12, padding:"5px 14px", borderRadius:20, border:"1px solid #e8ddd0", color:"#7a6248", background:"#f5f0ea", fontWeight:500 }}>
                  {pill}
                </span>
              ))}
            </div>

            {/* auto-generated description */}
            <div style={{ fontSize:14, color:"#8a7060", lineHeight:1.78 }}>
              A {event.scale.toLowerCase()}-scale {event.type.toLowerCase()} event planned by{" "}
              <strong style={{ color:"#2E1C10" }}>{event.planner}</strong>, held at{" "}
              <strong style={{ color:"#2E1C10" }}>{event.venue}</strong> in {event.month} {event.year}.
              Every detail thoughtfully curated for an unforgettable experience.
            </div>
          </div>

          {/* footer */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{
                width:38, height:38, borderRadius:"50%",
                background: getAccentColor(event.type),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:700, color:"#2E1C10",
              }}>
                {avatarInitials(event.planner)}
              </div>
              <div>
                <div style={{ fontSize:13, color:"#2E1C10", fontWeight:600 }}>{event.planner}</div>
                <div style={{ fontSize:11, color:"#c4a882" }}>Event Planner</div>
              </div>
            </div>
            <button className="ep-cta" style={{
              background:"#2E1C10", color:"#FBF6EE", border:"none",
              padding:"13px 28px", borderRadius:12, fontSize:13,
              fontWeight:600, cursor:"pointer", transition:"background 0.18s",
              letterSpacing:0.3, fontFamily:"inherit",
            }}>
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <>
          <div style={{ borderTop:"1px solid #e8ddd0", padding:"14px 20px 10px", fontSize:10, letterSpacing:1.2, textTransform:"uppercase", color:"#c4a882", fontWeight:600 }}>
            More like this
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, padding:"0 16px 16px" }}>
            {related.map((r) => (
              <div key={r.id} className="ep-rel" onClick={() => onRelatedClick(r)}
                style={{ borderRadius:12, overflow:"hidden", cursor:"pointer", aspectRatio:"4/3", position:"relative", transition:"transform 0.15s" }}>
                <div style={{ width:"100%", height:"100%", background:getGradient(r.type), display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                  {getEmoji(r.type)}
                </div>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"18px 8px 7px", background:"linear-gradient(to top,rgba(0,0,0,0.58),transparent)", fontSize:11, color:"#fff", fontWeight:500, lineHeight:1.3 }}>
                  {r.title}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── EventCard (drop-in replacement) ──────────────────────────────────────
// New props needed from ExplorePage:
//   allEvents={EVENTS}  openId={openId}  onOpen={setOpenId}  onClose={()=>setOpenId(null)}
export function EventCard({ event, isBookmarked, onBookmarkToggle, allEvents = [], openId, onOpen, onClose }) {
  const [hovered, setHovered] = useState(false);
  const [bmHovered, setBmHovered] = useState(false);

  const isOpen = openId === event.id;

 const handleBookmark = (e) => {
  e.stopPropagation();
  onBookmarkToggle({
    id: event.id,
    name: event.title,
    image: null,
    type: event.type,
  });
};

  return (
    <>
      <div
         className={styles.card}
        onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
  onClick={() => isOpen ? onClose() : onOpen(event.id)}
  style={{
    transform: hovered ? "translateY(-5px)" : "translateY(0)",
    borderColor: isOpen ? "#c9a84c" : undefined,
    boxShadow: isOpen ? "0 12px 32px rgba(26,16,8,0.15)" : undefined,
    display: isOpen ? "none" : undefined,  // ← ADD THIS
  }}
>
        {/* image */}
        <div className={styles.imgArea} style={{ background: getGradient(event.type) }}>
          <div className={styles.imgContent}>
            <div className={styles.emoji}>{getEmoji(event.type)}</div>
            <div className={styles.imgDate}>{event.month} {event.year}</div>
          </div>

          {/* bookmark — bottom right */}
          <button
            className={styles.bmBtn}
            style={{
              opacity: hovered || isBookmarked ? 1 : 0,
              background: isBookmarked
                ? "rgba(201,168,76,0.88)"
                : bmHovered ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.52)",
            }}
            onClick={handleBookmark}
            onMouseEnter={() => setBmHovered(true)}
            onMouseLeave={() => setBmHovered(false)}
            title={isBookmarked ? "Remove bookmark" : "Save event"}
          >
            <BookmarkIcon filled={isBookmarked} size={15} color="#fff" />
          </button>
        </div>

        {/* body */}
        <div className={styles.body}>
          <div className={styles.tags}>
            <span className={styles.tagType}>{event.type}</span>
            <span className={styles.tagVenue}>{event.venue}</span>
            <span className={styles.tagScale}>{event.scale}</span>
          </div>
          <div className={styles.title}>{event.title}</div>
          <div className={styles.meta}>
            <span>📅 {event.month} {event.year}</span>
            <span className={styles.planner}>by {event.planner}</span>
          </div>
        </div>
      </div>

      {/* expand panel — spans full grid width */}
      {isOpen && allEvents.length > 0 && (
        <div style={{ gridColumn: "1 / -1" }}>
          <ExpandPanel
            event={event}
            allEvents={allEvents}
            onClose={onClose}
            onRelatedClick={(r) => onOpen(r.id)}
            isBookmarked={isBookmarked}
           onBookmark={() => onBookmarkToggle({
            id: event.id,
            name: event.title,
            image: null,
            type: event.type,
          })}
          />
        </div>
      )}
    </>
  );
}