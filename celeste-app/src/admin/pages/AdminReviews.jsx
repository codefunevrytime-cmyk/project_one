import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ client_name: '', message: '', rating: 5 });
  const [success, setSuccess] = useState('');

  const fetchReviews = async () => {
    try {
const res = await fetch(`${API}/reviews?all=true`, {     
       headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
       console.log('Reviews fetched:', data); // ← add this
      setReviews(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleApprove = async (id) => {
    await fetch(`${API}/reviews/${id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}` }
    });
    fetchReviews();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    await fetch(`${API}/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    });
    fetchReviews();
  };

 const handleAdd = async () => {
  await fetch(`${API}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, approved: true })
  });
  setForm({ client_name: '', message: '', rating: 5 });
  setSuccess('Review added!');
  setTimeout(() => setSuccess(''), 3000);
  setTimeout(() => fetchReviews(), 500);
};

  const pending = reviews.filter(r => !r.approved);
  const approved = reviews.filter(r => r.approved);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Reviews</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Manage and approve client reviews</p>
      </div>

      {/* Add Review Manually */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 20 }}>Add Review Manually</h3>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
            {success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Client Name</label>
            <input
              value={form.client_name}
              onChange={e => setForm({ ...form, client_name: e.target.value })}
              placeholder="e.g. Priya Sharma"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Rating</label>
            <select
              value={form.rating}
              onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            >
              {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} stars</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Review Message</label>
          <textarea
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            placeholder="Write the review..."
            rows={3}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!form.client_name || !form.message}
          style={{
            padding: '10px 24px', background: '#1a1008', color: '#ffa01e',
            border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            fontWeight: 500, cursor: 'pointer',
            opacity: !form.client_name || !form.message ? 0.6 : 1,
          }}
        >
          Add Review
        </button>
      </div>

      {/* Pending Reviews */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>
            Pending Approval ({pending.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(r => (
              <div key={r.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{r.client_name}</div>
                  <div style={{ fontSize: 12, color: '#c9a84c', marginBottom: 6 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  <div style={{ fontSize: 13, color: '#5a4a36', lineHeight: 1.6 }}>{r.message}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <button onClick={() => handleApprove(r.id)} style={{ padding: '6px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#15803d', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Approve
                  </button>
                  <button onClick={() => handleDelete(r.id)} style={{ padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Reviews */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>
          Approved Reviews ({approved.length})
        </h3>
        {loading ? (
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p>
        ) : approved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
            <p style={{ color: '#9e8e7a', fontSize: 13 }}>No approved reviews yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {approved.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{r.client_name}</div>
                  <div style={{ fontSize: 12, color: '#c9a84c', marginBottom: 6 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  <div style={{ fontSize: 13, color: '#5a4a36', lineHeight: 1.6 }}>{r.message}</div>
                </div>
                <button onClick={() => handleDelete(r.id)} style={{ padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginLeft: 16 }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}