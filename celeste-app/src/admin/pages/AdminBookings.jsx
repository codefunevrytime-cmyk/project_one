import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

const STATUS_COLORS = {
  new: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  contacted: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
  confirmed: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  completed: { bg: '#f5f3ff', border: '#ddd6fe', color: '#6d28d9' },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id, status) => {
    await fetch(`${API}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status })
    });
    fetchBookings();
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Bookings</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Manage client booking requests</p>
      </div>

      {loading ? (
        <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>No booking requests yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => {
            const s = STATUS_COLORS[b.status] || STATUS_COLORS.new;
            return (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{b.client_name}</div>
                    <div style={{ fontSize: 12, color: '#9e8e7a' }}>{b.email} · {b.phone}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, textTransform: 'capitalize' }}>
                    {b.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[['Event Type', b.event_type], ['Event Date', b.event_date ? new Date(b.event_date).toLocaleDateString() : 'N/A'], ['Received', new Date(b.created_at).toLocaleDateString()]].map(([label, val]) => (
                    <div key={label} style={{ background: '#f7f5f2', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#9e8e7a', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, color: '#1a1008', fontWeight: 500 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {b.message && (
                  <div style={{ fontSize: 13, color: '#5a4a36', background: '#f7f5f2', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    {b.message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  {['new', 'contacted', 'confirmed', 'completed'].map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(b.id, s)}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 11,
                        fontFamily: 'inherit', cursor: 'pointer', textTransform: 'capitalize',
                        background: b.status === s ? '#1a1008' : '#f7f5f2',
                        color: b.status === s ? '#ffa01e' : '#5a4a36',
                        border: `1px solid ${b.status === s ? '#1a1008' : '#e8e0d5'}`,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}