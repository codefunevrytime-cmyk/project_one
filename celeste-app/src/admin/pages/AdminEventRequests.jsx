// src/admin/pages/AdminEventRequests.jsx
import { useState, useEffect } from 'react';
import './AdminEventRequests.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_OPTIONS = [
  { value: 'pending',         label: 'Pending' },
  { value: 'admin_reviewing', label: 'Reviewing' },
  { value: 'admin_approved',  label: 'Approved' },
  { value: 'payment_pending', label: 'Payment Due' },
  { value: 'confirmed',       label: 'Confirmed' },
  { value: 'cancelled',       label: 'Cancelled' },
];

const VENDOR_STATUS_COLORS = {
  pending:  'rgba(240,230,200,0.4)',
  viewed:   '#8ab4f8',
  accepted: '#5fcf7a',
  declined: '#f87171',
  replaced: 'rgba(240,230,200,0.25)',
};

export default function AdminEventRequests() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [notes, setNotes] = useState({});

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`${API}/api/events/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(eventId, status) {
    setStatusUpdating(s => ({ ...s, [eventId]: true }));
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      await fetch(`${API}/api/events/admin/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, admin_notes: notes[eventId] || '' })
      });
      setEvents(ev => ev.map(e => e.id === eventId ? { ...e, status } : e));
    } finally {
      setStatusUpdating(s => ({ ...s, [eventId]: false }));
    }
  }

  if (loading) return <div className="aer-loading">Loading event requests…</div>;

  const grouped = {
    pending: events.filter(e => e.status === 'pending'),
    admin_reviewing: events.filter(e => e.status === 'admin_reviewing'),
    admin_approved: events.filter(e => e.status === 'admin_approved'),
    payment_pending: events.filter(e => e.status === 'payment_pending'),
    confirmed: events.filter(e => e.status === 'confirmed'),
    cancelled: events.filter(e => e.status === 'cancelled'),
  };

  return (
    <div className="aer-page">
      <div className="aer-header">
        <h2>Event Requests</h2>
        <div className="aer-counts">
          {Object.entries(grouped).filter(([,v]) => v.length).map(([k, v]) => (
            <span key={k} className={`aer-count-badge aer-count-${k}`}>
              {STATUS_OPTIONS.find(s => s.value === k)?.label}: {v.length}
            </span>
          ))}
        </div>
      </div>

      {events.length === 0 && (
        <div className="aer-empty">No event requests yet.</div>
      )}

      <div className="aer-list">
        {events.map(ev => (
          <div key={ev.id} className={`aer-card aer-status-${ev.status}`}>
            {/* Card header */}
            <div className="aer-card-header" onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}>
              <div className="aer-card-left">
                <div className="aer-event-type">{ev.event_type}</div>
                <div className="aer-event-name">{ev.event_name}</div>
                <div className="aer-event-meta">
                  <span>📅 {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>📍 {ev.location}</span>
                  <span>👤 {ev.client_name}</span>
                  <span>👥 {ev.capacity} guests</span>
                </div>
              </div>
              <div className="aer-card-right">
                <div className="aer-budget">₹{(ev.budget_estimate || 0).toLocaleString('en-IN')}</div>
                <div className={`aer-status-pill aer-pill-${ev.status}`}>
                  {STATUS_OPTIONS.find(s => s.value === ev.status)?.label || ev.status}
                </div>
                <div className="aer-expand-icon">{expanded === ev.id ? '▲' : '▼'}</div>
              </div>
            </div>

            {/* Expanded details */}
            {expanded === ev.id && (
              <div className="aer-card-body">
                {/* Client info */}
                <div className="aer-section">
                  <div className="aer-section-title">Client</div>
                  <div className="aer-info-grid">
                    <span>Name</span><span>{ev.client_name}</span>
                    <span>Email</span><span>{ev.client_email}</span>
                    <span>Phone</span><span>{ev.client_phone || '—'}</span>
                  </div>
                </div>

                {/* Vendor statuses */}
                {ev.vendors?.length > 0 && (
                  <div className="aer-section">
                    <div className="aer-section-title">Vendor Acceptance Status</div>
                    {ev.vendors.filter(v => v.status !== 'replaced').map(v => (
                      <div key={v.id} className="aer-vendor-row">
                        <div className="aer-vendor-info">
                          <strong>{v.business_name || v.vendor_name || 'Vendor'}</strong>
                          <span>{v.service_type}</span>
                        </div>
                        <div className="aer-vendor-right">
                          <span className="aer-vendor-price">₹{(v.quoted_price || 0).toLocaleString('en-IN')}</span>
                          <span
                            className="aer-vendor-status"
                            style={{ color: VENDOR_STATUS_COLORS[v.status] || 'rgba(240,230,200,0.5)' }}
                          >
                            {v.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin notes */}
                <div className="aer-section">
                  <div className="aer-section-title">Admin Notes</div>
                  <textarea
                    value={notes[ev.id] ?? ev.admin_notes ?? ''}
                    onChange={e => setNotes(n => ({ ...n, [ev.id]: e.target.value }))}
                    placeholder="Add internal notes (visible to admin only)…"
                    rows={3}
                    className="aer-notes"
                  />
                </div>

                {/* Status control */}
                <div className="aer-section aer-actions">
                  <div className="aer-section-title">Update Status</div>
                  <div className="aer-status-buttons">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`aer-status-btn ${ev.status === opt.value ? 'aer-status-btn-active' : ''}`}
                        disabled={statusUpdating[ev.id] || ev.status === opt.value}
                        onClick={() => updateStatus(ev.id, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
