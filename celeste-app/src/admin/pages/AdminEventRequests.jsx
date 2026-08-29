// src/admin/pages/AdminEventRequests.jsx
import { useState, useEffect, useCallback } from 'react';
import './AdminEventRequests.css';

import { getSocket } from '../../lib/socket'; // adjust path if your lib folder sits elsewhere
import { adminFetch } from '../../lib/adminApi'; // adjust path if your lib folder sits elsewhere

// ── Status lifecycle ──────────────────────────────────────────────────────
// pending          → auto-set on client submit. Admin never needs a
//                     distinct label for this — the event simply showing
//                     up in the list is enough signal — so it folds into
//                     "Reviewing" below via displayStatus(). The CLIENT
//                     side (MyEvents.jsx) shows this same raw status as a
//                     genuinely distinct "Submitted" label, since knowing
//                     "we got it, nobody's looked yet" matters to them.
// admin_reviewing  → auto-set the moment admin opens the card (see
//                     toggleExpand's auto-PATCH below).
// contact          → MANUAL. Admin sets this after reviewing, while
//                     reaching out to the client to confirm details.
// admin_approved   → MANUAL. Admin sets this once contact is done.
// payment_pending  → AUTO. Set by maybeAdvanceEventStatus on the backend
//                     once all vendor slots are accepted AND the event is
//                     admin_approved. No manual button — admin approving
//                     is enough; the payment step should never need a
//                     deliberate "turn on payment" click.
// confirmed        → AUTO. Set by the backend the moment the client's
//                     advance payment succeeds (wired in payments.js, not
//                     this file). No manual button for the same reason.
// completed        → MANUAL. Admin marks the event done; this is what
//                     reveals the balance-payment option on the client
//                     side (see MyEvents.jsx's needsBalance).
// cancelled        → MANUAL, via Terminate.
const STATUS_LABELS = {
  pending:         'Reviewing',
  admin_reviewing: 'Reviewing',
  contact:         'Contact',
  admin_approved:  'Approved',
  payment_pending: 'Payment Due',
  confirmed:       'Confirmed',
  completed:       'Completed',
  cancelled:       'Cancelled',
};

// Statuses admin can manually set from the "Update Status" buttons.
// pending/payment_pending/confirmed are excluded on purpose — see the
// lifecycle comment above.
const MANUAL_STATUS_OPTIONS = [
  { value: 'admin_reviewing', label: 'Reviewing' },
  { value: 'contact',         label: 'Contact' },
  { value: 'admin_approved',  label: 'Approved' },
  { value: 'completed',       label: 'Completed' },
  { value: 'cancelled',       label: 'Cancelled' },
];

// Maps a raw event status to the status used for the pill/class/grouped
// counts. Only 'pending' folds (into 'admin_reviewing') — see comment
// above. Every other status displays as itself.
function displayStatus(status) {
  return status === 'pending' ? 'admin_reviewing' : status;
}

const VENDOR_STATUS_COLORS = {
  pending:  'rgba(42,32,24,0.45)',
  viewed:   '#3a5fc4',
  accepted: '#218a4f',
  declined: '#c73e3e',
  replaced: 'rgba(42,32,24,0.3)',
};

const ADDON_STATUS_META = {
  pending:   { label: 'Awaiting payment', color: '#a3760f' },
  paid:      { label: 'Paid',             color: '#218a4f' },
  cancelled: { label: 'Cancelled',        color: 'rgba(42,32,24,0.4)' },
};

const OFFLINE_METHOD_OPTIONS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer / UPI' },
];

// "Past" for admin purposes = an event that's done-and-dusted: completed,
// cancelled, or an otherwise-active booking whose event date has already
// gone by. Everything else counts as ongoing/upcoming.
const PAST_STATUSES = ['completed', 'cancelled'];

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return d;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return d < startOfToday();
}

function isPastEvent(e) {
  return PAST_STATUSES.includes(e.status) || isPastDate(e.event_date);
}

// ── Find the "ongoing" event ──────────────────────────────────────────────
// The soonest today-or-later event that's actually in-motion for admin
// (approved, payment due, or confirmed) — the one thing admin most needs
// eyes on right now. Pinned to the top of the Ongoing & Upcoming tab and
// auto-expanded.
const ONGOING_STATUSES = ['admin_approved', 'payment_pending', 'confirmed'];

function findOngoing(list) {
  const today = startOfToday();
  const upcoming = list
    .filter(e => ONGOING_STATUSES.includes(e.status) && e.event_date && new Date(e.event_date) >= today)
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
  background: active ? '#d4a843' : 'rgba(0,0,0,0.04)',
  color: active ? '#1a1008' : 'rgba(42,32,24,0.6)',
  transition: 'all 0.15s',
});

// ── Full-size image lightbox ────────────────────────────────────────────
// Used for client-uploaded reference images, which (unlike gallery
// references) have no reference_event_id to link admin to a real /explore
// page — this is the only place admin can actually see them at full size.
function ImageLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(8,6,4,0.92)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, cursor: 'zoom-out',
      }}
    >
      <img
        src={src}
        alt="Reference — full size"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain',
          borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', cursor: 'default',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 24, right: 32, width: 40, height: 40,
          borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)', color: '#f0e6c8',
          fontSize: 18, cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default function AdminEventRequests() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [notes, setNotes] = useState({});
  const [actionMsg, setActionMsg] = useState('');
  const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [lightboxImage, setLightboxImage] = useState(null);

  // ── Add-on charges: keyed by event id ─────────────────────────────────
  const [addonsByEvent, setAddonsByEvent] = useState({});
  const [addonForm, setAddonForm] = useState({});       // { [eventId]: { label, amount, notes } }
  const [addonSubmitting, setAddonSubmitting] = useState({});

  // ── Offline payment recording: keyed by event id ───────────────────────
  const [offlineForm, setOfflineForm] = useState({});    // { [eventId]: { payment_type, addon_id, payment_method, notes } }
  const [offlineSubmitting, setOfflineSubmitting] = useState({});

  // ── Reference-price estimate (Option 3): keyed by event id ─────────────
  // For a client-uploaded reference image (no reference_event_id, so no
  // gallery price exists for it), admin can attach a ballpark estimate
  // after reviewing the photo. This does NOT touch budget_estimate — it
  // only records reference_event_price so the client sees a number instead
  // of "price to be quoted" on their side, without silently changing a
  // total the client may have already paid an advance against.
  const [refPriceForm, setRefPriceForm] = useState({});        // { [eventId]: string }
  const [refPriceSubmitting, setRefPriceSubmitting] = useState({});

  // Live updates: a client submits a new event, cancels one, or a payment
  // lands — this merges the fresh row into local state without admin
  // having to reload the tab to see it.
  useEffect(() => {
    const socket = getSocket();

    const onUpdate = (updatedEvent) => {
      setEvents(prev => {
        const exists = prev.some(e => e.id === updatedEvent.id);
        return exists
          ? prev.map(e => (e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e))
          : [updatedEvent, ...prev];
      });
    };

    socket.on('event:update', onUpdate);
    return () => socket.off('event:update', onUpdate);
  }, []);

  // Add-on charges live in their own state (addonsByEvent), keyed by event
  // id, fetched on-demand when a card expands. Keep that in sync live too —
  // e.g. if admin creates a charge from one tab/device, another admin tab
  // (or the same one, after a payment settles it) sees it without a click.
  useEffect(() => {
    const socket = getSocket();
    const onAddonsUpdate = (payload) => {
      if (!payload?.event_id) return;
      setAddonsByEvent(a => ({ ...a, [payload.event_id]: Array.isArray(payload.addons) ? payload.addons : [] }));
    };
    socket.on('addons:update', onAddonsUpdate);
    return () => socket.off('addons:update', onAddonsUpdate);
  }, []);

  // Auto-open the ongoing event's detail section the first time events
  // load, without fighting admin's own manual expand/collapse clicks
  // afterwards (only runs while nothing has been expanded yet).
  useEffect(() => {
    if (events.length > 0 && expanded === null) {
      const ongoing = findOngoing(events);
      if (ongoing) {
        setExpanded(ongoing.id);
        if (!addonsByEvent[ongoing.id]) fetchAddons(ongoing.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3500); };

  const fetchEvents = useCallback(async () => {
    try {
      const res = await adminFetch(`/events/admin/all`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function fetchAddons(eventId) {
    try {
      const res = await adminFetch(`/payments/addons/${eventId}`);
      const data = await res.json();
      setAddonsByEvent(a => ({ ...a, [eventId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      console.error(err);
    }
  }

  async function updateStatus(eventId, status) {
    setStatusUpdating(s => ({ ...s, [eventId]: true }));
    try {
      await adminFetch(`/events/admin/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes[eventId] || '' })
      });
      setEvents(ev => ev.map(e => e.id === eventId ? { ...e, status } : e));
    } finally {
      setStatusUpdating(s => ({ ...s, [eventId]: false }));
    }
  }

  async function terminateEvent(eventId, paymentStatus) {
    const hasPaid = paymentStatus === 'advance_paid' || paymentStatus === 'fully_paid';
    const confirmed = window.confirm(
      hasPaid
        ? 'This client has paid. Terminating will trigger a refund. Are you sure?'
        : 'Are you sure you want to terminate this event request?'
    );
    if (!confirmed) return;

    setStatusUpdating(s => ({ ...s, [eventId]: true }));
    try {
      await adminFetch(`/events/admin/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', admin_notes: notes[eventId] || 'Terminated by admin — deal not finalised' })
      });

      if (hasPaid) {
        const refRes = await adminFetch(`/payments/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: eventId, refund_pct: 100, reason: 'Event terminated by admin' })
        });
        const refData = await refRes.json();
        showMsg(refData.success ? 'Event terminated. Refund initiated (or noted for manual settlement if offline).' : 'Event terminated. Refund failed — check Razorpay dashboard.');
      } else {
        showMsg('Event terminated successfully.');
      }

      setEvents(ev => ev.map(e => e.id === eventId ? { ...e, status: 'cancelled' } : e));
    } finally {
      setStatusUpdating(s => ({ ...s, [eventId]: false }));
    }
  }

  // ── Cost-cutting: partial refund/adjustment on an already-paid event ───
  async function handleAdjustment(eventId) {
    const pctStr = window.prompt('What % of the most recent paid amount should be refunded/adjusted? (e.g. 20)');
    if (!pctStr) return;
    const pct = Number(pctStr);
    if (!pct || pct <= 0 || pct > 100) { showMsg('Enter a valid percentage between 1 and 100.'); return; }
    const reason = window.prompt('Reason for this adjustment (shown in the payment ledger):') || 'Cost adjustment by admin';

    try {
      const res = await adminFetch(`/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: eventId, refund_pct: pct, reason }),
      });
      const data = await res.json();
      showMsg(data.success ? `Adjustment recorded — ₹${((data.refund_amount||0)/100).toLocaleString('en-IN')}${data.note ? ' (' + data.note + ')' : ''}` : (data.error || 'Adjustment failed.'));
    } catch {
      showMsg('Could not connect to server.');
    }
  }

  // ── Add-on charges ───────────────────────────────────────────────────
  const setAddonField = (eventId, key, val) =>
    setAddonForm(f => ({ ...f, [eventId]: { ...(f[eventId] || {}), [key]: val } }));

  async function handleCreateAddon(eventId) {
    const form = addonForm[eventId] || {};
    if (!form.label || !form.amount) { showMsg('Label and amount are required for an add-on.'); return; }

    setAddonSubmitting(s => ({ ...s, [eventId]: true }));
    try {
      const res = await adminFetch(`/payments/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, label: form.label, amount: Number(form.amount), notes: form.notes || null }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Add-on charge created — client will see it on their event.');
        setAddonForm(f => ({ ...f, [eventId]: { label: '', amount: '', notes: '' } }));
        fetchAddons(eventId);
      } else {
        showMsg(data.error || 'Could not create add-on.');
      }
    } catch {
      showMsg('Could not connect to server.');
    }
    setAddonSubmitting(s => ({ ...s, [eventId]: false }));
  }

  async function handleCancelAddon(eventId, addonId) {
    if (!window.confirm('Cancel this add-on charge?')) return;
    await adminFetch(`/payments/addons/${addonId}/cancel`, {
      method: 'PATCH',
    });
    fetchAddons(eventId);
  }

  // ── Offline / COD payment recording ──────────────────────────────────
  const setOfflineField = (eventId, key, val) =>
    setOfflineForm(f => ({ ...f, [eventId]: { ...(f[eventId] || { payment_type: 'advance', payment_method: 'cash' }), [key]: val } }));

  async function handleRecordOffline(eventId) {
    const form = offlineForm[eventId] || { payment_type: 'advance', payment_method: 'cash' };
    if (form.payment_type === 'addon' && !form.addon_id) {
      showMsg('Select which add-on this offline payment is for.');
      return;
    }

    setOfflineSubmitting(s => ({ ...s, [eventId]: true }));
    try {
      const res = await adminFetch(`/payments/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: eventId,
          payment_type: form.payment_type,
          addon_id: form.payment_type === 'addon' ? Number(form.addon_id) : undefined,
          payment_method: form.payment_method,
          notes: form.notes || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        const amt = (Number(data.payment.amount) / 100).toLocaleString('en-IN');
        showMsg(`Offline payment recorded — ₹${amt} (${form.payment_method === 'cash' ? 'Cash' : 'Bank Transfer'})`);
        setOfflineForm(f => ({ ...f, [eventId]: { payment_type: 'advance', payment_method: 'cash', notes: '' } }));
        fetchEvents();
        if (form.payment_type === 'addon') fetchAddons(eventId);
      } else {
        showMsg(data.error || 'Could not record offline payment.');
      }
    } catch {
      showMsg('Could not connect to server.');
    }
    setOfflineSubmitting(s => ({ ...s, [eventId]: false }));
  }

  // ── Reference-price estimate (Option 3) ───────────────────────────────
  // Lets admin attach a ballpark ₹ estimate to a client-uploaded reference
  // photo that came in with no price at all. Deliberately does NOT touch
  // budget_estimate — see note above the state declarations.
  async function handleSetReferencePrice(eventId) {
    const val = Number(refPriceForm[eventId]);
    if (!val || val <= 0) { showMsg('Enter a valid amount.'); return; }

    setRefPriceSubmitting(s => ({ ...s, [eventId]: true }));
    try {
      const res = await adminFetch(`/events/admin/${eventId}/reference-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_event_price: val }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('Reference price set — client will see it updated.');
        setEvents(ev => ev.map(e => e.id === eventId ? { ...e, reference_event_price: val } : e));
        setRefPriceForm(f => ({ ...f, [eventId]: '' }));
      } else {
        showMsg(data.error || 'Could not set price.');
      }
    } catch {
      showMsg('Could not connect to server.');
    }
    setRefPriceSubmitting(s => ({ ...s, [eventId]: false }));
  }

  function toggleExpand(eventId) {
    const next = expanded === eventId ? null : eventId;
    setExpanded(next);
    if (next && !addonsByEvent[next]) fetchAddons(next);

    // Opening a still-"pending" request means admin is now looking at it —
    // flip it to "admin_reviewing" so the client sees "Reviewing" instead of
    // "Pending" without admin having to click the status button manually.
    // This only fires from 'pending' specifically, so re-opening a card
    // that's already further along (approved, payment due, confirmed, etc.)
    // never gets bumped backwards to "Reviewing".
    if (next) {
      const ev = events.find(e => e.id === next);
      if (ev && ev.status === 'pending') {
        updateStatus(next, 'admin_reviewing');
      }
    }
  }

  if (loading) return <div className="aer-loading">Loading event requests…</div>;

  const grouped = {
    // 'pending' folded in here — see displayStatus() comment above.
    admin_reviewing: events.filter(e => e.status === 'admin_reviewing' || e.status === 'pending'),
    contact: events.filter(e => e.status === 'contact'),
    admin_approved: events.filter(e => e.status === 'admin_approved'),
    payment_pending: events.filter(e => e.status === 'payment_pending'),
    confirmed: events.filter(e => e.status === 'confirmed'),
    completed: events.filter(e => e.status === 'completed'),
    cancelled: events.filter(e => e.status === 'cancelled'),
  };

  // ── Ongoing & Upcoming tab ─────────────────────────────────────────────
  const ongoing = findOngoing(events);
  const upcomingRest = events
    .filter(e => !isPastEvent(e) && e.id !== ongoing?.id)
    .sort(byEventDateAsc);
  const upcomingList = [...(ongoing ? [ongoing] : []), ...upcomingRest];

  // ── Past tab ────────────────────────────────────────────────────────────
  // Completed/cancelled/date-passed events, newest-event-first, with
  // cancelled ones pushed to the very end (also newest-first among
  // themselves).
  const pastNonCancelled = events
    .filter(e => isPastEvent(e) && e.status !== 'cancelled')
    .sort(byEventDateDesc);
  const cancelled = events.filter(e => e.status === 'cancelled').sort(byNewestFirst);
  const pastList = [...pastNonCancelled, ...cancelled];

  const activeList = tab === 'upcoming' ? upcomingList : pastList;

  return (
    <div className="aer-page">
      <div className="aer-header">
        <h2>Event Requests</h2>
        <div className="aer-counts">
          {Object.entries(grouped).filter(([,v]) => v.length).map(([k, v]) => (
            <span key={k} className={`aer-count-badge aer-count-${k}`}>
              {STATUS_LABELS[k]}: {v.length}
            </span>
          ))}
        </div>
      </div>

      {actionMsg && (
        <div className="aer-action-msg">{actionMsg}</div>
      )}

      {events.length === 0 ? (
        <div className="aer-empty">No event requests yet.</div>
      ) : (
        <>
          {/* ── Tab toggle ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button style={tabBtn(tab === 'upcoming')} onClick={() => setTab('upcoming')}>
              Ongoing &amp; Upcoming {upcomingList.length > 0 ? `(${upcomingList.length})` : ''}
            </button>
            <button style={tabBtn(tab === 'past')} onClick={() => setTab('past')}>
              Past {pastList.length > 0 ? `(${pastList.length})` : ''}
            </button>
          </div>

          {activeList.length === 0 ? (
            <div className="aer-empty">
              {tab === 'upcoming' ? 'No ongoing or upcoming events right now.' : 'No past events yet.'}
            </div>
          ) : (
            <div className="aer-list">
              {activeList.map(ev => {
                const addons = addonsByEvent[ev.id] || [];
                const pendingAddons = addons.filter(a => a.status === 'pending');
                const aForm = addonForm[ev.id] || { label: '', amount: '', notes: '' };
                const oForm = offlineForm[ev.id] || { payment_type: 'advance', payment_method: 'cash', notes: '' };
                const hasPaid = ev.payment_status === 'advance_paid' || ev.payment_status === 'fully_paid';
                const isOngoing = ongoing?.id === ev.id;
                // A reference with no reference_event_id never came from the
                // gallery — it's a photo the client uploaded themselves.
                // There's no /explore page for it to link to, so it's the
                // one case that needs the full-size lightbox.
                const isCustomRef = !ev.reference_event_id && !!ev.reference_event_image;

                const dStatus = displayStatus(ev.status);

                return (
                <div
                  key={ev.id}
                  className={`aer-card aer-status-${dStatus}`}
                  style={isOngoing ? { borderLeftWidth: 4, boxShadow: '0 0 0 1px rgba(33,138,79,0.25)' } : undefined}
                >
                  {/* Card header */}
                  <div className="aer-card-header" onClick={() => toggleExpand(ev.id)}>
                    <div className="aer-card-left">
                      <div className="aer-event-type" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{ev.event_type}</span>
                        {isOngoing && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                            color: '#218a4f', background: 'rgba(33,138,79,0.12)',
                            border: '1px solid rgba(33,138,79,0.3)', borderRadius: 20,
                            padding: '2px 8px', textTransform: 'uppercase',
                          }}>
                            ● Ongoing
                          </span>
                        )}
                      </div>
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
                      <div className={`aer-status-pill aer-pill-${dStatus}`}>
                        {STATUS_LABELS[dStatus] || dStatus}
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

                      {ev.additional_details && (
                        <div className="aer-section">
                          <div className="aer-section-title">Additional Details</div>
                          <div style={{ fontSize:13, color:"#a3760f", lineHeight:1.7, whiteSpace:"pre-wrap", background:"rgba(0,0,0,0.02)", border:"0.5px solid rgba(0,0,0,0.08)", borderRadius:8, padding:"10px 12px" }}>
                            {ev.additional_details}
                          </div>
                        </div>
                      )}

                      {/* Reference / cover image */}
                      {(ev.reference_event_image || ev.reference_event_id) && (
                        <div className="aer-section">
                          <div className="aer-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>Reference</span>
                            {isCustomRef && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                                color: '#3a5fc4', background: 'rgba(70,110,220,0.1)',
                                border: '1px solid rgba(70,110,220,0.3)', borderRadius: 20, padding: '2px 8px',
                              }}>
                                Client upload
                              </span>
                            )}
                          </div>
                          <div className="aer-ref-preview">
                            {ev.reference_event_image && (
                              <div
                                className="aer-ref-thumb"
                                onClick={() => isCustomRef && setLightboxImage(ev.reference_event_image)}
                                style={isCustomRef ? { cursor: 'zoom-in' } : undefined}
                                title={isCustomRef ? 'Click to view full size' : undefined}
                              >
                                <img src={ev.reference_event_image} alt={ev.reference_event_title || 'Event cover'} />
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                              {(ev.reference_event_title || ev.reference_event_type) && (
                                <div style={{ fontSize: 13, color: '#a3760f' }}>
                                  {ev.reference_event_title}
                                  {ev.reference_event_type && (
                                    <span style={{ color: 'rgba(163,118,15,0.7)', marginLeft: 6 }}>
                                      ({ev.reference_event_type})
                                    </span>
                                  )}
                                </div>
                              )}
                              {ev.reference_event_price > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, color: 'rgba(163,118,15,0.75)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Reference event price
                                  </span>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: '#b48414' }}>
                                    ₹{Number(ev.reference_event_price).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}

                              {/* ── Option 3: admin can set an estimate for a
                                  client-uploaded reference that has no price
                                  yet. Hides itself once a price is set. This
                                  only updates reference_event_price — it does
                                  NOT recompute budget_estimate, since the
                                  client may already have paid an advance
                                  against the original total. */}
                              {isCustomRef && !ev.reference_event_price && (
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                                  <input
                                    className="aer-notes"
                                    style={{ minHeight: 'auto', padding: '7px 10px', width: 120 }}
                                    type="number"
                                    placeholder="Estimate ₹"
                                    value={refPriceForm[ev.id] ?? ''}
                                    onChange={e => setRefPriceForm(f => ({ ...f, [ev.id]: e.target.value }))}
                                  />
                                  <button
                                    className="aer-status-btn"
                                    disabled={refPriceSubmitting[ev.id]}
                                    onClick={() => handleSetReferencePrice(ev.id)}
                                  >
                                    {refPriceSubmitting[ev.id] ? '…' : 'Set estimate'}
                                  </button>
                                </div>
                              )}

                              {/* Gallery-sourced reference: send admin to the real
                                  /explore listing for full context. Client-uploaded
                                  reference: no such page exists, so open it full
                                  size right here instead. */}
                              {ev.reference_event_id ? (
                                <button
                                  className="aer-view-img-btn"
                                  style={{ alignSelf: 'flex-start' }}
                                  onClick={() => window.open(`/explore?open=${ev.reference_event_id}`, '_blank')}
                                >
                                  VIEW IMAGE
                                </button>
                              ) : ev.reference_event_image ? (
                                <button
                                  className="aer-view-img-btn"
                                  style={{ alignSelf: 'flex-start' }}
                                  onClick={() => setLightboxImage(ev.reference_event_image)}
                                >
                                  VIEW FULL SIZE
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}

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
                                {v.reference_event_image && (
                                  <button
                                    className="aer-view-img-btn"
                                    onClick={() => setLightboxImage(v.reference_event_image)}
                                  >
                                    VIEW REF
                                  </button>
                                )}
                                <span
                                  className="aer-vendor-status"
                                  style={{ color: VENDOR_STATUS_COLORS[v.status] || 'rgba(42,32,24,0.5)' }}
                                >
                                  {v.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── Add-on charges ─────────────────────────────────────── */}
                      <div className="aer-section">
                        <div className="aer-section-title">Add-on Charges</div>

                        {addons.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            {addons.map(a => {
                              const meta = ADDON_STATUS_META[a.status] || ADDON_STATUS_META.pending;
                              return (
                                <div key={a.id} className="aer-vendor-row">
                                  <div className="aer-vendor-info">
                                    <strong>{a.label}</strong>
                                    <span>{a.notes || '—'}</span>
                                  </div>
                                  <div className="aer-vendor-right">
                                    <span className="aer-vendor-price">₹{Number(a.amount).toLocaleString('en-IN')}</span>
                                    <span className="aer-vendor-status" style={{ color: meta.color }}>{meta.label}</span>
                                    {a.status === 'pending' && (
                                      <button
                                        className="aer-terminate-btn"
                                        style={{ marginLeft: 0 }}
                                        onClick={() => handleCancelAddon(ev.id, a.id)}
                                      >
                                        ✕ Cancel
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="aer-inline-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1.4fr auto', gap: 8, alignItems: 'center' }}>
                          <input
                            className="aer-notes"
                            style={{ minHeight: 'auto', padding: '9px 12px' }}
                            placeholder="e.g. Extra hour of DJ coverage"
                            value={aForm.label}
                            onChange={e => setAddonField(ev.id, 'label', e.target.value)}
                          />
                          <input
                            className="aer-notes"
                            style={{ minHeight: 'auto', padding: '9px 12px' }}
                            type="number"
                            placeholder="Amount ₹"
                            value={aForm.amount}
                            onChange={e => setAddonField(ev.id, 'amount', e.target.value)}
                          />
                          <input
                            className="aer-notes"
                            style={{ minHeight: 'auto', padding: '9px 12px' }}
                            placeholder="Note to client (optional)"
                            value={aForm.notes}
                            onChange={e => setAddonField(ev.id, 'notes', e.target.value)}
                          />
                          <button
                            className="aer-status-btn"
                            disabled={addonSubmitting[ev.id]}
                            onClick={() => handleCreateAddon(ev.id)}
                          >
                            {addonSubmitting[ev.id] ? '…' : '+ Add charge'}
                          </button>
                        </div>
                      </div>

                      {/* ── Record offline / COD payment ──────────────────────── */}
                      <div className="aer-section">
                        <div className="aer-section-title">Record Offline Payment (Cash / Bank Transfer)</div>
                        <div className="aer-inline-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <select
                            className="aer-notes"
                            style={{ minHeight: 'auto', padding: '9px 12px' }}
                            value={oForm.payment_type}
                            onChange={e => setOfflineField(ev.id, 'payment_type', e.target.value)}
                          >
                            <option value="advance">Advance</option>
                            <option value="balance">Balance</option>
                            {pendingAddons.length > 0 && <option value="addon">Add-on charge</option>}
                          </select>

                          {oForm.payment_type === 'addon' ? (
                            <select
                              className="aer-notes"
                              style={{ minHeight: 'auto', padding: '9px 12px' }}
                              value={oForm.addon_id || ''}
                              onChange={e => setOfflineField(ev.id, 'addon_id', e.target.value)}
                            >
                              <option value="">Select add-on…</option>
                              {pendingAddons.map(a => (
                                <option key={a.id} value={a.id}>{a.label} — ₹{Number(a.amount).toLocaleString('en-IN')}</option>
                              ))}
                            </select>
                          ) : (
                            <select
                              className="aer-notes"
                              style={{ minHeight: 'auto', padding: '9px 12px' }}
                              value={oForm.payment_method}
                              onChange={e => setOfflineField(ev.id, 'payment_method', e.target.value)}
                            >
                              {OFFLINE_METHOD_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                          )}

                          {oForm.payment_type === 'addon' ? (
                            <select
                              className="aer-notes"
                              style={{ minHeight: 'auto', padding: '9px 12px' }}
                              value={oForm.payment_method}
                              onChange={e => setOfflineField(ev.id, 'payment_method', e.target.value)}
                            >
                              {OFFLINE_METHOD_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                          ) : (
                            <input
                              className="aer-notes"
                              style={{ minHeight: 'auto', padding: '9px 12px' }}
                              placeholder="Reference / note (optional)"
                              value={oForm.notes}
                              onChange={e => setOfflineField(ev.id, 'notes', e.target.value)}
                            />
                          )}

                          <button
                            className="aer-status-btn"
                            disabled={offlineSubmitting[ev.id]}
                            onClick={() => handleRecordOffline(ev.id)}
                          >
                            {offlineSubmitting[ev.id] ? '…' : '✓ Record payment'}
                          </button>
                        </div>
                        {oForm.payment_type === 'addon' && (
                          <input
                            className="aer-notes"
                            style={{ minHeight: 'auto', padding: '9px 12px', width: '100%', boxSizing: 'border-box' }}
                            placeholder="Reference / note (optional)"
                            value={oForm.notes}
                            onChange={e => setOfflineField(ev.id, 'notes', e.target.value)}
                          />
                        )}
                      </div>

                      {/* ── Cost-cutting / adjustment ──────────────────────────── */}
                      {hasPaid && (
                        <div className="aer-section">
                          <div className="aer-section-title">Cost Adjustment</div>
                          <p style={{ fontSize: 12, color: 'rgba(42,32,24,0.55)', marginBottom: 10, lineHeight: 1.6 }}>
                            If the final cost came in lower than what the client already paid (e.g. a vendor
                            dropped out, or a service was reduced), record a partial refund/adjustment here.
                            Online payments trigger a real Razorpay refund; offline ones just update the ledger
                            for you to settle manually.
                          </p>
                          <button className="aer-terminate-btn" onClick={() => handleAdjustment(ev.id)}>
                            ↩ Issue partial refund / adjustment
                          </button>
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
                          {MANUAL_STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              className={`aer-status-btn ${dStatus === opt.value ? 'aer-status-btn-active' : ''}`}
                              disabled={statusUpdating[ev.id] || dStatus === opt.value}
                              onClick={() => updateStatus(ev.id, opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}

                          {!['cancelled', 'completed'].includes(ev.status) && (
                            <button
                              className="aer-terminate-btn"
                              disabled={statusUpdating[ev.id]}
                              onClick={() => terminateEvent(ev.id, ev.payment_status)}
                            >
                              ✕ Terminate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}