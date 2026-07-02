// celeste-app/src/admin/pages/AdminDashboard.jsx

import { useState } from 'react';
import AdminGallery from './AdminGallery';
import AdminReviews from './AdminReviews';
import AdminAvailability from './AdminAvailability';
import AdminQueries from './AdminQueries';
import AdminVendors from './AdminVendors';
import AdminVendorApplications from './AdminVendorApplications';
import AdminEventRequests from './AdminEventRequests';
import NotificationBell from '../components/NotificationBell';
import AdminMessages from './AdminMessages';
import '../admin-theme.css';


const MENU = [
  { id: 'gallery',      label: 'Gallery',             icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'vendors',      label: 'Vendors',              icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'vendor-apps',  label: 'Vendor Applications',  icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'events',       label: 'Event Requests',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'reviews',      label: 'Reviews',              icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { id: 'availability', label: 'Availability',         icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'queries',      label: 'Queries',              icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { id: 'messages',     label: 'Messages',             icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

const SECTION_LABELS = {
  gallery: 'Gallery', vendors: 'Vendors', 'vendor-apps': 'Vendor Applications',
  reviews: 'Reviews', availability: 'Availability',
  queries: 'Queries', messages: 'Messages', events: 'Event Requests',
};

export default function AdminDashboard({ onLogout }) {
  const [active, setActive] = useState('gallery');

  const renderPage = () => {
    switch (active) {
      case 'gallery':      return <AdminGallery />;
      case 'vendors':      return <AdminVendors />;
      case 'vendor-apps':  return <AdminVendorApplications />;
      case 'reviews':      return <AdminReviews />;
      case 'availability': return <AdminAvailability />;
      case 'queries':      return <AdminQueries />;
      case 'messages':     return <AdminMessages />;
      case 'events':       return <AdminEventRequests />;
      default:             return <AdminGallery />;
    }
  };

  return (
    <div className="admin-layout" style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      background: '#f0f0f7',
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        minWidth: 240,
        maxWidth: 240,
        flexShrink: 0,
        height: '100vh',
        background: '#fff',
        borderRight: '1px solid #e8e8f0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(75,73,172,0.06)',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #f0f0f7',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #4B49AC, #7978E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(75,73,172,0.35)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="#fff"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2d2d6b', whiteSpace: 'nowrap' }}>Lumière</div>
            <div style={{ fontSize: 10, color: '#7978E9', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 10px' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#b0b0cc',
            padding: '8px 10px 6px', whiteSpace: 'nowrap',
          }}>
            Main Menu
          </div>

          {MENU.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #4B49AC, #7978E9)' : 'transparent',
                  color: isActive ? '#fff' : '#6c6c9a',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  marginBottom: 2,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 4px 15px rgba(75,73,172,0.3)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f0f0f7';
                    e.currentTarget.style.color = '#4B49AC';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6c6c9a';
                  }
                }}
              >
                <svg
                  width="16" height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d={item.icon} />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '10px', borderTop: '1px solid #f0f0f7', flexShrink: 0 }}>
          <a
            href="/vendor/login"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8,
              background: '#f0f0f7', color: '#7978E9',
              fontSize: 12, fontWeight: 500, textDecoration: 'none',
              marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
            Vendor Portal ↗
          </a>
          <button
            onClick={onLogout}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: '1px solid #fecaca', background: '#fef2f2',
              color: '#ef4444', fontSize: 12, fontFamily: 'inherit',
              fontWeight: 500, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: 62, flexShrink: 0,
          background: '#fff',
          borderBottom: '1px solid #e8e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px',
          boxShadow: '0 2px 8px rgba(75,73,172,0.04)',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#2d2d6b' }}>
              {SECTION_LABELS[active]}
            </div>
            <div style={{ fontSize: 11, color: '#b0b0cc', marginTop: 1 }}>
              Lumière Visual Studio · Admin
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NotificationBell onNavigate={(tab) => setActive(tab)} />
 
               <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, #4B49AC, #7978E9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 10px rgba(75,73,172,0.3)',
            }}>
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f0f0f7' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: '#b0b0cc' }}>
            <span>Admin</span>
            <span>›</span>
            <span style={{ color: '#4B49AC', fontWeight: 500 }}>{SECTION_LABELS[active]}</span>
          </div>

          {/* White card wrapper */}
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e8e8f0',
            padding: '24px 24px',
            boxShadow: '0 2px 12px rgba(75,73,172,0.06)',
            minHeight: 'calc(100vh - 180px)',
          }}>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}