import { useState } from 'react';
import AdminGallery from './AdminGallery';
import AdminReviews from './AdminReviews';
import AdminBookings from './AdminBookings';
import AdminAvailability from './AdminAvailability';
import AdminQueries from './AdminQueries';
import AdminVendors from './AdminVendors';
import AdminVendorApplications from './AdminVendorApplications';

const MENU = [
  { id: 'gallery',      label: 'Gallery',             icon: '🖼' },
  { id: 'vendors',      label: 'Vendors',              icon: '👥' },
  { id: 'vendor-apps',  label: 'Vendor Applications',  icon: '📋' },
  { id: 'reviews',      label: 'Reviews',              icon: '⭐' },
  { id: 'bookings',     label: 'Bookings',             icon: '📅' },
  { id: 'availability', label: 'Availability',         icon: '🗓' },
  { id: 'queries',      label: 'Queries',              icon: '💬' },
];

export default function AdminDashboard({ onLogout }) {
  const [active, setActive] = useState('gallery');

  const renderPage = () => {
    switch(active) {
      case 'gallery':      return <AdminGallery />;
      case 'vendors':      return <AdminVendors />;
      case 'vendor-apps':  return <AdminVendorApplications />;
      case 'reviews':      return <AdminReviews />;
      case 'bookings':     return <AdminBookings />;
      case 'availability': return <AdminAvailability />;
      case 'queries':      return <AdminQueries />;
      default:             return <AdminGallery />;
    }
  };

  return (
    <div className="admin-layout" style={{ display: 'flex', height: '100vh', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#1a1008', padding: '24px 0',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        height: '100vh', overflow: 'hidden',
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: '#ffa01e' }}>Lumière</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Admin Panel</div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
          {MENU.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, border: 'none',
                background: active === item.id ? 'rgba(255,160,30,0.15)' : 'transparent',
                color: active === item.id ? '#ffa01e' : 'rgba(255,255,255,0.6)',
                fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                marginBottom: 4, textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Vendor Portal Link */}
          <a
            href="/vendor/login"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              border: '1px solid rgba(76,138,255,0.2)',
              background: 'rgba(56,100,220,0.08)',
              color: 'rgba(120,160,255,0.7)', fontSize: 12,
              fontFamily: 'inherit', textDecoration: 'none',
              marginBottom: 8,
            }}
          >
            <span>🔗</span> Vendor Portal ↗
          </a>
          <button
            onClick={onLogout}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'inherit',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f7f5f2', overflowY: 'auto', height: '100vh' }}>
        <div style={{ padding: 32 }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
