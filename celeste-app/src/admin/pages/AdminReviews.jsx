import { useState, useEffect } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('adminToken');

export default function AdminReviews() {
  const [reviews,  setReviews]  = useState([]);
  const [vendors,  setVendors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [success,  setSuccess]  = useState('');

  // Filters
  const [filterVendor,  setFilterVendor]  = useState('');   // '' = all, 'site' = site-wide, or vendor id
  const [filterStatus,  setFilterStatus]  = useState('all'); // all | pending | approved

  // Add-review form
  const [form, setForm] = useState({
    client_name: '',
    message:     '',
    rating:      5,
    vendor_id:   '',   // '' = site-wide
  });

  // ── Fetch vendors for the filter dropdown ──────────────────────────────
  const fetchVendors = async () => {
    try {
      const res  = await fetch(`${API}/vendors`);
      const data = await res.json();
      setVendors(Array.isArray(data) ? data.filter(v => v.is_active) : []);
    } catch (err) { console.error(err); }
  };

  // ── Fetch reviews (with optional vendor_id param) ──────────────────────
  const fetchReviews = async () => {
    setLoading(true);
    try {
      let url = `${API}/reviews?all=true`;
      if (filterVendor && filterVendor !== 'site') {
        url += `&vendor_id=${filterVendor}`;
      }
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      let rows   = Array.isArray(data) ? data : [];

      // "site-wide" = reviews with no vendor_id
      if (filterVendor === 'site') {
        rows = rows.filter(r => !r.vendor_id);
      }

      setReviews(rows);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchVendors(); }, []);
  useEffect(() => { fetchReviews(); }, [filterVendor]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleApprove = async (id) => {
    await fetch(`${API}/reviews/${id}/approve`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchReviews();
    showSuccess('Review approved!');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    await fetch(`${API}/reviews/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchReviews();
    showSuccess('Review deleted.');
  };

  const handleAdd = async () => {
    if (!form.client_name.trim() || !form.message.trim()) {
      showSuccess('Name and message are required.');
      return;
    }
    await fetch(`${API}/reviews`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        client_name: form.client_name,
        message:     form.message,
        rating:      Number(form.rating),
        approved:    true,
        vendor_id:   form.vendor_id ? Number(form.vendor_id) : null,
      }),
    });
    setForm({ client_name: '', message: '', rating: 5, vendor_id: '' });
    showSuccess('Review added!');
    setTimeout(() => fetchReviews(), 400);
  };

  // ── Apply status filter client-side ───────────────────────────────────
  const displayed = reviews.filter(r => {
    if (filterStatus === 'pending')  return !r.approved;
    if (filterStatus === 'approved') return  r.approved;
    return true;
  });

  const pending  = displayed.filter(r => !r.approved);
  const approved = displayed.filter(r =>  r.approved);

  // ── Vendor label helper ───────────────────────────────────────────────
  const vendorLabel = (vendorId) => {
    if (!vendorId) return <span style={{ color: '#9e8e7a', fontStyle: 'italic' }}>Site-wide</span>;
    const v = vendors.find(v => v.id === Number(vendorId));
    return v
      ? <span style={{ color: '#c9a84c', fontWeight: 500 }}>{v.name}</span>
      : <span style={{ color: '#9e8e7a' }}>Vendor #{vendorId}</span>;
  };

  // ── Star display ──────────────────────────────────────────────────────
  const Stars = ({ rating }) => (
    <span style={{ color: '#c9a84c', letterSpacing: 1 }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  );

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>
          Reviews
        </h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>
          Manage per-vendor and site-wide reviews
        </p>
      </div>

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#15803d' }}>
          {success}
        </div>
      )}

      {/* ── Add Review Form ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 20 }}>Add Review Manually</h3>

        {/* Vendor selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Attach to vendor <span style={{ fontWeight: 400, color: '#c4b090', fontSize: 11 }}>(leave blank for site-wide)</span></label>
          <select
            value={form.vendor_id}
            onChange={e => setForm({ ...form, vendor_id: e.target.value })}
            style={inputStyle}
          >
            <option value="">— Site-wide (no vendor) —</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.specialty || 'Vendor'})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Client Name *</label>
            <input
              value={form.client_name}
              onChange={e => setForm({ ...form, client_name: e.target.value })}
              placeholder="e.g. Priya Sharma"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Rating</label>
            <select
              value={form.rating}
              onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
              style={inputStyle}
            >
              {[5, 4, 3, 2, 1].map(r => (
                <option key={r} value={r}>{'★'.repeat(r)} {r} star{r > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Review Message *</label>
          <textarea
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            placeholder="Write the review…"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
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

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>

        {/* Vendor filter */}
        <div>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 4 }}>Filter by vendor</label>
          <select
            value={filterVendor}
            onChange={e => setFilterVendor(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: 200 }}
          >
            <option value="">All reviews</option>
            <option value="site">Site-wide only</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label style={{ ...labelStyle, display: 'block', marginBottom: 4 }}>Status</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { val: 'all',      label: `All (${reviews.length})` },
              { val: 'pending',  label: `Pending (${reviews.filter(r => !r.approved).length})` },
              { val: 'approved', label: `Approved (${reviews.filter(r => r.approved).length})` },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setFilterStatus(opt.val)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid #e8e0d5',
                  background: filterStatus === opt.val ? '#1a1008' : '#f7f5f2',
                  color: filterStatus === opt.val ? '#ffa01e' : '#5a4a36',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Review lists ── */}
      {loading ? (
        <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading…</p>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>No reviews match this filter.</p>
        </div>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                  ⏳ Pending approval — {pending.length}
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map(r => (
                  <ReviewRow
                    key={r.id}
                    review={r}
                    vendorLabel={vendorLabel}
                    Stars={Stars}
                    onApprove={() => handleApprove(r.id)}
                    onDelete={() => handleDelete(r.id)}
                    isPending
                  />
                ))}
              </div>
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#065f46', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                  ✓ Approved — {approved.length}
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {approved.map(r => (
                  <ReviewRow
                    key={r.id}
                    review={r}
                    vendorLabel={vendorLabel}
                    Stars={Stars}
                    onDelete={() => handleDelete(r.id)}
                    isPending={false}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared review row ─────────────────────────────────────────────────────────
function ReviewRow({ review: r, vendorLabel, Stars, onApprove, onDelete, isPending }) {
  return (
    <div style={{
      background: isPending ? '#fffbeb' : '#fff',
      border:     `1px solid ${isPending ? '#fde68a' : '#e8e0d5'}`,
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Vendor badge */}
        <div style={{ marginBottom: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#9e8e7a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Vendor:</span>
          {vendorLabel(r.vendor_id)}
        </div>

        {/* Name + stars + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1008' }}>{r.client_name}</div>
          <Stars rating={r.rating} />
          <div style={{ fontSize: 11, color: '#c4b090' }}>
            {r.created_at
              ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : ''}
          </div>
        </div>

        {/* Message */}
        <div style={{ fontSize: 13, color: '#5a4a36', lineHeight: 1.6 }}>{r.message}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {isPending && onApprove && (
          <button
            onClick={onApprove}
            style={{ padding: '6px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#15803d', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ✓ Approve
          </button>
        )}
        <button
          onClick={onDelete}
          style={{ padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #e8e0d5', borderRadius: 8,
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
};
const labelStyle = {
  fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
  color: '#9e8e7a', display: 'block', marginBottom: 6,
};