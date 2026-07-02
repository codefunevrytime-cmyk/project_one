import { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('vendor_token');

const S = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 28 },
  summaryCard: { display: 'flex', gap: 32, alignItems: 'center', background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '22px 26px', marginBottom: 24 },
  bigRating: { fontFamily: "'Cormorant Garamond', serif", fontSize: 44, color: '#4c8aff', lineHeight: 1 },
  card: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 12, padding: '16px 20px', marginBottom: 10 },
};

const Stars = ({ rating }) => (
  <span style={{ color: '#4c8aff', letterSpacing: 1 }}>
    {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
  </span>
);

export default function VendorReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | approved | pending

  useEffect(() => {
    fetch(`${API}/vendor-auth/reviews`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setReviews(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const approved = reviews.filter(r => r.approved);
  const avg = approved.length
    ? (approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1)
    : '—';

  const displayed = reviews.filter(r => {
    if (filter === 'approved') return r.approved;
    if (filter === 'pending') return !r.approved;
    return true;
  });

  return (
    <div>
      <div style={S.heading}>Reviews</div>
      <div style={S.sub}>What clients are saying about your work</div>

      <div style={S.summaryCard}>
        <div style={{ textAlign: 'center' }}>
          <div style={S.bigRating}>{avg}</div>
          <Stars rating={Number(avg) || 0} />
          <div style={{ fontSize: 11, color: 'rgba(160,180,220,0.4)', marginTop: 4 }}>
            {approved.length} approved review{approved.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', `All (${reviews.length})`], ['approved', `Approved (${approved.length})`], ['pending', `Pending (${reviews.length - approved.length})`]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(56,100,220,0.2)',
              background: filter === v ? 'rgba(76,138,255,0.2)' : 'transparent',
              color: filter === v ? '#4c8aff' : 'rgba(160,180,220,0.5)',
              fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'rgba(160,180,220,0.4)' }}>Loading…</p>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(160,180,220,0.25)', fontSize: 13 }}>
          No reviews yet.
        </div>
      ) : displayed.map(r => (
        <div key={r.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#c8d8f8' }}>{r.client_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <Stars rating={r.rating} />
                {r.sub_service && (
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(76,138,255,0.12)', border: '1px solid rgba(76,138,255,0.25)', color: '#4c8aff' }}>
                    {r.sub_service}
                  </span>
                )}
              </div>
            </div>
            {!r.approved && (
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(212,168,67,0.12)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }}>
                Awaiting admin approval
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(200,220,255,0.7)', lineHeight: 1.6, margin: 0 }}>{r.message}</p>
          <div style={{ fontSize: 10, color: 'rgba(160,180,220,0.25)', marginTop: 8 }}>
            {r.created_at && new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      ))}
    </div>
  );
}