import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

const STATUS_COLORS = {
  new:       { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  contacted: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
  confirmed: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  completed: { bg: '#f5f3ff', border: '#ddd6fe', color: '#6d28d9' },
  cancelled: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
};

export default function AdminBookings() {
  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchBookings = async () => {
    try {
      const res  = await fetch(`${API}/bookings`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setBookings(data);
    } catch {
      // Ignore booking fetch errors silently.
    }
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const updateStatus = async (id, status) => {
    await fetch(`${API}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    fetchBookings();
  };

  const sendPaymentRequest = async (id) => {
    const res  = await fetch(`${API}/bookings/${id}/request-payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) { showMsg('Payment request sent to client!'); fetchBookings(); }
  };

  const terminateBooking = async (id, paymentStatus) => {
    const hasPaid = paymentStatus === 'advance_paid';
    const confirm = window.confirm(
      hasPaid
        ? 'This client has paid an advance. Terminating will trigger a refund. Are you sure?'
        : 'Are you sure you want to terminate this booking?'
    );
    if (!confirm) return;

    // Cancel booking
    await fetch(`${API}/bookings/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ reason: 'Terminated by admin — deal not finalised' }),
    });

    // Trigger refund if advance was paid
    if (hasPaid) {
      const refRes  = await fetch(`${API}/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ booking_id: id, refund_pct: 100 }),
      });
      const refData = await refRes.json();
      if (refData.success) showMsg('Booking terminated. Full refund initiated.');
      else showMsg('Booking terminated. Refund failed — check Razorpay dashboard.');
    } else {
      showMsg('Booking terminated successfully.');
    }
    fetchBookings();
  };

  // Filter out cancelled from main list (show separately)
  const active    = bookings.filter(b => b.status !== 'cancelled');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Bookings</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Manage client booking requests</p>
      </div>

      {actionMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#15803d' }}>
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p>
      ) : active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>No booking requests yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map(b => {
            const sc = STATUS_COLORS[b.status] || STATUS_COLORS.new;
            return (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, padding: 20 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{b.client_name}</div>
                    <div style={{ fontSize: 12, color: '#9e8e7a' }}>{b.email} · {b.phone}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Payment requested badge */}
                    {b.payment_requested && b.payment_status !== 'advance_paid' && (
                      <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#fefce8', border: '1px solid #fde68a', color: '#92400e' }}>
                        💳 Payment Requested
                      </span>
                    )}
                    {b.payment_status === 'advance_paid' && (
                      <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
                        ✓ Advance Paid
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 20, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, textTransform: 'capitalize' }}>
                      {b.status}
                    </span>
                  </div>
                </div>

                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[['Event Type', b.event_type], ['Event Date', b.event_date ? new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'], ['Received', new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })]].map(([label, val]) => (
                    <div key={label} style={{ background: '#f7f5f2', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#9e8e7a', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, color: '#1a1008', fontWeight: 500 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {b.message && (
                  <div style={{ fontSize: 13, color: '#5a4a36', background: '#f7f5f2', borderRadius: 8, padding: '10px 12px', marginBottom: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {b.message}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Status buttons — hide cancelled */}
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

                  {/* Divider */}
                  <div style={{ width: 1, height: 20, background: '#e8e0d5', margin: '0 4px' }} />

                  {/* Send Payment Request — only when contacted and not yet requested */}
                  {b.status === 'contacted' && !b.payment_requested && (
                    <button
                      onClick={() => sendPaymentRequest(b.id)}
                      style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', background: '#1a1008', color: '#ffa01e', border: '1px solid #1a1008', fontWeight: 500 }}
                    >
                      💳 Send Payment Request
                    </button>
                  )}

                  {/* Already sent */}
                  {b.payment_requested && b.payment_status !== 'advance_paid' && (
                    <span style={{ fontSize: 11, color: '#9e8e7a', fontStyle: 'italic' }}>Payment request sent</span>
                  )}

                  {/* Terminate — only if not confirmed/completed/already paid */}
                  {!['confirmed', 'completed'].includes(b.status) && b.payment_status !== 'advance_paid' && (
                    <button
                      onClick={() => terminateBooking(b.id, b.payment_status)}
                      style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', marginLeft: 'auto' }}
                    >
                      ✕ Terminate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancelled bookings section */}
      {cancelled.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#9e8e7a', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Cancelled ({cancelled.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cancelled.map(b => (
              <div key={b.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008' }}>{b.client_name}</div>
                    <div style={{ fontSize: 11, color: '#9e8e7a' }}>{b.event_type} · {b.email}</div>
                    {b.cancel_reason && <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>{b.cancel_reason}</div>}
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>Cancelled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
