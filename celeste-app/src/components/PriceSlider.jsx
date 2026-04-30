// src/components/PriceSlider.jsx
import { useState, useRef, useCallback } from 'react';

export default function PriceSlider({ min, max, value, onChange }) {
  const trackRef = useRef(null);

  const getPercent = (val) => ((val - min) / (max - min)) * 100;

  const handleTrackClick = useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const raw = Math.round(min + percent * (max - min));
    const midpoint = (value[0] + value[1]) / 2;
    if (raw < midpoint) onChange([raw, value[1]]);
    else onChange([value[0], raw]);
  }, [min, max, value, onChange]);

  const handleDrag = (index) => (e) => {
    e.preventDefault();
    const move = (ev) => {
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const raw = Math.round(min + percent * (max - min));
      if (index === 0) onChange([Math.min(raw, value[1] - 5000), value[1]]);
      else onChange([value[0], Math.max(raw, value[0] + 5000)]);
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const leftPct = getPercent(value[0]);
  const rightPct = getPercent(value[1]);

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
          height: '100%', background: '#534AB7', borderRadius: 2,
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
              background: '#534AB7', border: '2.5px solid #fff',
              boxShadow: '0 1px 6px rgba(83,74,183,0.4)',
              cursor: 'grab', zIndex: 2,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#888' }}>
        <span>₹{value[0].toLocaleString('en-IN')}</span>
        <span>₹{value[1].toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}
