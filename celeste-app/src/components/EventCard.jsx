import { useState } from "react";
import { BookmarkIcon } from "./BookmarkIcon";
import { THEME_GRADIENTS, EVENT_CATEGORIES } from "../context/data/events";
import styles from "./EventCard.module.css";
import { useNavigate } from "react-router-dom";

// ── helpers ───────────────────────────────────────────────────────────────
function getGradient(type) {
  const g = THEME_GRADIENTS[type] || ["#f5f5f5", "#e0e0e0"];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}

function getEmoji(type) {
  return EVENT_CATEGORIES.find((c) => c.type === type)?.icon ?? "📅";
}

function getRelated(event, allEvents) {
  return allEvents
    .filter((e) => e.id !== event.id && e.type === event.type)
    .concat(allEvents.filter((e) => e.id !== event.id && e.type !== event.type))
    .slice(0, 5);
}

function getImages(event) {
  if (Array.isArray(event.images) && event.images.length > 0) return event.images;
  return event.image_url ? [event.image_url] : [];
}

// ── Expand Panel ──────────────────────────────────────────────────────────
function ExpandPanel({ event, allEvents, onClose, onRelatedClick, isBookmarked, onBookmark }) {
  const related = getRelated(event, allEvents);
  const navigate = useNavigate();

  const venue       = event.venue       || "—";
  const scale       = event.scale       || "—";
  const description = event.description || event.planner || null;

  const pills = [
    event.type,
    venue !== "—" ? venue : null,
    scale !== "—" ? `${scale} scale` : null,
  ].filter(Boolean);

  const images = getImages(event);
  const total  = images.length;
  const [activeIdx, setActiveIdx] = useState(0);
  const [sliding, setSliding] = useState(false);

  const goTo = (idx) => {
    if (total === 0 || idx === activeIdx || sliding) return;
    setSliding(true);
    setTimeout(() => {
      setActiveIdx(idx);
      setSliding(false);
    }, 280);
  };
  const prevImg = () => goTo((activeIdx - 1 + total) % total);
  const nextImg = () => goTo((activeIdx + 1) % total);
  const currentImg = images[activeIdx] || null;

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
        .ep-carousel-nav { position:absolute; top:50%; transform:translateY(-50%); z-index:4; width:34px; height:34px; border-radius:50%; background:rgba(0,0,0,0.45); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.2); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.18s, transform 0.15s; }
        .ep-carousel-nav:hover { background:rgba(0,0,0,0.72); transform:translateY(-50%) scale(1.1); }
        .ep-carousel-prev { left:14px; }
        .ep-carousel-next { right:14px; }
        .ep-carousel-dots { position:absolute; bottom:14px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:4; }
        .ep-carousel-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.4); cursor:pointer; transition:background 0.2s, transform 0.2s; border:none; padding:0; }
        .ep-carousel-dot.active { background:#fff; transform:scale(1.3); }
        .ep-carousel-counter { position:absolute; top:14px; right:52px; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); color:#fff; font-size:11px; padding:4px 10px; border-radius:20px; border:0.5px solid rgba(255,255,255,0.2); z-index:4; }
      `}</style>

      {/* top: image | details */}
      <div style={{ display: "grid", gridTemplateColumns: "42% 1fr", minHeight: 420 }}>

        {/* image col */}
        <div style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 108, overflow: "hidden",
          background: currentImg ? "#1a1008" : getGradient(event.type),
        }}>
          {currentImg
            ? <img src={currentImg} alt={event.title} key={currentImg}
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", position:"absolute", inset:0, transition:"opacity 0.35s ease, transform 0.35s ease", opacity: sliding ? 0 : 1, transform: sliding ? "scale(1.03)" : "scale(1)" }} />
            : <span style={{ zIndex:1, position:"relative", filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.18))" }}>
                {getEmoji(event.type)}
              </span>
          }

          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.22) 0%,transparent 55%)", pointerEvents:"none", zIndex:2 }} />

          {/* type badge */}
          <span style={{
            position:"absolute", top:16, left:16, fontSize:10, fontWeight:700,
            letterSpacing:1.2, textTransform:"uppercase", padding:"5px 13px",
            borderRadius:20, color:"#fff", background:"rgba(0,0,0,0.30)", backdropFilter:"blur(6px)", zIndex:3,
          }}>{event.type}</span>

          {/* scale badge */}
          {event.scale && (
            <span style={{
              position:"absolute", top:16, right:52, fontSize:10, fontWeight:600,
              padding:"4px 10px", borderRadius:20, color:"#e8c97a",
              background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)",
              border:"0.5px solid rgba(232,201,122,0.3)", zIndex:3,
            }}>{event.scale}</span>
          )}

          {/* photo counter */}
          {total > 1 && <div className="ep-carousel-counter">{activeIdx + 1} / {total}</div>}

          {/* close */}
          <button className="ep-close" onClick={onClose} style={{
            position:"absolute", top:14, right:14, width:32, height:32,
            borderRadius:"50%", background:"rgba(255,255,255,0.25)", border:"none",
            cursor:"pointer", color:"#fff", fontSize:16,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"background 0.18s", zIndex:3,
          }}>✕</button>

          {/* prev / next arrows */}
          {total > 1 && (
            <>
              <button className="ep-carousel-nav ep-carousel-prev" onClick={prevImg} title="Previous">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="ep-carousel-nav ep-carousel-next" onClick={nextImg} title="Next">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {/* bookmark */}
          <button className="ep-bm" onClick={onBookmark} style={{
            position:"absolute", bottom:16, right:16, width:40, height:40,
            borderRadius:"50%",
            background: isBookmarked ? "rgba(201,168,76,0.88)" : "rgba(255,255,255,0.22)",
            border:"none", cursor:"pointer", color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(4px)",
            transition:"background 0.18s, transform 0.15s",
            boxShadow: isBookmarked ? "0 2px 12px rgba(201,168,76,0.4)" : "none",
            zIndex:3,
          }}>
            <BookmarkIcon filled={isBookmarked} size={20} color="#fff" />
          </button>

          {/* venue pin */}
          {event.venue && (
            <div style={{
              position:"absolute", bottom:16, left:16,
              display:"flex", alignItems:"center", gap:5,
              background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)",
              border:"0.5px solid rgba(255,255,255,0.15)",
              borderRadius:20, padding:"4px 11px", zIndex:3,
              fontSize:11, color:"rgba(255,255,255,0.9)",
            }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/>
                <circle cx="8" cy="6" r="1.5"/>
              </svg>
              {event.venue}
            </div>
          )}

          {/* dot indicators */}
          {total > 1 && (
            <div className="ep-carousel-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`ep-carousel-dot${i === activeIdx ? ' active' : ''}`}
                  onClick={() => goTo(i)}
                  title={`Photo ${i + 1}`}
                />
              ))}
            </div>
          )}
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

            {/* meta grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
              {[
                ["Date",     `${event.month} ${event.year}`],
                ["Location", venue],
                ["Scale",    scale],
                ...(event.price ? [["Price", `₹${Number(event.price).toLocaleString("en-IN")}`]] : []),
              ].map(([label, val]) => (
                <div key={label} style={{ background:"rgba(232,221,208,0.35)", borderRadius:10, padding:"11px 13px", border:"1px solid #e8ddd0" }}>
                  <div style={{ fontSize:9, letterSpacing:1.1, textTransform:"uppercase", color:"#b0906a", marginBottom:4, fontWeight:600 }}>{label}</div>
                  <div style={{ fontSize:14, color:"#2E1C10", fontWeight:600 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* pills */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:20 }}>
              {event.tags && event.tags.length > 0
                ? event.tags.map((tag) => (
                    <span key={tag} style={{ fontSize:12, padding:"5px 14px", borderRadius:20, border:"1px solid #e8ddd0", color:"#7a6248", background:"#f5f0ea", fontWeight:500 }}>
                      {tag}
                    </span>
                  ))
                : pills.map((pill) => (
                    <span key={pill} style={{ fontSize:12, padding:"5px 14px", borderRadius:20, border:"1px solid #e8ddd0", color:"#7a6248", background:"#f5f0ea", fontWeight:500 }}>
                      {pill}
                    </span>
                  ))
              }
            </div>

            {/* description */}
            <div style={{ fontSize:14, color:"#8a7060", lineHeight:1.78 }}>
              {description
                ? description
                : <>
                    A {scale.toLowerCase()}-scale {event.type.toLowerCase()} event held at{" "}
                    <strong style={{ color:"#2E1C10" }}>{venue}</strong> in {event.month} {event.year}.
                    Every detail thoughtfully curated for an unforgettable experience.
                  </>
              }
            </div>
          </div>

          {/* footer */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", marginTop:24 }}>
            <button className="ep-cta" onClick={() => { onClose(); navigate("/create-event", { state: { referenceEvent: event } }); }} style={{
              background:"#2E1C10", color:"#FBF6EE", border:"none",
              padding:"13px 28px", borderRadius:12, fontSize:13,
              fontWeight:600, cursor:"pointer", transition:"background 0.18s",
              letterSpacing:0.3, fontFamily:"inherit",
            }}>
              Add to Your Event
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
                {r.image_url
                  ? <img src={r.image_url} alt={r.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  : <div style={{ width:"100%", height:"100%", background:getGradient(r.type), display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                      {getEmoji(r.type)}
                    </div>
                }
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

// ── EventCard ─────────────────────────────────────────────────────────────
// forceExpanded: when true, only render the ExpandPanel (used when rendered
//               above the grid in ExplorePage). The card thumbnail is skipped.
export function EventCard({ event, isBookmarked, onBookmarkToggle, allEvents = [], openId, onOpen, onClose, forceExpanded = false }) {
  const [hovered, setHovered] = useState(false);
  const [bmHovered, setBmHovered] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const isOpen = openId === event.id;
  const images = getImages(event);
  const total  = images.length;

  const prevImg = (e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + total) % total); };
  const nextImg = (e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % total); };
  const goImg   = (i, e) => { e.stopPropagation(); setImgIdx(i); };

  const handleBookmark = (e) => {
    e.stopPropagation();
    onBookmarkToggle({ id: event.id, name: event.title, image: event.image_url || null, type: event.type });
  };

  // When forceExpanded, only render the panel — used for the above-grid slot
  if (forceExpanded) {
    return (
      <ExpandPanel
        event={event}
        allEvents={allEvents}
        onClose={onClose}
        onRelatedClick={(r) => onOpen(r.id)}
        isBookmarked={isBookmarked}
        onBookmark={() => onBookmarkToggle({ id: event.id, name: event.title, image: event.image_url || null, type: event.type })}
      />
    );
  }

  return (
    <>
      {/* Card — always visible in the grid; highlighted with outline when open */}
      <div
        className={styles.card}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => isOpen ? onClose() : onOpen(event.id)}
        style={{
          transform: hovered ? "translateY(-5px)" : "translateY(0)",
          borderColor: isOpen ? "#c9a84c" : undefined,
          boxShadow: isOpen ? "0 12px 32px rgba(26,16,8,0.15)" : undefined,
          // Cards stay visible in the grid — no hiding
        }}
      >
        {/* ── Image area ── */}
        <div className={styles.imgArea}>
          {images.length > 0
            ? <img key={images[imgIdx]} src={images[imgIdx]} alt={event.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.4s, opacity 0.2s", transform: hovered ? "scale(1.05)" : "scale(1)" }} />
            : <div style={{ width:"100%", height:"100%", background: getGradient(event.type), display:"flex", alignItems:"center", justifyContent:"center", fontSize:54 }}>{getEmoji(event.type)}</div>
          }

          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)", pointerEvents:"none" }} />

          {/* Carousel arrows — only when multiple images, revealed on hover */}
          {total > 1 && (
            <>
              <button onClick={prevImg} title="Previous photo" style={{
                position:"absolute", top:"50%", left:8, transform:"translateY(-50%)",
                width:26, height:26, borderRadius:"50%", border:"none", cursor:"pointer",
                background:"rgba(0,0,0,0.45)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                opacity: hovered ? 1 : 0, transition:"opacity 0.15s, background 0.15s", zIndex:6,
              }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={nextImg} title="Next photo" style={{
                position:"absolute", top:"50%", right:8, transform:"translateY(-50%)",
                width:26, height:26, borderRadius:"50%", border:"none", cursor:"pointer",
                background:"rgba(0,0,0,0.45)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                opacity: hovered ? 1 : 0, transition:"opacity 0.15s, background 0.15s", zIndex:6,
              }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", display:"flex", gap:4, zIndex:6 }}>
                {images.map((_, i) => (
                  <span key={i} onClick={(e) => goImg(i, e)} style={{
                    width:5, height:5, borderRadius:"50%", cursor:"pointer",
                    background: i === imgIdx ? "#fff" : "rgba(255,255,255,0.4)",
                    transform: i === imgIdx ? "scale(1.3)" : "scale(1)",
                    transition:"background 0.2s, transform 0.2s",
                  }} />
                ))}
              </div>
            </>
          )}

          {/* Verified badge */}
          {event.verified && (
            <div style={{ position:"absolute", top:10, right:10, background:"rgba(15,13,10,0.75)", backdropFilter:"blur(6px)", color:"#c9a84c", fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20, border:"0.5px solid rgba(201,168,76,0.35)", display:"flex", alignItems:"center", gap:4, zIndex:5 }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#c9a84c"/>
                <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Verified
            </div>
          )}

          {/* Scale badge */}
          {event.scale && (
            <div style={{ position:"absolute", top:10, left:10, background:"rgba(15,13,10,0.75)", backdropFilter:"blur(6px)", color:"#e8c97a", fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20, border:"0.5px solid rgba(232,201,122,0.3)", zIndex:5 }}>
              {event.scale}
            </div>
          )}

          {/* Type badge */}
          <div style={{ position:"absolute", bottom:10, left:10, background:"rgba(15,13,10,0.75)", backdropFilter:"blur(6px)", color:"#c9a84c", fontSize:10, fontWeight:500, letterSpacing:"0.4px", padding:"3px 9px", borderRadius:20, border:"0.5px solid rgba(201,168,76,0.28)", zIndex:5 }}>
            {event.type}
          </div>

          {/* Bookmark */}
          <button
            className={styles.bmBtn}
            style={{
              opacity: hovered || isBookmarked ? 1 : 0,
              background: isBookmarked ? "rgba(201,168,76,0.88)" : bmHovered ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.52)",
            }}
            onClick={handleBookmark}
            onMouseEnter={() => setBmHovered(true)}
            onMouseLeave={() => setBmHovered(false)}
          >
            <BookmarkIcon filled={isBookmarked} size={15} color="#fff" />
          </button>
        </div>

        {/* ── Card body ── */}
        <div className={styles.body}>
          <div className={styles.tags}>
            {event.tags && event.tags.length > 0
              ? event.tags.slice(0, 3).map((t, i) => (
                  <span key={i} className={[styles.tagType, styles.tagVenue, styles.tagScale][i % 3]}>{t}</span>
                ))
              : <span className={styles.tagType}>{event.type}</span>
            }
          </div>

          {/* Title + Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
            <div className={styles.title} style={{ marginBottom: 0 }}>{event.title}</div>
            {event.price && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, flexShrink: 0 }}>
                <span className={styles.priceSym}>₹</span>
                <span className={styles.priceVal} style={{ fontSize: 25 }}>{Number(event.price).toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          {/* Location + date */}
          <div className={styles.meta} style={{ marginBottom: 8 }}>
            <span className={styles.location}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/>
                <circle cx="8" cy="6" r="1.5"/>
              </svg>
              {event.venue || "—"}
            </span>
            <span className={styles.planner}>{event.month} {event.year}</span>
          </div>
        </div>
      </div>

      {/* ── NO inline ExpandPanel here — it's rendered above the grid in ExplorePage ── */}
    </>
  );
}