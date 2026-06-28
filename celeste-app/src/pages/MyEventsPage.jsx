// src/pages/MyEventsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './MyEventsPage.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EVENT_STATUS_STEPS = [
  { key: 'pending',          label: 'Submitted',        desc: 'Your event is in our queue' },
  { key: 'admin_reviewing',  label: 'Admin Reviewing',  desc: 'Our team is checking details' },
  { key: 'admin_approved',   label: 'Admin Approved',   desc: 'Vendors are being contacted' },
  { key: 'payment_pending',  label: 'Payment Due',      desc: 'All vendors confirmed — pay advance' },
  { key: 'confirmed',        label: 'Confirmed',        desc: 'Your event is fully booked!' },
];

const VENDOR_STATUS_META = {
  pending:  { label: 'Awaiting response', color: 'rgba(240,230,200,0.4)', icon: '⏳' },
  viewed:   { label: 'Viewed by vendor',  color: '#8ab4f8',               icon: '👁' },
  accepted: { label: 'Confirmed',         color: '#5fcf7a',               icon: '✓' },
  declined: { label: 'Unavailable',       color: '#f87171',               icon: '✕' },
  replaced: { label: 'Replaced',          color: 'rgba(240,230,200,0.3)', icon: '↩' },
};

function statusIndex(status) {
  const idx = EVENT_STATUS_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
}

export default function MyEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/events/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="me-loading">Loading your events…</div>;

  return (
    <div className="me-page">
      <div className="me-header">
        <div>
          <h1>My Events</h1>
          <p>Track the status of your event bookings</p>
        </div>
        <button className="me-new-btn" onClick={() => navigate('/create-event')}>+ Plan New Event</button>
      </div>

      {events.length === 0 ? (
        <div className="me-empty">
          <div className="me-empty-icon">🎉</div>
          <h2>No events yet</h2>
          <p>Start planning your first event and we'll take it from there.</p>
          <button className="me-new-btn" onClick={() => navigate('/create-event')}>Plan an Event</button>
        </div>
      ) : (
        <div className="me-list">
          {events.map(ev => (
            <Link to={`/my-events/${ev.id}`} key={ev.id} className="me-card">
              <div className="me-card-top">
                <div>
                  <div className="me-event-type-badge">{ev.event_type}</div>
                  <h2>{ev.event_name}</h2>
                  <div className="me-event-meta">
                    <span>📅 {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span>📍 {ev.location}</span>
                    {ev.capacity && <span>👥 {ev.capacity} guests</span>}
                  </div>
                </div>
                <div className="me-budget-badge">
                  ₹{(ev.budget_estimate || 0).toLocaleString('en-IN')}
                  <span>estimated</span>
                </div>
              </div>

              {/* Event progress timeline */}
              <div className="me-timeline">
                {EVENT_STATUS_STEPS.filter(s => s.key !== 'cancelled').map((step, i) => {
                  const current = statusIndex(ev.status);
                  const state = i < current ? 'done' : i === current ? 'active' : 'future';
                  return (
                    <div key={step.key} className={`me-timeline-step ${state}`}>
                      <div className="me-tl-dot">{state === 'done' ? '✓' : i + 1}</div>
                      <div className="me-tl-label">{step.label}</div>
                      {i < EVENT_STATUS_STEPS.length - 2 && <div className="me-tl-line" />}
                    </div>
                  );
                })}
              </div>

              {/* Vendor statuses */}
              {ev.vendors?.length > 0 && (
                <div className="me-vendors">
                  <div className="me-vendors-label">Vendors</div>
                  <div className="me-vendor-chips">
                    {ev.vendors.filter(v => v.status !== 'replaced').map(v => {
                      const meta = VENDOR_STATUS_META[v.status] || VENDOR_STATUS_META.pending;
                      return (
                        <div key={v.id} className="me-vendor-chip">
                          <span className="me-vc-icon">{meta.icon}</span>
                          <span className="me-vc-name">{v.business_name || v.vendor_name || 'Vendor'}</span>
                          <span className="me-vc-type">({v.service_type})</span>
                          <span className="me-vc-status" style={{ color: meta.color }}>{meta.label}</span>
                          {v.status === 'declined' && (
                            <Link
                              to={`/my-events/${ev.id}/replace/${v.id}`}
                              className="me-replace-btn"
                              onClick={e => e.stopPropagation()}
                            >
                              Choose another →
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment CTA */}
              {ev.status === 'payment_pending' && (
                <div className="me-payment-cta">
                  <span>🎉 All vendors confirmed! Advance payment due</span>
                  <button
                    className="me-pay-btn"
                    onClick={e => { e.preventDefault(); navigate(`/payment/${ev.id}`); }}
                  >
                    Pay ₹{Math.round((ev.budget_estimate || 0) * 0.30).toLocaleString('en-IN')} now
                  </button>
                </div>
              )}

              {ev.status === 'cancelled' && (
                <div className="me-cancelled-bar">Event cancelled</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
