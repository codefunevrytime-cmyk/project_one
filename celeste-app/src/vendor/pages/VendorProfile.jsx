import { useState, useEffect } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('vendor_token');

// ─── Service category definitions ───────────────────────────────────────────
const SERVICE_CONFIGS = {
  photography: {
    label: 'Photography & Videography',
    icon: '📷',
    accentColor: '#4c8aff',
    specialtyPlaceholder: 'Wedding & Pre-Wedding Photography',
    bioPlaceholder: 'Tell clients about your photography style, experience and what makes your work unique...',
    services: ['Candid Photography', 'Traditional Photography', 'Wedding Films', 'Pre-Wedding Shoots', 'Drone Shots', 'Photo Booth', 'Live Screening', 'Albums', 'Reels/Shorts'],
    priceUnit: '/ day',
    extraFields: [
      { key: 'delivery_time', label: 'Delivery time',  placeholder: '2–3 weeks after event' },
      { key: 'travel_info',   label: 'Travel info',    placeholder: 'Pan-India travel, outstation stay by client' },
    ],
  },
  invitation: {
    label: 'Custom Invitations',
    icon: '✉️',
    accentColor: '#d4a843',
    specialtyPlaceholder: 'Luxury Wedding Stationery & Digital Invites',
    bioPlaceholder: 'Describe your design style, paper quality, printing techniques and customisation options...',
    services: ['Printed Cards', 'Digital Invites', 'Box Invitations', 'Scroll Invitations', 'Save the Date', 'Menu Cards', 'Thank You Cards', 'Custom Packaging', 'Calligraphy'],
    priceUnit: '/ 100 pcs',
    extraFields: [
      { key: 'delivery_time', label: 'Production time', placeholder: '7–10 days after design approval' },
      { key: 'travel_info',   label: 'Delivery area',   placeholder: 'Pan-India courier, overseas on request' },
    ],
  },
  decor: {
    label: 'Event Decoration',
    icon: '🌸',
    accentColor: '#e879a0',
    specialtyPlaceholder: 'Floral & Theme-based Wedding Décor',
    bioPlaceholder: 'Describe your signature style, materials used, setup team size and areas of expertise...',
    services: ['Floral Decoration', 'Stage Setup', 'Mandap Decoration', 'Table Centrepieces', 'Entrance Décor', 'Fairy Lights & Draping', 'Theme Decoration', 'Balloon Art', 'Car Decoration'],
    priceUnit: '/ event',
    extraFields: [
      { key: 'travel_info',   label: 'Coverage area',   placeholder: 'Lucknow & NCR, outstation on request' },
      { key: 'delivery_time', label: 'Setup lead time', placeholder: 'Minimum 2 days before event' },
    ],
  },
  catering: {
    label: 'Catering & Food',
    icon: '🍽️',
    accentColor: '#f97316',
    specialtyPlaceholder: 'Multi-cuisine Wedding Banquets & Live Counters',
    bioPlaceholder: 'Describe your cuisine expertise, kitchen hygiene standards, team size and signature dishes...',
    services: ['Veg Catering', 'Non-Veg Catering', 'Live Counters', 'Dessert Stations', 'Cocktail Catering', 'Breakfast Buffet', 'High Tea', 'Food Trucks', 'Cake & Baking'],
    priceUnit: '/ plate',
    extraFields: [
      { key: 'travel_info',   label: 'Service area',    placeholder: 'Lucknow & nearby districts' },
      { key: 'delivery_time', label: 'Advance booking', placeholder: 'Minimum 15 days before event' },
    ],
  },
  music: {
    label: 'Music & Entertainment',
    icon: '🎵',
    accentColor: '#a855f7',
    specialtyPlaceholder: 'Live Bands, DJs & Sangeet Performers',
    bioPlaceholder: 'Describe your musical repertoire, equipment quality, band size and performance experience...',
    services: ['DJ Services', 'Live Band', 'Dhol Players', 'Bagpipe Band', 'Ghazal Night', 'Folk Performers', 'Bollywood Night', 'Sound & Lighting', 'Emcee / Anchor'],
    priceUnit: '/ night',
    extraFields: [
      { key: 'travel_info',   label: 'Performance area',  placeholder: 'Pan-India travel, outstation with stay' },
      { key: 'delivery_time', label: 'Setup time needed', placeholder: '2–3 hours before event' },
    ],
  },
  makeup: {
    label: 'Makeup & Beauty',
    icon: '💄',
    accentColor: '#ec4899',
    specialtyPlaceholder: 'Bridal Makeup, Hair & Saree Draping',
    bioPlaceholder: 'Describe your makeup style, brands used, years of experience and signature bridal looks...',
    services: ['Bridal Makeup', 'Party Makeup', 'Hair Styling', 'Saree Draping', 'Mehendi', 'Airbrush Makeup', 'Pre-Bridal Packages', 'Groom Grooming', 'Group Packages'],
    priceUnit: '/ session',
    extraFields: [
      { key: 'travel_info',   label: 'Home visits',   placeholder: 'Available, travel charges extra' },
      { key: 'delivery_time', label: 'Trial session', placeholder: 'Recommended 2 weeks before' },
    ],
  },
  venue: {
    label: 'Venue & Banquet',
    icon: '🏛️',
    accentColor: '#14b8a6',
    specialtyPlaceholder: 'Luxury Banquet Halls & Farmhouse Venues',
    bioPlaceholder: 'Describe the venue capacity, amenities, parking, in-house catering policy and décor flexibility...',
    services: ['Indoor Banquet', 'Outdoor Lawn', 'Pool Venue', 'Terrace Venue', 'Hotel Venue', 'Farmhouse', 'Rooftop', 'Convention Centre', 'Heritage Property'],
    priceUnit: '/ day',
    extraFields: [
      { key: 'travel_info',   label: 'Location / Area', placeholder: 'Gomti Nagar, Lucknow' },
      { key: 'delivery_time', label: 'Booking advance',  placeholder: 'Minimum 1 month prior' },
    ],
  },
};

const DEFAULT_CONFIG = SERVICE_CONFIGS.photography;

// ─── Styles ──────────────────────────────────────────────────────────────────
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
  success: {
    background: 'rgba(40,120,70,0.15)', border: '1px solid rgba(60,180,100,0.25)',
    borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#6ed496', marginBottom: 16,
  },
};

const fi = e => { e.target.style.borderColor = 'rgba(76,138,255,0.4)'; };
const fo = e => { e.target.style.borderColor = 'rgba(56,100,220,0.18)'; };

// ─── Component ───────────────────────────────────────────────────────────────
export default function VendorProfile() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [serviceCategory, setServiceCategory] = useState(null);
  const [form, setForm] = useState({
    name: '', specialty: '', contact: '', location: '',
    bio: '', travel_info: '', delivery_time: '', payment_terms: '',
    services: [], prices: {},
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fetchProfile = () => {
    fetch(`${API}/vendor-auth/profile`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => {
        const v = data.vendor;
        if (v) {
          const cat = (v.service_category || v.category || 'photography').toLowerCase();
          setServiceCategory(cat);
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
            prices: v.prices || {},
          });
          if (v.photo_url) setPhotoPreview(v.photo_url);
        }
      }).catch(() => {});
  };

  useEffect(() => { fetchProfile(); }, []);

  const cfg = SERVICE_CONFIGS[serviceCategory] || DEFAULT_CONFIG;
  const accent = cfg.accentColor;

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // NOTE: this is the single toggle used by BOTH the "Services Offered"
  // pills and the "Pricing per Service" checkboxes below. Since they both
  // read/write the exact same `form.services` array, ticking either one
  // automatically reflects in the other — that's the sync the client asked
  // for ("when I click above service checkbox the below one should get
  // select automatically").
  const toggleArr = (k, val) => setForm(f => {
    const arr = f[k] || [];
    return { ...f, [k]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
  });

  const setPrice = (service, val) => setForm(f => ({ ...f, prices: { ...f.prices, [service]: val } }));

  // ── Average price shown publicly ────────────────────────────────────────
  // We ask the vendor for a detailed price per selected service, but the
  // public profile/listing pages only ever show ONE number
  // (vendor.price_per_day). So instead of exposing every sub-service price
  // to clients, we average the prices of whichever services the vendor has
  // ticked and selected a price for, and save that single number as
  // price_per_day. This keeps per-service pricing private/internal while
  // still driving the public "average price" figure.
  const avgPrice = (() => {
    const selectedPrices = form.services
      .map(s => Number(form.prices[s]))
      .filter(p => p > 0);
    if (selectedPrices.length === 0) return 0;
    const rawAvg = selectedPrices.reduce((a, b) => a + b, 0) / selectedPrices.length;
    // Round to the nearest multiple of 50 — e.g. 240 → 250, 210 → 200,
    // 225 → 250 (standard round-half-up). This is what gets displayed
    // publicly, so we round it right here before it's ever sent anywhere.
    return Math.round(rawAvg / 50) * 50;
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (['prices', 'services'].includes(k)) fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      // Send the computed average as price_per_day — this is what the
      // public profile page and listing cards actually display.
      fd.append('price_per_day', avgPrice);
      if (photoFile) fd.append('photo', photoFile);
      await fetch(`${API}/vendor-auth/profile`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token()}` }, body: fd,
      });
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchProfile();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={S.heading}>My Profile</div>
        {serviceCategory && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 20,
            background: `${accent}18`, border: `1px solid ${accent}44`,
            fontSize: 12, color: accent, fontWeight: 500, marginTop: 6,
          }}>
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
          </div>
        )}
      </div>
      <div style={S.sub}>This information appears on your public profile page</div>
      {success && <div style={S.success}>{success}</div>}

      {/* Basic Info */}
      <div style={S.card}>
        <div style={S.cardTitle}>Basic Information</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${accent}55`, background: 'rgba(20,30,60,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoPreview
                ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(76,138,255,0.4)" strokeWidth="1.4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8" strokeLinecap="round"/></svg>}
            </div>
            <label style={{ display: 'block', marginTop: 8, fontSize: 11, color: accent, cursor: 'pointer', textAlign: 'center' }}>
              Change photo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.row}>
              <div style={S.field}><label style={S.label}>Business name</label><input style={S.input} value={form.name} onChange={set('name')} onFocus={fi} onBlur={fo} placeholder="e.g. Golden Hour Studios" /></div>
              <div style={S.field}><label style={S.label}>Location / City</label><input style={S.input} value={form.location} onChange={set('location')} onFocus={fi} onBlur={fo} placeholder="Lucknow, Uttar Pradesh" /></div>
            </div>
            <div style={S.row}>
              <div style={S.field}><label style={S.label}>Specialty</label><input style={S.input} value={form.specialty} onChange={set('specialty')} onFocus={fi} onBlur={fo} placeholder={cfg.specialtyPlaceholder} /></div>
              <div style={S.field}><label style={S.label}>Contact number</label><input style={S.input} value={form.contact} onChange={set('contact')} onFocus={fi} onBlur={fo} placeholder="+91 98765 43210" /></div>
            </div>
          </div>
        </div>
        <div style={S.field}>
          <label style={S.label}>About / Bio</label>
          <textarea style={S.textarea} value={form.bio} onChange={set('bio')} onFocus={fi} onBlur={fo} placeholder={cfg.bioPlaceholder} rows={4} />
        </div>
      </div>

      {/* Services Offered — the single source of truth for which services
          are selected. Ticking a pill here is the exact same state as
          ticking the checkbox in "Pricing per Service" below. */}
      <div style={S.card}>
        <div style={S.cardTitle}>Services Offered</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {cfg.services.map(s => {
            const active = form.services.includes(s);
            return (
              <button key={s} onClick={() => toggleArr('services', s)} style={{
                ...S.pill,
                ...(active ? { background: `${accent}22`, border: `1px solid ${accent}88`, color: accent } : {}),
              }}>
                {active && <span style={{ fontSize: 10 }}>✓</span>}
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing per Service — replaces the old "Event Types & Pricing"
          section. Uses the exact same cfg.services list + form.services
          array as the "Services Offered" pills above, so both stay in
          sync automatically — no separate "event type" concept anymore. */}
      <div style={S.card}>
        <div style={S.cardTitle}>Pricing per Service</div>
        <p style={{ fontSize: 12, color: 'rgba(160,180,220,0.35)', marginBottom: 16, lineHeight: 1.6 }}>
          Tick a service to include it and set your rate ({cfg.priceUnit}). This checkbox is synced with
          "Services Offered" above — ticking either one selects both.
        </p>
        <div style={S.priceGrid}>
          {cfg.services.map(service => {
            const selected = form.services.includes(service);
            return (
              <div key={service} style={{ ...S.priceCard, borderColor: selected ? `${accent}55` : 'rgba(56,100,220,0.1)', opacity: selected ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={S.priceLabel}>{service}</div>
                  <button
                    onClick={() => toggleArr('services', service)}
                    style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${selected ? accent : 'rgba(56,100,220,0.3)'}`, background: selected ? accent : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    {selected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 13, color: 'rgba(160,180,220,0.4)' }}>₹</span>
                  <input
                    style={{ ...S.priceInput, color: selected ? accent : 'rgba(76,138,255,0.3)' }}
                    placeholder="0" value={form.prices[service] || ''}
                    onChange={e => setPrice(service, e.target.value)}
                    disabled={!selected} type="number"
                  />
                  <span style={{ fontSize: 11, color: 'rgba(160,180,220,0.3)' }}>{cfg.priceUnit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live preview of the average price that will be shown publicly */}
        {avgPrice > 0 ? (
          <div style={{
            marginTop: 20, padding: '14px 18px', borderRadius: 10,
            background: `${accent}12`, border: `1px solid ${accent}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'rgba(160,180,220,0.55)' }}>
              Average price shown to clients on your public profile
            </span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: accent }}>
              ₹{avgPrice.toLocaleString('en-IN')} <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: 'rgba(160,180,220,0.4)' }}>{cfg.priceUnit}</span>
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 20, fontSize: 12, color: 'rgba(160,180,220,0.3)' }}>
            Select at least one service and enter a price to calculate your public average price.
          </div>
        )}
      </div>

      {/* Additional details — dynamic labels */}
      <div style={S.card}>
        <div style={S.cardTitle}>Additional Details</div>
        <div style={S.row}>
          {cfg.extraFields.map(f => (
            <div key={f.key} style={S.field}>
              <label style={S.label}>{f.label}</label>
              <input style={S.input} value={form[f.key] || ''} onChange={set(f.key)} onFocus={fi} onBlur={fo} placeholder={f.placeholder} />
            </div>
          ))}
        </div>
        <div style={S.field}>
          <label style={S.label}>Payment terms</label>
          <input style={S.input} value={form.payment_terms} onChange={set('payment_terms')} onFocus={fi} onBlur={fo} placeholder="e.g. 25% advance, balance before delivery" />
        </div>
      </div>

      <button
        style={{
          padding: '11px 28px', border: 'none', borderRadius: 9, color: '#e8f0ff',
          fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
          cursor: 'pointer', letterSpacing: '0.04em',
          background: `linear-gradient(135deg, ${accent}bb, ${accent})`,
          boxShadow: `0 6px 24px ${accent}44`,
          opacity: saving ? 0.7 : 1,
        }}
        onClick={handleSave} disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </div>
  );
}