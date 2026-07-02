import { useState, useEffect } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('vendor_token');
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const S = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 32 },
  card: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '24px 26px', marginBottom: 20 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#c8d8f8', marginBottom: 18 },
};

export default function VendorAvailability() {
  const today = new Date(); today.setHours(0,0,0,0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState([]);
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAvail = () => {
    fetch(`${API}/availability`).then(r => r.json())
      .then(d => setAvailability(Array.isArray(d) ? d : [])).catch(() => {});
  };
  useEffect(() => { fetchAvail(); }, []);

  const statusMap = {};
  availability.forEach(a => {
    const d = new Date(a.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    statusMap[key] = a.status;
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const setDateStatus = async (dateKey, status) => {
    await fetch(`${API}/availability`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ date: dateKey, status, note }),
    });
    setSuccess(`Marked as ${status}`); setTimeout(() => setSuccess(''), 2000);
    fetchAvail();
  };

  const busy = availability.filter(a => a.status === 'busy');
  const free = availability.filter(a => a.status === 'free');

  return (
    <div>
      <div style={S.heading}>Availability</div>
      <div style={S.sub}>Set your busy and free dates so clients know when you're available</div>
      {success && <div style={{ background: 'rgba(40,120,70,0.15)', border: '1px solid rgba(60,180,100,0.25)', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#6ed496', marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Calendar */}
        <div style={S.card}>
          <div style={S.cardTitle}>Click a date to set its status</div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {[['rgba(111,207,151,0.7)', 'Free'], ['rgba(235,87,87,0.6)', 'Busy'], ['rgba(56,100,220,0.3)', 'Today']].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(160,180,220,0.45)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'rgba(160,180,220,0.5)', cursor: 'pointer', fontSize: 18, padding: '0 8px' }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#c8d8f8' }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'rgba(160,180,220,0.5)', cursor: 'pointer', fontSize: 18, padding: '0 8px' }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {DAY_NAMES.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(160,180,220,0.3)', fontWeight: 600, padding: '2px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dateKey = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const status = statusMap[dateKey];
              const thisDate = new Date(viewYear, viewMonth, day);
              const isPast = thisDate < today;
              const isToday = thisDate.getTime() === today.getTime();

              let bg = 'transparent', color = 'rgba(160,180,220,0.6)', border = '0.5px solid transparent';
              if (isPast)         { color = 'rgba(160,180,220,0.2)'; }
              if (status === 'free') { bg = 'rgba(111,207,151,0.15)'; color = '#6fcf97'; border = '0.5px solid rgba(111,207,151,0.3)'; }
              if (status === 'busy') { bg = 'rgba(235,87,87,0.12)'; color = 'rgba(235,87,87,0.7)'; border = '0.5px solid rgba(235,87,87,0.25)'; }
              if (isToday)           { border = '0.5px solid rgba(76,138,255,0.5)'; }

              return (
                <div key={dateKey} style={{ position: 'relative' }}>
                  <div
                    style={{ textAlign: 'center', fontSize: 11, padding: '6px 2px', borderRadius: 5, background: bg, color, border, cursor: isPast ? 'default' : 'pointer', userSelect: 'none', transition: 'all 0.1s' }}
                  >
                    {day}
                    {!isPast && (
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'none' }} className="date-menu">
                      </div>
                    )}
                  </div>
                  {!isPast && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      <button title="Free" onClick={() => setDateStatus(dateKey, 'free')} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(111,207,151,0.4)', border: 'none', cursor: 'pointer', padding: 0 }} />
                      <button title="Busy" onClick={() => setDateStatus(dateKey, 'busy')} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(235,87,87,0.35)', border: 'none', cursor: 'pointer', padding: 0 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.35)', marginBottom: 6 }}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Wedding booking at Taj Hotel" style={{ width: '100%', background: 'rgba(20,30,60,0.5)', border: '1px solid rgba(56,100,220,0.15)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#e8eef8', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Lists */}
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>Busy dates ({busy.length})</div>
            {busy.length === 0 ? <p style={{ fontSize: 12, color: 'rgba(160,180,220,0.25)' }}>None set</p> : busy.slice(0, 8).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(56,100,220,0.06)', fontSize: 12 }}>
                <span style={{ color: 'rgba(235,120,100,0.8)' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {a.note && <span style={{ color: 'rgba(160,180,220,0.3)', fontSize: 11 }}>{a.note}</span>}
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Free dates ({free.length})</div>
            {free.length === 0 ? <p style={{ fontSize: 12, color: 'rgba(160,180,220,0.25)' }}>None set</p> : free.slice(0, 8).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(56,100,220,0.06)', fontSize: 12 }}>
                <span style={{ color: 'rgba(100,200,140,0.8)' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {a.note && <span style={{ color: 'rgba(160,180,220,0.3)', fontSize: 11 }}>{a.note}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
