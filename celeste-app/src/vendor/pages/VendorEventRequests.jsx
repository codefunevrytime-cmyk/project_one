// src/vendor/pages/VendorEventRequests.jsx
import { useState, useEffect } from 'react';
import './VendorEventRequests.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function VendorEventRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    try {
      const token = localStorage.getItem('vendorToken');
      const res = await fetch(`${API}/api/events/vendor/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function respond(slotId, status) {
    setResponding(r => ({ ...r, [slotId]: true }));
    try {
      const token = localStorage.getItem('vendorToken');
      await fetch(`${API}/api/events/vendor/respond/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, vendor_notes: notes[slotId] || '' })
      });
      setRequests(prev => prev.map(r => r.id === slotId ? { ...r, status, responded_at: new Date().toISOString() } : r));
    } finally {
      setResponding(r => ({ ...r, [slotId]: false }));
    }
  }

  const pending = requests.filter(r => ['pending', 'viewed'].includes(r.status));
  const responded = requests.filter(r => !['pending', 'viewed'].includes(r.status));

  if (loading) return <div className="ver-loading">Loading event requests…</div>;

  return (
    <div className="ver-page">
      <div className="ver-header">
        <h2>Event Requests</h2>
        <p>Review and respond to event booking requests from clients</p>
        {pending.length > 0 && (
          <div className="ver-badge-new">{pending.length} new {pending.length === 1 ? 'request' : 'requests'}</div>
        )}
      </div>

      {requests.length === 0 && (
        <div className="ver-empty">
          <div className="ver-empty-icon">📋</div>
          <p>No event requests yet. When clients include you in their events, they'll appear here.</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="ver-section">
          <div className="ver-section-title">Awaiting Your Response</div>
          <div className="ver-list">
            {pending.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                expanded={expanded === req.id}
                onToggle={() => setExpanded(expanded === req.id ? null : req.id)}
                notes={notes[req.id] || ''}
                onNotes={v => setNotes(n => ({ ...n, [req.id]: v }))}
                onRespond={status => respond(req.id, status)}
                responding={responding[req.id]}
              />
            ))}
          </div>
        </div>
      )}

      {responded.length > 0 && (
        <div className="ver-section">
          <div className="ver-section-title">Past Responses</div>
          <div className="ver-list">
            {responded.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                expanded={expanded === req.id}
                onToggle={() => setExpanded(expanded === req.id ? null : req.id)}
                notes={notes[req.id] || req.vendor_notes || ''}
                onNotes={v => setNotes(n => ({ ...n, [req.id]: v }))}
                onRespond={null}
                responding={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, expanded, onToggle, notes, onNotes, onRespond, responding }) {
  const canRespond = onRespond && ['pending', 'viewed'].includes(req.status);

  const statusMeta = {
    pending: { label: 'New Request', color: '#d4a843' },
    viewed:  { label: 'Viewed',      color: '#8ab4f8' },
    accepted:{ label: 'Accepted',    color: '#5fcf7a' },
    declined:{ label: 'Declined',    color: '#f87171' },
  };
  const meta = statusMeta[req.status] || statusMeta.pending;

  return (
    <div className={`ver-card ver-card-${req.status}`}>
      <div className="ver-card-header" onClick={onToggle}>
        <div className="ver-card-left">
          <div className="ver-event-type">{req.event_type}</div>
          <div className="ver-event-name">{req.event_name || 'Unnamed Event'}</div>
          <div className="ver-event-meta">
            <span>📅 {new Date(req.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {req.event_time && <span>🕐 {req.event_time}</span>}
            <span>📍 {req.location}</span>
            {req.capacity && <span>👥 {req.capacity} guests</span>}
          </div>
        </div>
        <div className="ver-card-right">
          <div className="ver-service-price">
            <div className="ver-service-type">{req.service_type}</div>
            <div className="ver-quoted-price">₹{(req.quoted_price || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="ver-status-pill" style={{ color: meta.color, borderColor: meta.color + '44', background: meta.color + '18' }}>
            {meta.label}
          </div>
          <span className="ver-expand">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="ver-card-body">
          <div className="ver-detail-section">
            <div className="ver-detail-title">Event Details</div>
            <div className="ver-detail-grid">
              <span>Type</span><span>{req.event_type}</span>
              <span>Date</span><span>{new Date(req.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {req.event_time && <><span>Time</span><span>{req.event_time}</span></>}
              <span>Location</span><span>{req.location}</span>
              {req.capacity && <><span>Guests</span><span>{req.capacity}</span></>}
              {req.decoration_type && <><span>Decor</span><span>{req.decoration_type}</span></>}
              <span>Service</span><span>{req.service_type}</span>
              <span>Your rate</span><span>₹{(req.quoted_price || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {canRespond && (
            <div className="ver-detail-section">
              <div className="ver-detail-title">Your Response</div>
              <textarea
                value={notes}
                onChange={e => onNotes(e.target.value)}
                placeholder="Optional message to client or admin…"
                rows={3}
                className="ver-notes"
              />
              <div className="ver-response-btns">
                <button
                  className="ver-btn-accept"
                  disabled={responding}
                  onClick={() => onRespond('accepted')}
                >
                  {responding ? '…' : '✓ Accept Request'}
                </button>
                <button
                  className="ver-btn-decline"
                  disabled={responding}
                  onClick={() => onRespond('declined')}
                >
                  {responding ? '…' : '✕ Decline'}
                </button>
              </div>
            </div>
          )}

          {!canRespond && req.vendor_notes && (
            <div className="ver-detail-section">
              <div className="ver-detail-title">Your Note</div>
              <p className="ver-past-note">{req.vendor_notes}</p>
            </div>
          )}

          {req.responded_at && (
            <div className="ver-responded-at">
              Responded {new Date(req.responded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
