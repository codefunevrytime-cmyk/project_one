import { useVendorAuth } from '../context/VendorAuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('vendor_token');

const C = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 36 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 },
  card: {
    background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)',
    borderRadius: 14, padding: '22px 24px',
  },
  cardLabel: { fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.4)', marginBottom: 10 },
  cardNum: { fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 300, color: '#e8eef8', lineHeight: 1 },
  cardSub: { fontSize: 11, color: 'rgba(160,180,220,0.3)', marginTop: 5 },
  section: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.12)', borderRadius: 14, padding: '24px 26px', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 500, color: '#c8d8f8', marginBottom: 18 },
  quickLink: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
    border: '1px solid rgba(56,100,220,0.12)',
    background: 'rgba(20,30,60,0.4)', marginBottom: 10,
    transition: 'border-color 0.2s, background 0.2s', textDecoration: 'none',
  },
  quickIcon: {
    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(56,100,220,0.12)', border: '1px solid rgba(56,100,220,0.2)',
  },
  quickLabel: { fontSize: 13, color: '#c8d8f8', fontWeight: 500 },
  quickSub: { fontSize: 11, color: 'rgba(160,180,220,0.35)', marginTop: 2 },
};

export default function VendorDashboard() {
  const { vendorUser } = useVendorAuth();
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetch(`${API}/vendor-auth/enquiries`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setEnquiries(Array.isArray(d) ? d : [])).catch(() => {});

    fetch(`${API}/vendor-auth/profile`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setProfile(d)).catch(() => {});
  }, []);

  const firstName = vendorUser?.name?.split(' ')[0] || 'Vendor';
  const portfolioCount = profile?.portfolio?.length || 0;
  const pendingEnquiries = enquiries.filter(e => !e.replied).length;

  const quickLinks = [
    { to: '/vendor/profile',      label: 'Complete your profile',  sub: 'Add location, pricing, bio and services', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
    { to: '/vendor/portfolio',    label: 'Upload portfolio',        sub: 'Add photos, albums and videos of your work', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { to: '/vendor/availability', label: 'Set your availability',   sub: 'Mark busy and free dates for bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { to: '/vendor/enquiries',    label: 'View enquiries',          sub: `${pendingEnquiries} new messages waiting`, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  ];

  return (
    <div>
      <div style={C.heading}>Good morning, <em style={{ fontStyle: 'italic', color: '#4c8aff' }}>{firstName}</em></div>
      <div style={C.sub}>Here's an overview of your vendor account</div>

      {/* Stats */}
      <div style={C.grid}>
        {[
          { label: 'Portfolio Photos', num: portfolioCount, sub: 'Uploaded to your profile' },
          { label: 'New Enquiries',    num: pendingEnquiries, sub: 'Awaiting your reply' },
          { label: 'Total Enquiries',  num: enquiries.length, sub: 'All time received' },
        ].map(({ label, num, sub }) => (
          <div key={label} style={C.card}>
            <div style={C.cardLabel}>{label}</div>
            <div style={C.cardNum}>{num}</div>
            <div style={C.cardSub}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={C.section}>
        <div style={C.sectionTitle}>Quick actions</div>
        {quickLinks.map(({ to, label, sub, icon }) => (
          <div
            key={to}
            style={C.quickLink}
            onClick={() => navigate(to)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(76,138,255,0.35)'; e.currentTarget.style.background = 'rgba(30,50,100,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(56,100,220,0.12)'; e.currentTarget.style.background = 'rgba(20,30,60,0.4)'; }}
          >
            <div style={C.quickIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(76,138,255,0.8)" strokeWidth="1.6">
                <path d={icon} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={C.quickLabel}>{label}</div>
              <div style={C.quickSub}>{sub}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(100,140,220,0.3)" strokeWidth="1.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ))}
      </div>

      {/* Account status */}
      <div style={{ ...C.section, borderColor: 'rgba(76,200,100,0.2)', background: 'rgba(20,50,25,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf6f', boxShadow: '0 0 8px #4caf6f' }} />
          <span style={{ fontSize: 13, color: '#6ed496', fontWeight: 500 }}>Account active</span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(140,200,160,0.5)', marginTop: 6, lineHeight: 1.6 }}>
          Your profile is live and visible to clients on the main site. Keep your availability updated for accurate bookings.
        </p>
      </div>
    </div>
  );
}
