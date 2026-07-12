// src/components/PriceSlider.jsx
import { useState, useRef, useCallback, useEffect } from 'react';

export default function PriceSlider({ min, max, value, onChange }) {
  const trackRef = useRef(null);

  // ── Local mirror of `value` for buttery-smooth thumb movement ──────────
  // While dragging we ONLY update this local state — we deliberately do
  // NOT call the parent's onChange on every mousemove. The parent re-runs
  // an expensive vendor-list filter on every change; if that filter fires
  // on every pixel of movement it blocks the main thread long enough that
  // mousemove events get dropped. Instead we commit the final value to
  // the parent once, on mouseup.
  const [localValue, setLocalValue] = useState(value);

  const draggingRef = useRef(false);
  useEffect(() => {
    if (!draggingRef.current) setLocalValue(value);
  }, [value]);

  // ── Minimum gap between the two thumbs ──────────────────────────────
  // FIX: this used to be a HARDCODED ₹5,000. That was fine back when the
  // slider always spanned a big fixed range (₹0–₹1,20,000 — a 5k gap is
  // ~4% of that). Now that `max` is computed dynamically from real vendor
  // prices, a category can have a much smaller range (e.g. max = ₹5,000–
  // ₹6,000 for cheaper services). A fixed ₹5,000 minimum gap in a ₹5,000
  // range mathematically locks both thumbs in place — there's no valid
  // position left for either to move to, so dragging appeared "stuck".
  // Scaling the gap to a small percentage of the actual range fixes this
  // for any range size, tiny or huge.
  const span = Math.max(1, max - min);
  const minGap = Math.max(1, Math.round(span * 0.02)); // 2% of the range

  const getPercent = (val) => ((val - min) / (max - min)) * 100;
  const clamp = (val) => Math.max(min, Math.min(max, val));

  const handleTrackClick = useCallback((e) => {
    // A click fires right after mouseup on the same target chain — if
    // that mouseup was the end of a thumb drag, this click would
    // re-interpret the release position as a fresh "click on track"
    // and snap the nearest thumb to it. Ignore that synthetic click.
    if (draggingRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const raw = clamp(Math.round(min + percent * (max - min)));
    const midpoint = (localValue[0] + localValue[1]) / 2;
    const next = raw < midpoint ? [raw, localValue[1]] : [localValue[0], raw];
    setLocalValue(next);
    onChange(next);
  }, [min, max, localValue, onChange]);

  const handleDrag = (index) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;

    const move = (ev) => {
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const raw = clamp(Math.round(min + percent * (max - min)));

      setLocalValue((prev) => (
        index === 0
          ? [clamp(Math.min(raw, prev[1] - minGap)), prev[1]]
          : [prev[0], clamp(Math.max(raw, prev[0] + minGap))]
      ));
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);

      setLocalValue((current) => {
        onChange(current);
        return current;
      });

      // Release the "just dragged" guard on the next tick — after the
      // browser's synthetic click (which fires immediately after mouseup)
      // has already been ignored by handleTrackClick above.
      setTimeout(() => { draggingRef.current = false; }, 0);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const leftPct = getPercent(localValue[0]);
  const rightPct = getPercent(localValue[1]);

  return (
    <div style={{ padding: '8px 0 4px' }}>
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        style={{
          position: 'relative', height: 4, background: 'rgba(0,0,0,0.1)',
          borderRadius: 2, cursor: 'pointer', margin: '12px 0',
        }}
      >
        <div style={{
          position: 'absolute', left: `${leftPct}%`, right: `${100 - rightPct}%`,
          height: '100%', background: '#d4943a', borderRadius: 2,
        }} />
        {[0, 1].map((i) => (
          <div
            key={i}
            onMouseDown={handleDrag(i)}
            style={{
              position: 'absolute',
              left: `${i === 0 ? leftPct : rightPct}%`,
              top: '50%', transform: 'translate(-50%, -50%)',
              width: 16, height: 16, borderRadius: '50%',
              background: '#d4943a', border: '2.5px solid #fff',
              boxShadow: '0 1px 6px #534ab766',
              cursor: 'grab', zIndex: 2,
              touchAction: 'none',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#888' }}>
        <span>₹{localValue[0].toLocaleString('en-IN')}</span>
        <span>₹{localValue[1].toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}