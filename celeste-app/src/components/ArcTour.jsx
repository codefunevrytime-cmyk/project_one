import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/* ─── Arc. Project Work Tour ─────────────────────────────────────────────────
   Replaces the previous OnboardingTour. Renders a cinematic welcome screen,
   then walks through each step with an elegantly positioned highlight card.
   Fully self-contained — no external dependencies beyond React.
─────────────────────────────────────────────────────────────────────────── */

const TOUR_KEY = "arc_tour_seen_";

/* ── Inline font refs ──────────────────────────────────────────────────────── */
const SERIF = "'Playfair Display', Georgia, serif";
const SANS  = "'Jost', system-ui, sans-serif";

/* ── Palette ───────────────────────────────────────────────────────────────── */
const GOLD   = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.18)";
const GOLD_BORDER = "rgba(201,168,76,0.35)";
const DARK   = "#1a1610";
const DARKER = "#0f0c08";
const CREAM  = "#e8dcc8"; 
const MUTED  = "rgba(232,220,200,0.45)";

/* ── Keyframe injection ────────────────────────────────────────────────────── */
const STYLE_ID = "arc-tour-keyframes";
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes arc-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes arc-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes arc-pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(201,168,76,0.45); }
      70%  { box-shadow: 0 0 0 10px rgba(201,168,76,0); }
      100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
    }
    @keyframes arc-dot-pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.35); }
      100% { transform: scale(1); }
    }
    @keyframes arc-welcome-in {
      from { opacity: 0; transform: scale(0.96) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
  `;
  document.head.appendChild(el);
}

/* ── Highlight overlay: places a glowing ring around a target element ──────── */
function HighlightRing({ targetEl }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!targetEl) { setRect(null); return; }
    const measure = () => {
      const r = targetEl.getBoundingClientRect();
      // Store page-absolute coords so the ring never needs to move on scroll
      setRect({
        top:    r.top  + window.scrollY,
        left:   r.left + window.scrollX,
        width:  r.width,
        height: r.height,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    // No scroll listener — absolute positioning handles it
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [targetEl]);

  if (!rect) return null;

  const PAD = 7;
  return (
    <div
      style={{
        position: "absolute",
        top:    rect.top  - PAD,
        left:   rect.left - PAD,
        width:  rect.width  + PAD * 2,
        height: rect.height + PAD * 2,
        borderRadius: 12,
        border: `1.5px solid ${GOLD}`,
        boxShadow: `0 0 0 9999px rgba(10,8,5,0.62), 0 0 24px rgba(201,168,76,0.4)`,
        pointerEvents: "none",
        zIndex: 9998,
        animation: "arc-pulse-ring 2s ease infinite",
      }}
    />
  );
}

/* ── Welcome screen ─────────────────────────────────────────────────────────── */
function WelcomeScreen({ step, index, total, onNext, onSkip }) {
  const isLast = index === total - 1;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(10,8,5,0.88)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 520,
          background: DARK,
          border: `0.5px solid ${GOLD_BORDER}`,
          borderRadius: 20,
          padding: "44px 40px 36px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          animation: "arc-welcome-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Corner ornament */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 120, height: 120,
          background: "radial-gradient(circle at top right, rgba(201,168,76,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}/>

        {/* Arc. logo mark */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: GOLD_DIM,
            border: `0.5px solid ${GOLD_BORDER}`,
            borderRadius: 100,
            padding: "6px 16px 6px 10px",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: `conic-gradient(${GOLD} 0deg 270deg, transparent 270deg)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: DARK }}/>
            </div>
            <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: GOLD, letterSpacing: "0.06em" }}>
              Arc.
            </span>
          </div>
        </div>

        {/* Step counter */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: GOLD_DIM,
              border: `1px solid ${GOLD_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: GOLD,
            }}>
              {index + 1}
            </div>
            <span style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
              of {total}
            </span>
          </div>

          {/* Dot progress */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: i === index ? 18 : 5,
                height: 5,
                borderRadius: 3,
                background: i === index ? GOLD : i < index ? "rgba(201,168,76,0.35)" : "rgba(201,168,76,0.12)",
                transition: "all 0.3s ease",
              }}/>
            ))}
          </div>

          <button
            onClick={onSkip}
            style={{
              background: "none", border: "none", padding: 4,
              color: "rgba(201,168,76,0.35)", fontSize: 14,
              cursor: "pointer", lineHeight: 1,
              transition: "color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = MUTED}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(201,168,76,0.35)"}
          >
            ✕
          </button>
        </div>

        {/* Step icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          {step.icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: GOLD_DIM,
              border: `0.5px solid ${GOLD_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>
              {step.icon}
            </div>
          )}

          <h3 style={{
            fontFamily: SERIF,
            fontSize: 28, fontWeight: 700,
            color: CREAM,
            margin: 0,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}>
            {step.title}
          </h3>
        </div>

        {/* Content */}
        <p style={{
          fontSize: 15, lineHeight: 1.65,
          color: MUTED,
          margin: "0 0 28px",
        }}>
          {step.content}
        </p>

        {/* Tip pill */}
        {step.tip && (
          <div style={{
            background: "rgba(201,168,76,0.06)",
            border: `0.5px solid rgba(201,168,76,0.2)`,
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 24,
            fontSize: 11.5,
            color: "rgba(201,168,76,0.7)",
            lineHeight: 1.6,
          }}>
            <span style={{ fontWeight: 600, color: GOLD }}>Tip — </span>
            {step.tip}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onNext}
            style={{
              flex: 1, padding: "13px 0", fontSize: 13.5, fontWeight: 600,
              fontFamily: SANS, letterSpacing: "0.04em",
              background: `linear-gradient(135deg, #c9a84c, #e8c97a, #c9a84c)`,
              backgroundSize: "200% auto",
              color: DARKER,
              border: "none", borderRadius: 10,
              cursor: "pointer",
              transition: "background-position 0.4s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundPosition = "right center"}
            onMouseLeave={e => e.currentTarget.style.backgroundPosition = "left center"}
          >
            {isLast ? "Start planning ✦" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Step card — positioned relative to the highlighted element ─────────────── */
function StepCard({ step, index, total, onNext, onPrev, onSkip, targetEl }) {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom" });

  const computePos = useCallback(() => {
    if (!cardRef.current) return;
    const card = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 16;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    if (!targetEl) {
      // Center in viewport, converted to page coords
      setPos({
        top:  scrollY + (vh - card.height) / 2,
        left: scrollX + (vw - card.width)  / 2,
        placement: "center",
      });
      return;
    }

    // t is viewport-relative; convert to page coords by adding scroll
    const t = targetEl.getBoundingClientRect();
    const PAD = 18;

    // Prefer placement from step config, then auto-detect.
    // Accepts a side ("top" | "bottom" | "left" | "right" | "auto" | "center")
    // optionally combined with an alignment, e.g. "top-right", "bottom-left",
    // "left-center". Separator can be "-" or a space.
    const preferredRaw = step.placement || "auto";
    const [preferred, align] = preferredRaw.split(/[-\s]+/);
    let placement = preferred;

    if (preferred === "auto") {
      const spaceBelow = vh - t.bottom;
      const spaceAbove = t.top;
      placement = spaceBelow >= card.height + PAD * 2 ? "bottom"
               : spaceAbove >= card.height + PAD * 2 ? "top"
               : t.left >= card.width + PAD * 2       ? "left"
               : "right";
    }

    let top = 0, left = 0;

    if (placement === "bottom" || placement === "top") {
      top = placement === "bottom" ? t.bottom + PAD : t.top - card.height - PAD;
      // Horizontal alignment relative to the target: left edge (default), right edge, or centered
      left = align === "right"  ? t.right - card.width
           : align === "center" ? t.left + (t.width - card.width) / 2
           : t.left;
      left = Math.min(Math.max(left, MARGIN), vw - card.width - MARGIN);
      top  = scrollY + top;
      left = scrollX + left;
    } else if (placement === "left" || placement === "right") {
      left = placement === "left" ? t.left - card.width - PAD : t.right + PAD;
      // Vertical alignment relative to the target: top edge (default), bottom edge, or centered
      top = align === "bottom" ? t.bottom - card.height
          : align === "center" ? t.top + (t.height - card.height) / 2
          : t.top;
      top  = Math.min(Math.max(top, MARGIN), vh - card.height - MARGIN);
      top  = scrollY + top;
      left = scrollX + left;
    } else {
      top  = scrollY + (vh - card.height) / 2;
      left = scrollX + (vw - card.width)  / 2;
    }

    // Clamp horizontally to document width; no vertical clamping so card stays near anchor
    left = Math.max(MARGIN, Math.min(left, scrollX + vw - card.width - MARGIN));

    setPos({ top, left, placement });
  }, [targetEl, step.placement]);

  useEffect(() => {
    // Recompute on mount and resize only — card is absolutely positioned so scroll moves it naturally
    const id = setTimeout(computePos, 30);
    window.addEventListener("resize", computePos);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", computePos);
    };
  }, [computePos]);

  const isLast  = index === total - 1;
  const isFirst = index === 0;
  const progress = ((index + 1) / total) * 100;

  return (
    <div
      ref={cardRef}
      style={{
        position: "absolute",
        top:  pos.top,
        left: pos.left,
        zIndex: 9999,
        width: "min(320px, calc(100vw - 32px))",
        background: DARK,
        border: `0.5px solid ${GOLD_BORDER}`,
        borderRadius: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(201,168,76,0.08) inset",
        fontFamily: SANS,
        overflow: "hidden",
        animation: "arc-fade-in 0.3s ease both",
      }}
    >
      {/* Gold shimmer top bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        backgroundSize: "200% 100%",
        animation: "arc-shimmer 2s linear infinite",
      }}/>

      {/* Progress bar */}
      <div style={{ height: 2, background: "rgba(201,168,76,0.1)" }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: `linear-gradient(90deg, rgba(201,168,76,0.4), ${GOLD})`,
          transition: "width 0.4s ease",
        }}/>
      </div>

      <div style={{ padding: "20px 22px 18px" }}>
        {/* Step counter + close */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Numbered badge */}
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: GOLD_DIM,
              border: `1px solid ${GOLD_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: GOLD,
              animation: "arc-dot-pop 0.3s ease",
            }}>
              {index + 1}
            </div>
            <span style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
              of {total}
            </span>
          </div>

          {/* Dot progress */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                width: i === index ? 18 : 5,
                height: 5,
                borderRadius: 3,
                background: i === index ? GOLD : i < index ? "rgba(201,168,76,0.35)" : "rgba(201,168,76,0.12)",
                transition: "all 0.3s ease",
              }}/>
            ))}
          </div>

          <button
            onClick={onSkip}
            style={{
              background: "none", border: "none", padding: 4,
              color: "rgba(201,168,76,0.35)", fontSize: 14,
              cursor: "pointer", lineHeight: 1,
              transition: "color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = MUTED}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(201,168,76,0.35)"}
          >
            ✕
          </button>
        </div>

        {/* Step icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {step.icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: GOLD_DIM,
              border: `0.5px solid ${GOLD_BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>
              {step.icon}
            </div>
          )}

          <h3 style={{
            fontFamily: SERIF,
            fontSize: 18, fontWeight: 700,
            color: CREAM,
            margin: 0,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}>
            {step.title}
          </h3>
        </div>

        {/* Content */}
        <p style={{
          fontSize: 13, lineHeight: 1.65,
          color: MUTED,
          margin: "0 0 20px",
        }}>
          {step.content}
        </p>

        {/* Tip pill */}
        {step.tip && (
          <div style={{
            background: "rgba(201,168,76,0.06)",
            border: `0.5px solid rgba(201,168,76,0.2)`,
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 20,
            fontSize: 11.5,
            color: "rgba(201,168,76,0.7)",
            lineHeight: 1.6,
          }}>
            <span style={{ fontWeight: 600, color: GOLD }}>Tip — </span>
            {step.tip}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 8 }}>
          {!isFirst && (
            <button
              onClick={onPrev}
              style={{
                padding: "9px 16px",
                fontSize: 12.5, fontWeight: 500,
                fontFamily: SANS,
                background: "rgba(201,168,76,0.06)",
                border: `0.5px solid ${GOLD_BORDER}`,
                borderRadius: 8,
                color: MUTED,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = GOLD; }}
              onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = GOLD_BORDER; }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={onNext}
            style={{
              flex: 1,
              padding: "9px 0",
              fontSize: 12.5, fontWeight: 600,
              fontFamily: SANS, letterSpacing: "0.03em",
              background: isLast
                ? `linear-gradient(135deg, #c9a84c, #e8c97a)`
                : "rgba(201,168,76,0.12)",
              border: `0.5px solid ${isLast ? GOLD : GOLD_BORDER}`,
              borderRadius: 8,
              color: isLast ? DARKER : GOLD,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              if (!isLast) {
                e.currentTarget.style.background = "rgba(201,168,76,0.2)";
                e.currentTarget.style.borderColor = GOLD;
              }
            }}
            onMouseLeave={e => {
              if (!isLast) {
                e.currentTarget.style.background = "rgba(201,168,76,0.12)";
                e.currentTarget.style.borderColor = GOLD_BORDER;
              }
            }}
          >
            {isLast ? "Start planning ✦" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Restart pill — persistent button shown after tour is dismissed ─────────── */
function RestartPill({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Replay tour"
      style={{
        position: "fixed",
        bottom: 22,
        right: 22,
        zIndex: 9990,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 16px 9px 12px",
        background: hovered ? DARK : "rgba(15,12,8,0.82)",
        border: `0.5px solid ${hovered ? GOLD : GOLD_BORDER}`,
        borderRadius: 100,
        cursor: "pointer",
        fontFamily: SANS,
        fontSize: 12,
        fontWeight: 600,
        color: hovered ? GOLD : MUTED,
        backdropFilter: "blur(8px)",
        boxShadow: hovered
          ? `0 4px 20px rgba(201,168,76,0.2), 0 0 0 1px rgba(201,168,76,0.1)`
          : "0 2px 12px rgba(0,0,0,0.4)",
        transition: "all 0.2s ease",
        letterSpacing: "0.03em",
      }}
    >
      {/* Mini arc logo mark */}
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: `conic-gradient(${GOLD} 0deg 270deg, transparent 270deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: hovered ? DARK : "rgba(15,12,8,0.9)" }}/>
      </div>
      Tour
    </button>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function isElementVisible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function isMobileViewport() {
  // Hamburger is shown via CSS below a breakpoint; check if it's actually rendered
  const hamburger = document.querySelector(".hamburger");
  return hamburger ? isElementVisible(hamburger) : window.innerWidth < 768;
}

/* ── Main ArcTour component ─────────────────────────────────────────────────── */
export default function ArcTour({ tourId, steps, useWelcomeContainer = false }) {
  const storageKey = TOUR_KEY + tourId;
  const [phase, setPhase] = useState("idle"); // idle | touring | pill
  const [stepIndex, setStepIndex] = useState(0);
  const [targetEl, setTargetEl] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [usingMobile, setUsingMobile] = useState(false);

  useEffect(() => {
    injectKeyframes();
    const seen = sessionStorage.getItem(storageKey);
    if (!seen) {
      const id = setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        setPhase("touring");
      }, 600);
      return () => clearTimeout(id);
    } else {
      setPhase("pill");
    }
  }, [storageKey]);

  // Resolve target (highlight ring) and anchorEl (card positioning) for current step
  useEffect(() => {
    if (phase !== "touring") { setTargetEl(null); setAnchorEl(null); setUsingMobile(false); return; }
    const step = steps[stepIndex];
    if (!step?.target) { setTargetEl(null); setAnchorEl(null); setUsingMobile(false); return; }

    const onMobile = isMobileViewport();
    const primaryVisible = isElementVisible(document.querySelector(step.target));

    let hookDelay = 30;
    if (!primaryVisible && onMobile && step.mobileTarget) {
      step.beforeShow?.();
      hookDelay = step.beforeShowDelay ?? 380;
    }

    const id = setTimeout(() => {
      const fresh = document.querySelector(step.target);
      let el = null;
      let mobile = false;

      if (isElementVisible(fresh)) {
        el = fresh;
      } else if (step.mobileTarget) {
        const fallback = document.querySelector(step.mobileTarget);
        if (isElementVisible(fallback)) {
          el = fallback;
          mobile = true;
        }
      }

      setUsingMobile(mobile);
      if (el) {
        setTargetEl(el);
      } else {
        setTargetEl(null);
      }

      // Resolve anchor element for card positioning (separate from highlight target)
      let anchor = null;
      if (step.anchorTarget) {
        const a = document.querySelector(step.anchorTarget);
        anchor = isElementVisible(a) ? a : null;
        setAnchorEl(anchor);
      } else {
        setAnchorEl(null);
      }

      // Scroll to the anchor title if present, otherwise fall back to the highlight element
      const scrollTarget = anchor || el;
      if (scrollTarget) {
        scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, hookDelay);

    return () => clearTimeout(id);
  }, [phase, stepIndex, steps]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const startTour = () => {
    scrollToTop();
    setStepIndex(0);
    setPhase("touring");
  };

  const dismiss = () => {
    sessionStorage.setItem(storageKey, "1");
    setPhase("pill");
    setTargetEl(null);
    setAnchorEl(null);
    setUsingMobile(false);
  };

  const restartTour = () => {
    scrollToTop();
    sessionStorage.removeItem(storageKey);
    setStepIndex(0);
    setPhase("touring");
  };

  // Call afterLeave on the current step before advancing
  const callAfterLeave = (idx) => steps[idx]?.afterLeave?.();

  const handleNext = () => {
    callAfterLeave(stepIndex);
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      dismiss();
    }
  };

  const handlePrev = () => {
    callAfterLeave(stepIndex);
    if (stepIndex > 0) setStepIndex(i => i - 1);
  };

  const handleSkip = () => {
    callAfterLeave(stepIndex);
    dismiss();
  };

  if (phase === "idle") return null;

  const currentStep = steps[stepIndex];
  const effectiveStep = usingMobile && currentStep
    ? { ...currentStep, content: currentStep.mobileContent || currentStep.content }
    : currentStep;

  return createPortal(
    <>
      {phase === "pill" && <RestartPill onClick={restartTour} />}

      {phase === "touring" && (
        <>
          {!useWelcomeContainer && <HighlightRing targetEl={targetEl} />}
          {useWelcomeContainer ? (
            <WelcomeScreen
              step={effectiveStep}
              index={stepIndex}
              total={steps.length}
              onNext={handleNext}
              onSkip={handleSkip}
            />
          ) : (
            <StepCard
              step={effectiveStep}
              index={stepIndex}
              total={steps.length}
              onNext={handleNext}
              onPrev={handlePrev}
              onSkip={handleSkip}
              targetEl={anchorEl || targetEl}
            />
          )}
        </>
      )}
    </>,
    document.body
  );
}