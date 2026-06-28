// src/pages/CreateEventPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateEventPage1.css';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Engagement', 'Baby Shower', 'Anniversary', 'Other'];
const DECORATION_TYPES = ['Floral', 'Minimalist', 'Luxury', 'Rustic', 'Themed', 'None'];
const SERVICE_CATEGORIES = [
  { key: 'photography', label: 'Photography', icon: '📸', required: false },
  { key: 'videography', label: 'Videography', icon: '🎬', required: false },
  { key: 'catering', label: 'Catering', icon: '🍽', required: false },
  { key: 'entertainment', label: 'Entertainment', icon: '🎵', required: false },
  { key: 'decor', label: 'Decor', icon: '🌸', required: false },
];

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=Details, 2=Vendors, 3=Budget, 4=Review
  const [submitting, setSubmitting] = useState(false);
  const [vendorSearch, setVendorSearch] = useState({});
  const [vendorResults, setVendorResults] = useState({});
  const [searchLoading, setSearchLoading] = useState({});

  const [form, setForm] = useState({
    event_name: '',
    event_type: '',
    event_date: '',
    event_time: '',
    location: '',
    capacity: '',
    decoration_type: '',
  });

  // vendors: { photography: { vendor_id, vendor_user_id, business_name, quoted_price, service_type } | null, ... }
  const [selectedVendors, setSelectedVendors] = useState({});

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const subtotal = Object.values(selectedVendors).reduce((sum, v) => sum + (v?.quoted_price || 0), 0);
  const contingencyPct = 15;
  const contingency = Math.round(subtotal * contingencyPct / 100);
  const total = subtotal + contingency;
  const advance = Math.round(total * 0.30);

  // Search vendors by category

async function searchVendors(category, query) {
  setSearchLoading(s => ({ ...s, [category]: true }));
  try {
    const res = await fetch(`http://localhost:5000/api/vendors`);
    const allVendors = await res.json();

   const filtered = allVendors.filter(v => {
  if (!v.is_active) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    v.name?.toLowerCase().includes(q) ||
    v.specialty?.toLowerCase().includes(q) ||
    v.contact?.toLowerCase().includes(q)
  );
});

    setVendorResults(r => ({ ...r, [category]: filtered }));
  } catch {
    setVendorResults(r => ({ ...r, [category]: [] }));
  } finally {
    setSearchLoading(s => ({ ...s, [category]: false }));
  }
}

  function selectVendor(category, vendor) {
    setSelectedVendors(sv => ({ ...sv, [category]: { ...vendor, service_type: category } }));
    setVendorResults(r => ({ ...r, [category]: [] }));
    setVendorSearch(s => ({ ...s, [category]: '' }));
  }

  function removeVendor(category) {
    setSelectedVendors(sv => { const n = { ...sv }; delete n[category]; return n; });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const vendors = Object.values(selectedVendors).filter(Boolean).map(v => ({
        vendor_id: v.vendor_id || v.id,
        vendor_user_id: v.vendor_user_id,
        service_type: v.service_type,
        quoted_price: v.quoted_price,
      }));

      const res = await fetch(`${API}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, capacity: parseInt(form.capacity), budget_estimate: total, contingency_pct: contingencyPct, vendors })
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/my-events/${data.event.id}?submitted=1`);
      }
    } catch (err) {
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const step1Valid = form.event_name && form.event_type && form.event_date && form.location && form.capacity;

  return (
    <div className="ce-page">
      {/* Progress bar */}
      <div className="ce-progress">
        {['Event Details', 'Choose Vendors', 'Budget', 'Review & Submit'].map((label, i) => (
          <div key={i} className={`ce-progress-step ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
            <div className="ce-progress-dot">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="ce-card">

        {/* ── STEP 1: Event Details ── */}
        {step === 1 && (
          <div className="ce-step">
            <h2>Event Details</h2>
            <p className="ce-sub">Tell us about your event</p>

            <div className="ce-row">
              <div className="ce-field">
                <label>Event Name</label>
                <input value={form.event_name} onChange={e => updateForm('event_name', e.target.value)} placeholder="e.g. Meera & Rohan's Wedding" />
              </div>
              <div className="ce-field">
                <label>Event Type</label>
                <select value={form.event_type} onChange={e => updateForm('event_type', e.target.value)}>
                  <option value="">Select type</option>
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="ce-row">
              <div className="ce-field">
                <label>Date</label>
                <input type="date" value={form.event_date} onChange={e => updateForm('event_date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="ce-field">
                <label>Time</label>
                <input type="time" value={form.event_time} onChange={e => updateForm('event_time', e.target.value)} />
              </div>
            </div>

            <div className="ce-field">
              <label>Venue / Location</label>
              <input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="e.g. Rosewood Estate, Lucknow" />
            </div>

            <div className="ce-row">
              <div className="ce-field">
                <label>Guest Count</label>
                <input type="number" value={form.capacity} onChange={e => updateForm('capacity', e.target.value)} placeholder="e.g. 250" min="1" />
              </div>
              <div className="ce-field">
                <label>Decoration Style</label>
                <select value={form.decoration_type} onChange={e => updateForm('decoration_type', e.target.value)}>
                  <option value="">Select style</option>
                  {DECORATION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="ce-actions">
              <button className="ce-btn-primary" disabled={!step1Valid} onClick={() => setStep(2)}>
                Continue to Vendors →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Choose Vendors ── */}
        {step === 2 && (
          <div className="ce-step">
            <h2>Choose Your Vendors</h2>
            <p className="ce-sub">Add vendors for each service you need. All are optional.</p>

            {SERVICE_CATEGORIES.map(({ key, label, icon }) => (
              <div key={key} className="ce-vendor-category">
                <div className="ce-vendor-cat-header">
                  <span>{icon} {label}</span>
                  {selectedVendors[key] && (
                    <span className="ce-vendor-selected-badge">✓ Selected</span>
                  )}
                </div>

                {selectedVendors[key] ? (
                  <div className="ce-vendor-chip">
                    <div className="ce-vendor-chip-info">
                      <strong>{selectedVendors[key].business_name || selectedVendors[key].name}</strong>
                      <span>₹{(selectedVendors[key].quoted_price || 0).toLocaleString('en-IN')}/day</span>
                    </div>
                    <button className="ce-vendor-remove" onClick={() => removeVendor(key)}>✕ Remove</button>
                  </div>
                ) : (
                  <div className="ce-vendor-search-box">
                    <div className="ce-vendor-search-row">
                      <input
                        value={vendorSearch[key] || ''}
                        onChange={e => {
                          setVendorSearch(s => ({ ...s, [key]: e.target.value }));
                          if (e.target.value.length > 1) searchVendors(key, e.target.value);
                          else setVendorResults(r => ({ ...r, [key]: [] }));
                        }}
                        placeholder={`Search ${label} vendors…`}
                      />
                      <button className="ce-search-btn" onClick={() => searchVendors(key, vendorSearch[key])}>
                        {searchLoading[key] ? '…' : 'Search'}
                      </button>
                    </div>
                    {vendorResults[key]?.length > 0 && (
                      <div className="ce-vendor-results">
                        {vendorResults[key].map(v => (
                          <div key={v.vendor_user_id || v.id} className="ce-vendor-result-row" onClick={() => selectVendor(key, v)}>
                            <div>
                              <strong>{v.business_name || v.name}</strong>
                              <span className="ce-vendor-location">{v.location}</span>
                            </div>
                            <span className="ce-vendor-price">₹{(v.quoted_price || 0).toLocaleString('en-IN')}/day</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {vendorResults[key]?.length === 0 && vendorSearch[key]?.length > 1 && !searchLoading[key] && (
                      <p className="ce-no-results">No vendors found. Try a different search.</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="ce-actions">
              <button className="ce-btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button
                className="ce-btn-primary"
                disabled={Object.keys(selectedVendors).length === 0}
                onClick={() => setStep(3)}
              >
                Continue to Budget →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Budget ── */}
        {step === 3 && (
          <div className="ce-step">
            <h2>Budget Estimate</h2>
            <p className="ce-sub">Based on your vendor selections</p>

            <div className="ce-budget-table">
              {SERVICE_CATEGORIES.map(({ key, label, icon }) =>
                selectedVendors[key] ? (
                  <div key={key} className="ce-budget-row">
                    <span>{icon} {label} — {selectedVendors[key].business_name || selectedVendors[key].name}</span>
                    <span>₹{(selectedVendors[key].quoted_price || 0).toLocaleString('en-IN')}</span>
                  </div>
                ) : null
              )}

              <div className="ce-budget-divider" />

              <div className="ce-budget-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="ce-budget-row muted">
                <span>Contingency ({contingencyPct}%)</span>
                <span>₹{contingency.toLocaleString('en-IN')}</span>
              </div>

              <div className="ce-budget-divider" />

              <div className="ce-budget-row total">
                <span>Total Estimate</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="ce-budget-row advance">
                <span>Advance due now (30%)</span>
                <span>₹{advance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="ce-budget-note">
              Final amount may vary. Advance is collected after admin approval and all vendors confirm availability.
            </p>

            <div className="ce-actions">
              <button className="ce-btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="ce-btn-primary" onClick={() => setStep(4)}>Review & Submit →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Submit ── */}
        {step === 4 && (
          <div className="ce-step">
            <h2>Review Your Event</h2>
            <p className="ce-sub">Everything look right? Submit to start the booking process.</p>

            <div className="ce-review-section">
              <h3>Event Details</h3>
              <div className="ce-review-grid">
                <span>Name</span><span>{form.event_name}</span>
                <span>Type</span><span>{form.event_type}</span>
                <span>Date</span><span>{form.event_date} {form.event_time && `at ${form.event_time}`}</span>
                <span>Venue</span><span>{form.location}</span>
                <span>Guests</span><span>{form.capacity}</span>
                {form.decoration_type && <><span>Decor</span><span>{form.decoration_type}</span></>}
              </div>
            </div>

            <div className="ce-review-section">
              <h3>Vendors</h3>
              {Object.values(selectedVendors).map(v => (
                <div key={v.service_type} className="ce-review-vendor-row">
                  <span>{v.service_type}</span>
                  <strong>{v.business_name || v.name}</strong>
                  <span>₹{(v.quoted_price || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="ce-review-section">
              <h3>Budget</h3>
              <div className="ce-review-grid">
                <span>Total Estimate</span><span>₹{total.toLocaleString('en-IN')}</span>
                <span>Advance (30%)</span><span>₹{advance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="ce-actions">
              <button className="ce-btn-secondary" onClick={() => setStep(3)}>← Back</button>
              <button className="ce-btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : '🎉 Submit Event Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
