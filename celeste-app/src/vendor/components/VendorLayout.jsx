import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';
import VendorNotificationBell from './VendorNotificationBell';

import { API_URL } from '../../config/api';
import { vendorFetch } from '../../lib/vendorApi';

const API = API_URL;

const NAV = [
  { to: '/vendor/dashboard',      label: 'Dashboard',      icon: 'M3 3h7v7H3zM13 3h7v7h-7zM3 13h7v7H3zM13 16a4 4 0 108 0 4 4 0 00-8 0' },
  { to: '/vendor/profile',        label: 'My Profile',     icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  { to: '/vendor/portfolio',      label: 'Portfolio',      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/vendor/availability',   label: 'Availability',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/vendor/enquiries',      label: 'Enquiries',      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { to: '/vendor/messages',       label: 'Messages',       icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { to: '/vendor/deposit',        label: 'Security Deposit', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z' },
  { to: '/vendor/event-requests', label: 'Event Requests', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z' },
  { to: '/vendor/earnings',       label: 'Earnings',       icon: 'M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 9v1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/vendor/reviews',        label: 'Reviews',        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
];

// Service category → accent color + badge label, mirrors VendorProfile config
const CATEGORY_META = {
  photography: { label: 'Photography',  color: '#4c8aff', icon: '📷' },
  invitation:  { label: 'Invitations',  color: '#d4a843', icon: '✉️' },
  decor:       { label: 'Decoration',   color: '#e879a0', icon: '🌸' },
  catering:    { label: 'Catering',     color: '#f97316', icon: '🍽️' },
  music:       { label: 'Music',        color: '#a855f7', icon: '🎵' },
  makeup:      { label: 'Makeup',       color: '#ec4899', icon: '💄' },
  venue:       { label: 'Venue',        color: '#14b8a6', icon: '🏛️' },
};

export default function VendorLayout({ children }) {
  const { vendorUser, signOut, setOnlineStatus } = useVendorAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  // FIXED: was `fetch(url, { headers: { Authorization: \`Bearer
  // ${localStorage.getItem('vendor_token')}\` } })`. VendorAuthContext.jsx
  // never writes to localStorage anymore — the access token is kept in
  // memory only (see lib/vendorApi.js) and restored via the HttpOnly
  // refresh cookie. That key has been null since the refresh-token
  // migration, so this request was silently sending "Authorization:
  // Bearer null" and 401'ing every time, meaning `isOnline` (and, more
  // visibly, the service-category badge in the sidebar) never reflected
  // real vendor data. vendorFetch() attaches the real in-memory token and
  // retries once after a silent refresh on 401.
  useEffect(() => {
    vendorFetch(`${API}/vendor-auth/profile`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`profile fetch failed (${r.status})`))))
      .then(d => {
        if (d.vendor && typeof d.vendor.is_online === 'boolean') setIsOnline(d.vendor.is_online);
      })
      .catch(err => console.error('[VendorLayout] failed to load profile:', err));
  }, []);

  const toggleOnline = async () => {
    if (statusLoading) return;
    setStatusLoading(true);
    const next = !isOnline;
    try {
      await setOnlineStatus(next);
      setIsOnline(next);
    } catch {
      // keep previous UI state on failure — don't flip optimistically
    }
    setStatusLoading(false);
  };

  const initials = vendorUser?.name
    ? vendorUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'V';

  const rawCategory = (vendorUser?.service_category || vendorUser?.category || '').toLowerCase();
  const meta = CATEGORY_META[rawCategory] || null;

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

        {/* Service category badge */}
        {!collapsed && (
          <div style={{ padding: '12px 16px 0' }}>
            {meta ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 12px', borderRadius: 8,
                background: `${meta.color}16`, border: `1px solid ${meta.color}40`,
                fontSize: 11, color: meta.color, fontWeight: 500,
              }}>
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(220,60,60,0.1)', border: '1px solid rgba(220,60,60,0.3)',
                fontSize: 11, color: '#ff8080', fontWeight: 500,
              }}>
                <span>⚠️</span>
                <span>Category not set — contact admin</span>
              </div>
            )}
          </div>
        )}

        {/* Active / Inactive status toggle */}
        {!collapsed && (
          <div style={{ padding: '10px 16px 0' }}>
            <button
              onClick={toggleOnline}
              disabled={statusLoading}
              title={isOnline ? 'You are visible as Active to clients — tap to go Inactive' : 'You are hidden as Inactive — tap to go Active'}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8,
                cursor: statusLoading ? 'wait' : 'pointer',
                background: isOnline ? 'rgba(95,207,122,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${isOnline ? 'rgba(95,207,122,0.3)' : 'rgba(248,113,113,0.3)'}`,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: isOnline ? '#5fcf7a' : '#f87171' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isOnline ? '#5fcf7a' : '#f87171',
                  boxShadow: isOnline ? '0 0 6px #5fcf7a' : 'none',
                }} />
                {isOnline ? 'Active' : 'Inactive'}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(160,180,220,0.4)' }}>
                {statusLoading ? '…' : 'Tap to toggle'}
              </span>
            </button>
          </div>
        )}

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
          <button
            onClick={async () => { await signOut(); navigate('/vendor/login'); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '9px 16px' : '9px 10px',
              background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.15)',
              borderRadius: 8, color: 'rgba(220,100,100,0.7)', fontSize: 12,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              whiteSpace: 'nowrap', overflow: 'hidden', marginBottom: 6,
            }}
          >
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

      {/* Main column: top header + page content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top header bar — houses the notification bell */}
        <header style={{
          height: 64, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 14, padding: '0 36px',
          borderBottom: '1px solid rgba(56,100,220,0.1)',
          background: 'rgba(10,15,28,0.6)', backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <VendorNotificationBell />
        </header>

        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px 36px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}