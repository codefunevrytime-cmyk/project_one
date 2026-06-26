import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

export default function AdminQueries() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueries = async () => {
    try {
      const res = await fetch(`${API}/queries`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      setQueries(data);
    } catch {
      // Ignore query fetch errors silently.
    }
    setLoading(false);
  };

  useEffect(() => { fetchQueries(); }, []);

  const markReplied = async (id) => {
    await fetch(`${API}/queries/${id}/replied`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}` }
    });
    fetchQueries();
  };

  const pending = queries.filter(q => !q.replied);
  const replied = queries.filter(q => q.replied);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Queries</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Client messages and inquiries</p>
      </div>

      {loading ? (
        <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p>
      ) : queries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>No queries yet.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Pending ({pending.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pending.map(q => (
                  <div key={q.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{q.client_name}</div>
                      <div style={{ fontSize: 11, color: '#9e8e7a', marginBottom: 8 }}>{q.email} · {q.phone}</div>
                      <div style={{ fontSize: 13, color: '#5a4a36', lineHeight: 1.6 }}>{q.message}</div>
                    </div>
                    <button onClick={() => markReplied(q.id)} style={{ padding: '6px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#15803d', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginLeft: 16 }}>
                      Mark Replied
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {replied.length > 0 && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Replied ({replied.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {replied.map(q => (
                  <div key={q.id} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{q.client_name}</div>
                    <div style={{ fontSize: 11, color: '#9e8e7a', marginBottom: 8 }}>{q.email} · {q.phone}</div>
                    <div style={{ fontSize: 13, color: '#5a4a36', lineHeight: 1.6 }}>{q.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}