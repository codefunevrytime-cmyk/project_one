import { useState } from "react";
import { BookmarkButton } from "./CommonControls";
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

function getBookmarkPayload(event) {
  const images = getImages(event);
  return {
    ...event,
    id: event.id,
    title: event.title,
    name: event.title,
    image: event.image_url || images[0] || null,
    image_url: event.image_url || images[0] || null,
    images,
    type: event.type,
  };
}

// ── Expand Panel ──────────────────────────────────────────────────────────
function ExpandPanel({ event, allEvents, onClose, onRelatedClick, isBookmarked, onBookmark, pickContext, onAddToEvent }) {
  const related = getRelated(event, allEvents);
  const navigate = useNavigate();
  const isPicking = Boolean(pickContext);

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

  const handleCtaClick = () => {
    if (isPicking) {
      onAddToEvent(event);
    } else {
      onClose();
      navigate("/create-event", { state: { referenceEvent: event } });
    }
  };

  return (
    <div className="ep-wrap">
      <style>{`
        .ep-wrap { background:#fff; border-radius:16px; border:0.5px solid rgba(0,0,0,0.08); overflow:hidden; margin-bottom:24px; animation:epIn 0.28s cubic-bezier(0.22,1,0.36,1); box-shadow:0 8px 40px rgba(0,0,0,0.10); }
        @keyframes epIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        .ep-img-col { position:relative; overflow:hidden; min-height:520px; }
        .ep-img-col img.ep-main-img { width:100%; height:100%; object-fit:cover; display:block; position:absolute; inset:0; transition:opacity 0.35s ease, transform 0.35s ease; }
        .ep-img-col img.ep-main-img.ep-slide-enter { opacity:0; transform:scale(1.03); }
        .ep-img-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.30) 0%,transparent 50%); pointer-events:none; z-index:2; }
        .ep-top { display:grid; grid-template-columns:44% 1fr; min-height:520px; }
        .ep-close { position:absolute; top:14px; right:14px; width:32px; height:32px; border-radius:50%; background:rgba(0,0,0,0.35); border:none; cursor:pointer; color:#fff; font-size:16px; display:flex; align-items:center; justify-content:center; transition:background 0.18s; z-index:10; }
        .ep-close:hover { background:rgba(0,0,0,0.6); }
        .ep-bm { position:absolute; top:14px; left:14px; width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:background 0.18s,transform 0.15s; z-index:10; }
        .ep-bm:hover { transform:scale(1.12); }
        .ep-right { padding:28px 32px; display:flex; flex-direction:column; justify-content:space-between; background:#fff; overflow-y:auto; }
        .ep-name { font-family:'Cormorant Garamond',serif; font-size:30px; font-weight:400; color:#1A1714; margin-bottom:6px; line-height:1.2; }
        .ep-meta-row { display:flex; align-items:center; gap:10px; margin-bottom:18px; flex-wrap:wrap; }
        .ep-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
        .ep-cell { background:#F7F5F2; border-radius:10px; padding:11px 14px; border:0.5px solid rgba(0,0,0,0.07); }
        .ep-cell-label { font-size:9px; letter-spacing:1.1px; text-transform:uppercase; color:#aaa; margin-bottom:4px; font-weight:600; }
        .ep-cell-val { font-size:14px; color:#1A1714; font-weight:500; }
        .ep-types { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:18px; }
        .ep-type-pill { font-size:12px; padding:5px 14px; border-radius:20px; background:#EEEDFE; color:#D4860A; font-weight:500; }
        .ep-tags { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:16px; }
        .ep-award-pill { font-size:11px; padding:4px 12px; border-radius:20px; background:#F7F5F2; color:#888; border:0.5px solid rgba(0,0,0,0.08); }
        .ep-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:auto; padding-top:16px; border-top:0.5px solid rgba(0,0,0,0.07); }
        .ep-cta { font-family:inherit; font-size:13px; font-weight:500; background:#D4860A; color:#fff; border:none; padding:13px 28px; border-radius:10px; cursor:pointer; transition:background 0.18s; white-space:nowrap; margin-left:auto; }
        .ep-cta:hover { background:#c07a0a; }
        .ep-related-label { border-top:0.5px solid #050505; padding:14px 20px 10px; font-size:10px; letter-spacing:1.2px; text-transform:uppercase; color:#aaa; font-weight:600; }
        .ep-related-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; padding:0 16px 16px; }
        .ep-rel-card { border-radius:10px; overflow:hidden; cursor:pointer; aspect-ratio:4/3; position:relative; transition:transform 0.15s; }
        .ep-rel-card:hover { transform:scale(1.05); }
        .ep-rel-card img { width:100%; height:100%; object-fit:cover; display:block; }
        .ep-rel-title { position:absolute; bottom:0; left:0; right:0; padding:18px 8px 7px; background:linear-gradient(to top,rgba(0,0,0,0.60),transparent); font-size:11px; color:#fff; font-weight:500; line-height:1.3; }
        .ep-verified-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:500; color:#D4860A; background:#5b3e16; padding:3px 9px; border-radius:20px; }

        /* Carousel */
        .ep-carousel-nav { position:absolute; top:50%; transform:translateY(-50%); z-index:10; width:36px; height:36px; border-radius:50%; background:rgba(0,0,0,0.45); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.2); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.18s, transform 0.15s; }
        .ep-carousel-nav:hover { background:rgba(0,0,0,0.72); transform:translateY(-50%) scale(1.1); }
        .ep-carousel-prev { left:12px; }
        .ep-carousel-next { right:12px; }
        .ep-carousel-dots { position:absolute; bottom:14px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:10; }
        .ep-carousel-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.4); cursor:pointer; transition:background 0.2s, transform 0.2s; border:none; padding:0; }
        .ep-carousel-dot.active { background:#fff; transform:scale(1.3); }
        .ep-carousel-counter { position:absolute; top:14px; right:52px; background:rgba(0,0,0,0.50); backdrop-filter:blur(4px); color:#fff; font-size:11px; padding:4px 10px; border-radius:20px; border:0.5px solid rgba(255,255,255,0.2); z-index:10; }

        /* Type badge */
        .ep-type-badge { position:absolute; top:16px; left:16px; font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; padding:5px 13px; border-radius:20px; color:#fff; background:rgba(0,0,0,0.30); backdrop-filter:blur(6px); z-index:3; }

        /* Scale badge */
        .ep-scale-badge { position:absolute; top:16px; right:52px; font-size:10px; font-weight:600; padding:4px 10px; border-radius:20px; color:#e8c97a; background:rgba(0,0,0,0.45); backdrop-filter:blur(6px); border:0.5px solid rgba(232,201,122,0.3); z-index:3; }

        /* Venue pin */
        .ep-venue { position:absolute; bottom:16px; left:16px; display:flex; align-items:center; gap:5px; background:rgba(0,0,0,0.45); backdrop-filter:blur(6px); border:0.5px solid rgba(255,255,255,0.15); border-radius:20px; padding:4px 11px; z-index:3; font-size:11px; color:rgba(255,255,255,0.9); }

        /* Description */
        .ep-desc { font-size:14px; color:#8a7060; line-height:1.78; }

        /* Pick-mode note in footer */
        .ep-pick-note { font-size:11px; color:#9e8e7a; }
      `}</style>

      {/* top: image | details */}
      <div className="ep-top">

        {/* image col */}
        <div className="ep-img-col" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 108,
          background: currentImg ? "#1a1008" : getGradient(event.type),
        }}>
          {currentImg
            ? <img src={currentImg} alt={event.title} key={currentImg}
                className={`ep-main-img${sliding ? ' ep-slide-enter' : ''}`} />
            : <span style={{ zIndex:1, position:"relative", filter:"drop-shadow(0 6px 16px rgba(0,0,0,0.18))" }}>
                {getEmoji(event.type)}
              </span>
          }

          <div className="ep-img-overlay" />

          {/* type badge */}
          <span className="ep-type-badge">{event.type}</span>

          {/* scale badge */}
          {event.scale && (
            <span className="ep-scale-badge">{event.scale}</span>
          )}

          {/* photo counter */}
          {total > 1 && <div className="ep-carousel-counter">{activeIdx + 1} / {total}</div>}

          {/* close */}
          <button className="ep-close" onClick={onClose}>✕</button>

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
          <BookmarkButton
            className="ep-bm"
            active={isBookmarked}
            onClick={onBookmark}
            size={40}
            iconSize={20}
            style={{
              position:"absolute", bottom:16, right:16,
              boxShadow: isBookmarked ? "0 2px 12px rgba(201,168,76,0.4)" : "none",
            }}
            idleColor="rgba(0,0,0,0.38)"
            activeColor="rgba(201,168,76,0.88)"
          />

          {/* venue pin */}
          {event.venue && (
            <div className="ep-venue">
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
        <div className="ep-right">
          <div>
            <div className="ep-name">{event.title}</div>
            <div className="ep-meta-row">
              <span className="ep-verified-badge">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#D4860A "/>
                  <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Verified
              </span>
              <span style={{ fontSize: 13, color: '#1A1714', fontWeight: 500 }}>{event.month} {event.year}</span>
            </div>

            {/* meta grid */}
            <div className="ep-grid">
              {[
                ["Date",     `${event.month} ${event.year}`],
                ["Location", venue],
                ["Scale",    scale],
                ...(event.price ? [["Price", `₹${Number(event.price).toLocaleString("en-IN")}`]] : []),
              ].map(([label, val]) => (
                <div key={label} className="ep-cell">
                  <div className="ep-cell-label">{label}</div>
                  <div className="ep-cell-val">{val}</div>
                </div>
              ))}
            </div>

            {/* pills */}
            <div className="ep-types">
              {event.tags && event.tags.length > 0
                ? event.tags.map((tag) => (
                    <span key={tag} className="ep-type-pill">{tag}</span>
                  ))
                : pills.map((pill) => (
                    <span key={pill} className="ep-type-pill">{pill}</span>
                  ))
              }
            </div>

            {/* description */}
            <div className="ep-desc">
              {description
                ? description
                : <>
                    A {scale.toLowerCase()}-scale {event.type.toLowerCase()} event held at{" "}
                    <strong style={{ color:"#1A1714" }}>{venue}</strong> in {event.month} {event.year}.
                    Every detail thoughtfully curated for an unforgettable experience.
                  </>
              }
            </div>
          </div>

          {/* footer */}
          <div className="ep-footer">
            {isPicking && <span className="ep-pick-note">Picking a reference for your event</span>}
            <button className="ep-cta" onClick={handleCtaClick}>
              {isPicking ? '+ Add to Event' : 'Add to Your Event'}
            </button>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <>
          <div className="ep-related-label">More like this</div>
          <div className="ep-related-grid">
            {related.map((r) => (
              <div key={r.id} className="ep-rel-card" onClick={() => onRelatedClick(r)}>
                {r.image_url
                  ? <img src={r.image_url} alt={r.title} />
                  : <div style={{ width:"100%", height:"100%", background:getGradient(r.type), display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                      {getEmoji(r.type)}
                    </div>
                }
                <div className="ep-rel-title">{r.title}</div>
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
// pickContext:   when set (from ExplorePage), the card is in "pick mode" —
//               used to select a reference event for Create Event. Both the
//               grid card and the expand panel swap their CTA to
//               "+ Add to Event" and call onAddToEvent instead of navigating
//               straight to /create-event.
export function EventCard({ event, isBookmarked, onBookmarkToggle, allEvents = [], openId, onOpen, onClose, forceExpanded = false, pickContext = null, onAddToEvent }) {
  const [hovered, setHovered] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const isOpen = openId === event.id;
  const images = getImages(event);
  const total  = images.length;
  const isPicking = Boolean(pickContext);

  const prevImg = (e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + total) % total); };
  const nextImg = (e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % total); };
  const goImg   = (i, e) => { e.stopPropagation(); setImgIdx(i); };

  const handleBookmark = (e) => {
    e.stopPropagation();
    onBookmarkToggle(getBookmarkPayload(event));
  };

  const handleCardAddToEvent = (e) => {
    e.stopPropagation();
    onAddToEvent(event);
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
        onBookmark={() => onBookmarkToggle(getBookmarkPayload(event))}
        pickContext={pickContext}
        onAddToEvent={onAddToEvent}
      />
    );
  }

  return (
    <>
      {/* Card — always visible in the grid; highlighted with outline when open */}
      <div
        className={`${styles.card} common-card-shell`}
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
        <div className={`${styles.imgArea} common-card-media`}>
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
          <BookmarkButton
            className={styles.bmBtn}
            active={isBookmarked}
            visible={hovered}
            onClick={handleBookmark}
            activeColor="rgba(201,168,76,0.88)"
            idleColor="rgba(0,0,0,0.52)"
            hoverColor="rgba(0,0,0,0.72)"
          />
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
          <div className={styles.meta} style={{ marginBottom: isPicking ? 10 : 8 }}>
            <span className={styles.location}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/>
                <circle cx="8" cy="6" r="1.5"/>
              </svg>
              {event.venue || "—"}
            </span>
            <span className={styles.planner}>{event.month} {event.year}</span>
          </div>

          {/* Outside "Add to Event" button — only shown while picking a
              reference event for Create Event. Mirrors the vendor card's
              "+ Add to Event" CTA on VendorListingPage. */}
          {isPicking && (
            <button
              onClick={handleCardAddToEvent}
              style={{
                width: '100%', padding: '9px 0', marginTop: 2,
                background: 'rgba(212,134,10,0.12)', border: '0.5px solid rgba(212,134,10,0.4)',
                borderRadius: 8, color: '#D4860A', fontSize: 12.5, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#D4860A'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,134,10,0.12)'; e.currentTarget.style.color = '#D4860A'; }}
            >
              + Add to Event
            </button>
          )}
        </div>
      </div>

      {/* ── NO inline ExpandPanel here — it's rendered above the grid in ExplorePage ── */}
    </>
  );
}