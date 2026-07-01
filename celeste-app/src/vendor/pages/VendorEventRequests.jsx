// src/vendor/pages/VendorEventRequests.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';
import './VendorEventRequests.css';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VendorEventRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();
  const { vendorUser } = useVendorAuth();

  useEffect(() => { fetchRequests(); }, [vendorUser]);

  async function fetchRequests() {
    try {
      const token = localStorage.getItem('vendor_token');
      // Get vendor ID from vendorUser context
      const vendorId = vendorUser?.vendor_id;
      if (!vendorId) {
        setLoading(false);
        return;
      }
      
      const res = await fetch(`${API}/bookings/vendor-requests/${vendorId}`, {
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

  if (loading) return <div className="ver-loading">Loading event requests…</div>;

  if (!vendorUser?.vendor_id) {
    return (
      <div className="ver-page">
        <div className="ver-header">
          <h2>Event Requests</h2>
        </div>
        <div className="ver-empty">
          <div className="ver-empty-icon">⚠️</div>
          <p>No vendor profile linked to your account.</p>
          <p style={{ fontSize: 12, color: 'rgba(200,175,120,0.5)', marginTop: 8 }}>
            Please complete your vendor profile setup to receive event requests.
          </p>
        </div>
      </div>
    );
  }

  async function respond(bookingId, status) {
    setResponding(r => ({ ...r, [bookingId]: true }));
    try {
      const token = localStorage.getItem('vendor_token');
      await fetch(`${API}/bookings/${bookingId}/vendor-response`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, vendor_notes: notes[bookingId] || '' })
      });
      
      // If accepted, trigger payment request
      if (status === 'accepted') {
        await fetch(`${API}/bookings/${bookingId}/request-payment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      }
      
      setRequests(prev => prev.map(r => r.id === bookingId ? { ...r, vendor_status: status, vendor_notes: notes[bookingId] || '' } : r));
    } finally {
      setResponding(r => ({ ...r, [bookingId]: false }));
    }
  }

  const pending = requests.filter(r => !r.vendor_status || r.vendor_status === 'pending');
  const responded = requests.filter(r => r.vendor_status && r.vendor_status !== 'pending');

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
  const canRespond = onRespond && (!req.vendor_status || req.vendor_status === 'pending');

  const statusMeta = {
    pending:   { label: 'New Request', color: '#d4a843' },
    accepted:  { label: 'Accepted',    color: '#5fcf7a' },
    declined:  { label: 'Declined',    color: '#f87171' },
  };
  const meta = statusMeta[req.vendor_status] || statusMeta.pending;

  // Parse event details from message
  const parseDetails = (message) => {
    if (!message) return {};
    const result = {};
    message.split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx > -1) result[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    });
    return result;
  };

  const details = parseDetails(req.message);

  return (
    <div className={`ver-card ver-card-${req.vendor_status || 'pending'}`}>
      <div className="ver-card-header" onClick={onToggle}>
        <div className="ver-card-left">
          <div className="ver-event-type">{req.event_type}</div>
          <div className="ver-event-name">{details['event'] || 'Unnamed Event'}</div>
          <div className="ver-event-meta">
            <span>📅 {req.event_date ? new Date(req.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}</span>
            {details['time'] && <span>🕐 {details['time']}</span>}
            <span>📍 {details['location'] || 'TBD'}</span>
            {details['capacity'] && <span>👥 {details['capacity']} guests</span>}
          </div>
        </div>
        <div className="ver-card-right">
          <div className="ver-service-price">
            <div className="ver-service-type">Photography Service</div>
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
              <span>Date</span><span>{req.event_date ? new Date(req.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}</span>
              {details['time'] && <><span>Time</span><span>{details['time']}</span></>}
              <span>Location</span><span>{details['location'] || 'TBD'}</span>
              {details['capacity'] && <><span>Guests</span><span>{details['capacity']}</span></>}
              {details['photography type'] && <><span>Photography</span><span>{details['photography type']}</span></>}
              <span>Your rate</span><span>₹{(req.quoted_price || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {details['decoration'] && (
            <div className="ver-detail-section">
              <div className="ver-detail-title">Additional Details</div>
              <div className="ver-detail-grid">
                <span>Decoration</span><span>{details['decoration']}</span>
              </div>
            </div>
          )}

          {canRespond && (
            <div className="ver-detail-section">
              <div className="ver-detail-title">Your Response</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                Accepting will automatically send a payment request to the client. Your share (85%) will be transferred after payment.
              </div>
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
                  {responding ? '…' : '✓ Accept & Request Payment'}
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

          {req.created_at && (
            <div className="ver-responded-at">
              Request received {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
