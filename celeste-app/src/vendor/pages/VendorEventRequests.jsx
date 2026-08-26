// src/vendor/pages/VendorEventRequests.jsx
import { useState, useEffect } from 'react';
import './VendorEventRequests.css';

import { API_URL } from '../../config/api';

const API = API_URL;

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return d;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return d < startOfToday();
}

// ── Find the "ongoing" event ──────────────────────────────────────────────
// The accepted booking whose event date is soonest today-or-later — i.e.
// the next thing this vendor actually has coming up. Pinned to the top of
// the Ongoing & Upcoming tab and auto-expanded, since it's the most
// actionable/relevant item.
function findOngoing(list) {
  const today = startOfToday();
  const upcoming = list
    .filter(r => r.status === 'accepted' && r.event_date && new Date(r.event_date) >= today)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  return upcoming[0] || null;
}

function byNewestFirst(a, b) {
  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
}

function byEventDateAsc(a, b) {
  return new Date(a.event_date || 0) - new Date(b.event_date || 0);
}

function byEventDateDesc(a, b) {
  return new Date(b.event_date || 0) - new Date(a.event_date || 0);
}

const tabBtn = (active) => ({
  padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13,
  fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
  background: active ? '#d4a843' : 'rgba(255,255,255,0.05)',
  color: active ? '#1a1008' : 'rgba(232,220,200,0.6)',
  transition: 'all 0.15s',
});

export default function VendorEventRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'past'

  useEffect(() => { fetchRequests(); }, []);

  // Auto-open the ongoing event's detail section the first time requests
  // load, without fighting the vendor's own manual expand/collapse clicks
  // afterwards (only runs while nothing has been expanded yet).
  useEffect(() => {
    if (requests.length > 0 && expanded === null) {
      const ongoing = findOngoing(requests);
      if (ongoing) setExpanded(ongoing.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  async function fetchRequests() {
    try {
      const token = localStorage.getItem('vendor_token');
      const res = await fetch(`${API}/events/vendor/requests`, {
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
      const token = localStorage.getItem('vendor_token');
      await fetch(`${API}/events/vendor/respond/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, vendor_notes: notes[slotId] || '' })
      });
      setRequests(prev => prev.map(r => r.id === slotId ? { ...r, status, vendor_notes: notes[slotId] || '' } : r));
    } finally {
      setResponding(r => ({ ...r, [slotId]: false }));
    }
  }

  if (loading) return <div className="ver-loading">Loading event requests…</div>;

  const pending = requests.filter(r => !r.status || r.status === 'pending').sort(byNewestFirst);
  const responded = requests.filter(r => r.status && r.status !== 'pending');

  const ongoing = findOngoing(responded);

  // ── Ongoing & Upcoming tab ─────────────────────────────────────────────
  // Ongoing pinned first, then everything else accepted-and-upcoming
  // sorted chronologically (soonest next).
  const upcomingAccepted = responded
    .filter(r => r.status === 'accepted' && r.id !== ongoing?.id && !isPastDate(r.event_date))
    .sort(byEventDateAsc);

  const upcomingList = [...(ongoing ? [ongoing] : []), ...upcomingAccepted];

  // ── Past tab ────────────────────────────────────────────────────────────
  // Accepted bookings whose date has already passed, newest-past-first,
  // followed by all declined requests (also newest-first among themselves)
  // pushed to the very end.
  const pastAccepted = responded
    .filter(r => r.status === 'accepted' && isPastDate(r.event_date))
    .sort(byEventDateDesc);

  const declined = responded.filter(r => r.status === 'declined').sort(byNewestFirst);

  const pastList = [...pastAccepted, ...declined];

  return (
    <div className="ver-page">
      <div className="ver-header">
        <h2>Event Requests</h2>
        <p>Review and respond to event booking requests from clients</p>
        {pending.length > 0 && (
          <div className="ver-badge-new">{pending.length} new {pending.length === 1 ? 'request' : 'requests'}</div>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="ver-empty">
          <div className="ver-empty-icon">📋</div>
          <p>No event requests yet. When clients include you in their events, they'll appear here.</p>
        </div>
      ) : (
        <>
          {/* ── Tab toggle ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button style={tabBtn(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
              Ongoing &amp; Upcoming {upcomingList.length + pending.length > 0 ? `(${upcomingList.length + pending.length})` : ''}
            </button>
            <button style={tabBtn(tab === 'past')} onClick={() => setTab('past')}>
              Past {pastList.length > 0 ? `(${pastList.length})` : ''}
            </button>
          </div>

          {tab === 'upcoming' && (
            <>
              {pending.length > 0 && (
                <div className="ver-section">
                  <div className="ver-section-title">Awaiting Your Response</div>
                  <div className="ver-list">
                    {pending.map(req => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        isOngoing={false}
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

              {upcomingList.length > 0 ? (
                <div className="ver-section">
                  <div className="ver-section-title">Ongoing &amp; Upcoming</div>
                  <div className="ver-list">
                    {upcomingList.map(req => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        isOngoing={ongoing?.id === req.id}
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
              ) : pending.length === 0 && (
                <div className="ver-empty">
                  <div className="ver-empty-icon">📅</div>
                  <p>No ongoing or upcoming bookings right now.</p>
                </div>
              )}
            </>
          )}

          {tab === 'past' && (
            pastList.length > 0 ? (
              <div className="ver-section">
                <div className="ver-section-title">Past Events</div>
                <div className="ver-list">
                  {pastList.map(req => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      isOngoing={false}
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
            ) : (
              <div className="ver-empty">
                <div className="ver-empty-icon">🗂</div>
                <p>No past events yet.</p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function RequestCard({ req, isOngoing, expanded, onToggle, notes, onNotes, onRespond, responding }) {
  const canRespond = onRespond && (!req.status || req.status === 'pending');

  const statusMeta = {
    pending:   { label: 'New Request', color: '#d4a843' },
    accepted:  { label: 'Accepted',    color: '#5fcf7a' },
    declined:  { label: 'Declined',    color: '#f87171' },
  };
  const meta = statusMeta[req.status] || statusMeta.pending;
  const coverage = Array.isArray(req.coverage_types) ? req.coverage_types.join(', ') : '';

  return (
    <div
      className={`ver-card ver-card-${req.status || 'pending'}`}
      style={isOngoing ? { borderLeftWidth: 4, boxShadow: '0 0 0 1px rgba(95,207,122,0.25)' } : undefined}
    >
      <div className="ver-card-header" onClick={onToggle}>
        <div className="ver-card-left">
          <div className="ver-event-type" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{req.event_type}</span>
            {isOngoing && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                color: '#5fcf7a', background: 'rgba(95,207,122,0.15)',
                border: '1px solid rgba(95,207,122,0.35)', borderRadius: 20,
                padding: '2px 8px', textTransform: 'uppercase',
              }}>
                ● Ongoing
              </span>
            )}
          </div>
          <div className="ver-event-name">{req.event_name || 'Unnamed Event'}</div>
          <div className="ver-event-meta">
            <span>📅 {req.event_date ? new Date(req.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}</span>
            {req.event_time && <span>🕐 {req.event_time}</span>}
            <span>📍 {req.location || 'TBD'}</span>
            {req.capacity && <span>👥 {req.capacity} guests</span>}
          </div>
        </div>
        <div className="ver-card-right">
          <div className="ver-service-price">
            <div className="ver-service-type">{req.service_type || 'Service'}</div>
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
              {req.event_time && <><span>Time</span><span>{req.event_time}</span></>}
              <span>Location</span><span>{req.location || 'TBD'}</span>
              {req.capacity && <><span>Guests</span><span>{req.capacity}</span></>}
              {coverage && <><span>Coverage</span><span>{coverage}</span></>}
              {req.days && <><span>Days</span><span>{req.days}</span></>}
              {req.quantity && <><span>Quantity</span><span>{req.quantity}</span></>}
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
                  {responding ? '…' : '✓ Accept'}
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
