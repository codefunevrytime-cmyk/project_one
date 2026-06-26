import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

export default function AdminAvailability() {
  const [availability, setAvailability] = useState([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('busy');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`${API}/availability`);
      const data = await res.json();
      setAvailability(data);
    } catch {
      // Ignore availability fetch errors silently.
    }
  };

  useEffect(() => { fetchAvailability(); }, []);

  const handleSave = async () => {
    await fetch(`${API}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ date, status, note })
    });
    setSuccess('Availability updated!');
    setTimeout(() => setSuccess(''), 3000);
    setDate('');
    setNote('');
    fetchAvailability();
  };

  const busy = availability.filter(a => a.status === 'busy');
  const free = availability.filter(a => a.status === 'free');

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Availability</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Set your busy and free dates</p>
      </div>

      {/* Set Date */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 20 }}>Set Date Status</h3>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
            {success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="busy">Busy</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Note (optional)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Wedding at Taj Hotel"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!date}
          style={{
            padding: '10px 24px', background: '#1a1008', color: '#ffa01e',
            border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            fontWeight: 500, cursor: !date ? 'not-allowed' : 'pointer',
            opacity: !date ? 0.6 : 1,
          }}
        >
          Save
        </button>
      </div>

      {/* Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Busy Dates ({busy.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {busy.map(a => (
              <div key={a.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                {a.note && <div style={{ fontSize: 11, color: '#9e8e7a', marginTop: 2 }}>{a.note}</div>}
              </div>
            ))}
            {busy.length === 0 && <p style={{ fontSize: 13, color: '#9e8e7a' }}>No busy dates set.</p>}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Free Dates ({free.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {free.map(a => (
              <div key={a.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                {a.note && <div style={{ fontSize: 11, color: '#9e8e7a', marginTop: 2 }}>{a.note}</div>}
              </div>
            ))}
            {free.length === 0 && <p style={{ fontSize: 13, color: '#9e8e7a' }}>No free dates set.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}