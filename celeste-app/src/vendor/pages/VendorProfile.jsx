import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('vendor_token');

const EVENT_TYPES = ['Bridal', 'Pre-Wedding', 'Mehndi', 'Sangeet', 'Reception', 'Birthday', 'Corporate', 'Other'];
const SERVICES = ['Candid Photography', 'Traditional Photography', 'Wedding Films', 'Pre-Wedding Shoots', 'Drone Shots', 'Photo Booth', 'Live Screening', 'Albums', 'Reels/Shorts'];

const S = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 32 },
  card: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '26px 28px', marginBottom: 20 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#c8d8f8', marginBottom: 20, letterSpacing: '0.04em' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.4)', marginBottom: 7 },
  input: {
    width: '100%', background: 'rgba(20,30,60,0.5)', border: '1px solid rgba(56,100,220,0.18)',
    borderRadius: 9, padding: '11px 14px', fontSize: 13, color: '#e8eef8',
    fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%', background: 'rgba(20,30,60,0.5)', border: '1px solid rgba(56,100,220,0.18)',
    borderRadius: 9, padding: '11px 14px', fontSize: 13, color: '#e8eef8',
    fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
    resize: 'vertical', minHeight: 90, transition: 'border-color 0.2s',
  },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
    border: '1px solid rgba(56,100,220,0.18)', background: 'transparent',
    color: 'rgba(160,180,220,0.45)', fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.15s', margin: '0 6px 8px 0',
  },
  pillActive: { background: 'rgba(56,100,220,0.2)', border: '1px solid rgba(76,138,255,0.45)', color: '#a0c0ff' },
  priceGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  priceCard: {
    background: 'rgba(20,30,60,0.4)', border: '1px solid rgba(56,100,220,0.12)',
    borderRadius: 10, padding: '12px 14px',
  },
  priceLabel: { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.35)', marginBottom: 8 },
  priceInput: {
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: '1px solid rgba(56,100,220,0.2)', padding: '4px 0',
    fontSize: 18, color: '#4c8aff', fontFamily: "'Cormorant Garamond', serif",
    fontWeight: 300, outline: 'none', boxSizing: 'border-box',
  },
  saveBtn: {
    padding: '11px 28px', background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)',
    border: 'none', borderRadius: 9, color: '#e8f0ff', fontSize: 13, fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', letterSpacing: '0.04em',
    boxShadow: '0 6px 24px rgba(42,74,170,0.35)',
  },
  success: {
    background: 'rgba(40,120,70,0.15)', border: '1px solid rgba(60,180,100,0.25)',
    borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#6ed496', marginBottom: 16,
  },
};

const fi = e => { e.target.style.borderColor = 'rgba(76,138,255,0.4)'; };
const fo = e => { e.target.style.borderColor = 'rgba(56,100,220,0.18)'; };

export default function VendorProfile() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '', specialty: '', contact: '', location: '',
    bio: '', travel_info: '', delivery_time: '', payment_terms: '',
    services: [], event_types: [],
    prices: {},
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fetchProfile = () => {
    fetch(`${API}/vendor-auth/profile`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        const v = data.vendor;
        if (v) {
          setForm({
            name: v.name || '',
            specialty: v.specialty || '',
            contact: v.contact || '',
            location: v.location || '',
            bio: v.bio || '',
            travel_info: v.travel_info || '',
            delivery_time: v.delivery_time || '',
            payment_terms: v.payment_terms || '',
            services: v.services || [],
            event_types: v.event_types || [],
            prices: v.prices || {},
          });
          if (v.photo_url) setPhotoPreview(v.photo_url);
        }
      }).catch(() => {});
  };

  useEffect(() => { fetchProfile(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleArr = (k, val) => setForm(f => {
    const arr = f[k] || [];
    return { ...f, [k]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
  });
  const setPrice = (type, val) => setForm(f => ({ ...f, prices: { ...f.prices, [type]: val } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'prices' || k === 'services' || k === 'event_types') {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, v);
        }
      });
      if (photoFile) fd.append('photo', photoFile);

      await fetch(`${API}/vendor-auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchProfile();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <div>
      <div style={S.heading}>My Profile</div>
      <div style={S.sub}>This information appears on your public profile page</div>
      {success && <div style={S.success}>{success}</div>}

      {/* Basic Info */}
      <div style={S.card}>
        <div style={S.cardTitle}>Basic Information</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(76,138,255,0.3)', background: 'rgba(20,30,60,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoPreview ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(76,138,255,0.4)" strokeWidth="1.4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8" strokeLinecap="round"/></svg>}
            </div>
            <label style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#4c8aff', cursor: 'pointer', textAlign: 'center' }}>
              Change photo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.row}>
              <div style={S.field}><label style={S.label}>Studio / Business name</label><input style={S.input} value={form.name} onChange={set('name')} onFocus={fi} onBlur={fo} placeholder="Golden Hour Studios" /></div>
              <div style={S.field}><label style={S.label}>Location / City</label><input style={S.input} value={form.location} onChange={set('location')} onFocus={fi} onBlur={fo} placeholder="Lucknow, Uttar Pradesh" /></div>
            </div>
            <div style={S.row}>
              <div style={S.field}><label style={S.label}>Specialty</label><input style={S.input} value={form.specialty} onChange={set('specialty')} onFocus={fi} onBlur={fo} placeholder="Wedding & Pre-Wedding Photography" /></div>
              <div style={S.field}><label style={S.label}>Contact number</label><input style={S.input} value={form.contact} onChange={set('contact')} onFocus={fi} onBlur={fo} placeholder="+91 98765 43210" /></div>
            </div>
          </div>
        </div>
        <div style={S.field}>
          <label style={S.label}>About / Bio</label>
          <textarea style={S.textarea} value={form.bio} onChange={set('bio')} onFocus={fi} onBlur={fo} placeholder="Tell clients about your photography style, experience and what makes your work unique..." rows={4} />
        </div>
      </div>

      {/* Services offered */}
      <div style={S.card}>
        <div style={S.cardTitle}>Services Offered</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {SERVICES.map(s => (
            <button key={s} style={{ ...S.pill, ...(form.services.includes(s) ? S.pillActive : {}) }} onClick={() => toggleArr('services', s)}>
              {form.services.includes(s) && <span style={{ fontSize: 10 }}>✓</span>}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Event Types + Pricing */}
      <div style={S.card}>
        <div style={S.cardTitle}>Event Types & Pricing</div>
        <p style={{ fontSize: 12, color: 'rgba(160,180,220,0.35)', marginBottom: 16 }}>Select event types you cover and set your price for each</p>
        <div style={S.priceGrid}>
          {EVENT_TYPES.map(type => {
            const selected = form.event_types.includes(type);
            return (
              <div key={type} style={{ ...S.priceCard, borderColor: selected ? 'rgba(76,138,255,0.3)' : 'rgba(56,100,220,0.1)', opacity: selected ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={S.priceLabel}>{type}</div>
                  <button onClick={() => toggleArr('event_types', type)} style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${selected ? '#4c8aff' : 'rgba(56,100,220,0.3)'}`, background: selected ? '#4c8aff' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 13, color: 'rgba(160,180,220,0.4)' }}>₹</span>
                  <input
                    style={{ ...S.priceInput, color: selected ? '#4c8aff' : 'rgba(76,138,255,0.3)' }}
                    placeholder="0"
                    value={form.prices[type] || ''}
                    onChange={e => setPrice(type, e.target.value)}
                    disabled={!selected}
                    type="number"
                  />
                  <span style={{ fontSize: 11, color: 'rgba(160,180,220,0.3)' }}>/ day</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Info */}
      <div style={S.card}>
        <div style={S.cardTitle}>Additional Details</div>
        <div style={S.row}>
          <div style={S.field}><label style={S.label}>Travel info</label><input style={S.input} value={form.travel_info} onChange={set('travel_info')} onFocus={fi} onBlur={fo} placeholder="Pan-India travel available, outstation stay by client" /></div>
          <div style={S.field}><label style={S.label}>Delivery time</label><input style={S.input} value={form.delivery_time} onChange={set('delivery_time')} onFocus={fi} onBlur={fo} placeholder="2–3 weeks after event" /></div>
        </div>
        <div style={S.field}><label style={S.label}>Payment terms</label><input style={S.input} value={form.payment_terms} onChange={set('payment_terms')} onFocus={fi} onBlur={fo} placeholder="Upto 25% advance, balance before delivery" /></div>
      </div>

      <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </div>
  );
}
