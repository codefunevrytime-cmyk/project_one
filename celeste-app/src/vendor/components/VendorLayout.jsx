import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';

const NAV = [
  { to: '/vendor/dashboard',    label: 'Dashboard',    icon: 'M3 3h7v7H3zM13 3h7v7h-7zM3 13h7v7H3zM13 16a4 4 0 108 0 4 4 0 00-8 0' },
  { to: '/vendor/profile',      label: 'My Profile',   icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  { to: '/vendor/portfolio',    label: 'Portfolio',    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/vendor/availability', label: 'Availability', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/vendor/enquiries',    label: 'Enquiries',    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { to: '/vendor/messages', label: 'Messages', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { to: '/vendor/event-requests', label: 'Event Requests', icon: '📋' }
  

];

export default function VendorLayout({ children }) {
  const { vendorUser, signOut } = useVendorAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const initials = vendorUser?.name
    ? vendorUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'V';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080c14', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 220, flexShrink: 0,
        background: 'rgba(10,15,28,0.95)', backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(56,100,220,0.12)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.22s ease', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '22px 16px' : '22px 20px', borderBottom: '1px solid rgba(56,100,220,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #2a4aaa, #1a2870)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(76,138,255,0.3)',
          }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M10 2l1.8 5.5H18l-4.9 3.6 1.8 5.5L10 13l-4.9 3.6 1.8-5.5L2 7.5h6.2L10 2z" fill="#4c8aff"/>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: '#e8eef8', lineHeight: 1 }}>Lumière</div>
              <div style={{ fontSize: 9, color: 'rgba(160,180,220,0.4)', letterSpacing: '0.12em', marginTop: 2 }}>VENDOR</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed ? '10px 16px' : '10px 14px',
              borderRadius: 9, marginBottom: 2, textDecoration: 'none',
              color: isActive ? '#e8eef8' : 'rgba(160,180,220,0.45)',
              background: isActive ? 'rgba(56,100,220,0.18)' : 'transparent',
              borderLeft: isActive ? '2px solid #4c8aff' : '2px solid transparent',
              transition: 'all 0.15s', fontSize: 13, fontWeight: isActive ? 500 : 400,
              whiteSpace: 'nowrap', overflow: 'hidden',
            })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0 }}>
                <path d={icon} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + collapse */}
        <div style={{ borderTop: '1px solid rgba(56,100,220,0.1)', padding: '12px 8px' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 6 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: '#e8f0ff',
              }}>{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#c8d8f8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendorUser?.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(160,180,220,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendorUser?.email}</div>
              </div>
            </div>
          )}
          <button onClick={() => { signOut(); navigate('/vendor/login'); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '9px 16px' : '9px 10px',
            background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.15)',
            borderRadius: 8, color: 'rgba(220,100,100,0.7)', fontSize: 12,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'nowrap', overflow: 'hidden', marginBottom: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0 }}>
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && 'Sign out'}
          </button>
          <button onClick={() => setCollapsed(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
            padding: '8px 10px', background: 'none', border: 'none',
            color: 'rgba(160,180,220,0.25)', fontSize: 12, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ flexShrink: 0, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px 36px' }}>
        {children}
      </main>
    </div>
  );
}
