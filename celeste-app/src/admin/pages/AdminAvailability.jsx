import { useState, useEffect } from 'react';

import { API_URL } from '../../config/api';
import { adminFetch } from '../../lib/adminApi';

const API = API_URL;

export default function AdminAvailability() {
  const [availability, setAvailability] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('busy');
  const [note, setNote] = useState('');
  // FIXED: this form had no way to say WHICH vendor a date applied to —
  // every save posted { date, status, note } with no vendor_id at all.
  // The backend (availability.js POST /) treats a missing vendor_id as
  // "studio-wide" by design (vendorId = req.body.vendor_id || null), so
  // every single entry created here — regardless of what the admin
  // actually meant — landed as a studio-wide closure. That's why it
  // showed up identically on a vendor's own Availability tab AND marked
  // every vendor as unavailable on CreateEventPage, even when only one
  // vendor was meant to be busy that day.
  // '' (empty string) = studio-wide, matching what the backend already
  // treats as null via `|| null` — a real vendor's id is a truthy string.
  const [vendorId, setVendorId] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`${API}/availability`);
      const data = await res.json();
      setAvailability(data);
    } catch {
      // Ignore availability fetch errors silently.
    }
  };

  // NEW: vendor list for the scope dropdown. Uses /vendors/all (admin-only,
  // unfiltered) rather than the public /vendors — an admin setting
  // availability should be able to pick ANY vendor, including ones
  // currently inactive, not just the ones a client would see.
  //
  // FIXED: was reading `localStorage.getItem('adminToken')` and building
  // its own Authorization header — a leftover from before this app moved
  // to the access/refresh-token split in lib/adminApi.js. AdminApp.jsx
  // never writes to that localStorage key at all (it only calls
  // setAdminAccessToken(), which sets an in-memory token inside
  // adminApi.js), so this was either sending no token, or — if a stale
  // pre-migration value was still sitting in localStorage from before —
  // sending a validly-signed but outdated token missing `type: 'access'`,
  // which server/middleware/adminAuth.js now explicitly requires. Either
  // way this endpoint 403'd regardless of whether the admin was actually
  // logged in. adminFetch() attaches the real, current in-memory token
  // and transparently refreshes it on 401, same as every other admin
  // call in this app.
  const fetchVendors = async () => {
    try {
      const res = await adminFetch('/vendors/all');
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      // Ignore silently — the scope dropdown just falls back to
      // "Studio-wide" only if this fails.
    }
  };

  useEffect(() => { fetchAvailability(); fetchVendors(); }, []);

  const handleSave = async () => {
    await adminFetch('/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // FIXED: now sends vendor_id — empty string when "Studio-wide" is
      // selected, which the backend's `req.body.vendor_id || null`
      // correctly reads as null (studio-wide), same as before this fix,
      // but now that's a deliberate choice instead of the only option.
      body: JSON.stringify({ date, status, note, vendor_id: vendorId || null })
    });
    setSuccess('Availability updated!');
    setTimeout(() => setSuccess(''), 3000);
    setDate('');
    setNote('');
    setVendorId('');
    fetchAvailability();
  };

  // NEW: no delete existed anywhere in this file before — meaning the six
  // dates already sitting in the DB as studio-wide (because they were all
  // created through the old vendor_id-less form) had no way to be removed
  // and re-added with the correct scope. Admin-only, matches the auth
  // pattern already used by every other admin action on this page.
  const handleDelete = async (id) => {
    await adminFetch(`/availability/${id}`, {
      method: 'DELETE',
    });
    fetchAvailability();
  };

  const vendorName = (vendor_id) => {
    if (vendor_id === null || vendor_id === undefined) return 'Studio-wide';
    const v = vendors.find(v => String(v.id) === String(vendor_id));
    return v ? v.name : `Vendor #${vendor_id}`;
  };

  const busy = availability.filter(a => a.status === 'busy');
  const free = availability.filter(a => a.status === 'free');

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Availability</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Set busy and free dates — studio-wide, or for one specific vendor</p>
      </div>

      {/* Set Date */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 20 }}>Set Date Status</h3>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
            {success}
          </div>
        )}

        {/* NEW: scope selector — the one field that was missing entirely.
            Defaults to "Studio-wide" so existing muscle-memory (old form
            had no scope at all, always studio-wide) doesn't silently
            change behavior for anyone used to the old form. */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Applies to</label>
          <select
            value={vendorId}
            onChange={e => setVendorId(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="">Studio-wide (blocks every vendor)</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}{v.is_active === false ? ' (inactive)' : ''}</option>
            ))}
          </select>
          {vendorId === '' && (
            <p style={{ fontSize: 11, color: '#b45309', marginTop: 6 }}>
              This will mark every vendor unavailable on this date — only use it for an actual studio closure, not a single vendor's personal leave.
            </p>
          )}
        </div>

        <div className="admin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="busy">Busy</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Note (optional)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Wedding at Taj Hotel"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!date}
          style={{
            padding: '10px 24px', background: '#1a1008', color: '#ffa01e',
            border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            fontWeight: 500, cursor: !date ? 'not-allowed' : 'pointer',
            opacity: !date ? 0.6 : 1,
          }}
        >
          Save
        </button>
      </div>

      {/* Display */}
      <div className="admin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Busy Dates ({busy.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {busy.map(a => (
              <div key={a.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  {/* NEW: which vendor (or studio-wide) this row actually
                      applies to — previously invisible, which is exactly
                      why the mis-scoped rows went unnoticed. */}
                  <div style={{ fontSize: 11, fontWeight: 600, color: a.vendor_id ? '#9e6b1a' : '#b45309', marginTop: 2 }}>{vendorName(a.vendor_id)}</div>
                  {a.note && <div style={{ fontSize: 11, color: '#9e8e7a', marginTop: 2 }}>{a.note}</div>}
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  title="Delete this entry"
                  style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: 12, cursor: 'pointer', padding: 2, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
            {busy.length === 0 && <p style={{ fontSize: 13, color: '#9e8e7a' }}>No busy dates set.</p>}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Free Dates ({free.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {free.map(a => (
              <div key={a.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: a.vendor_id ? '#15803d' : '#0e7490', marginTop: 2 }}>{vendorName(a.vendor_id)}</div>
                  {a.note && <div style={{ fontSize: 11, color: '#9e8e7a', marginTop: 2 }}>{a.note}</div>}
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  title="Delete this entry"
                  style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: 12, cursor: 'pointer', padding: 2, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
            {free.length === 0 && <p style={{ fontSize: 13, color: '#9e8e7a' }}>No free dates set.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}