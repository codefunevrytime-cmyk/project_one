import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config/api';
import { setVendorAccessToken, getVendorAccessToken, vendorFetch } from '../../lib/vendorApi'; // adjust path to wherever vendorApi.js actually lives

const VendorAuthContext = createContext(null);

const API = API_URL;

export function VendorAuthProvider({ children }) {
  const [vendorUser, setVendorUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // UPDATED: no more localStorage. On mount, silently try to trade the
  // HttpOnly refresh cookie for a fresh access token (this is what
  // "staying logged in across page reloads" now looks like — the access
  // token itself lives only in memory and is gone on every reload).
  useEffect(() => {
    fetch(`${API}/vendor-auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(async (data) => {
        setVendorAccessToken(data.token);
        const meRes = await vendorFetch(`${API}/vendor-auth/me`);
        const meData = await meRes.json();
        if (meData.user) setVendorUser(meData.user);
      })
      .catch(() => {
        setVendorAccessToken(null);
        setVendorUser(null);
      })
      .finally(() => setLoading(false));

    // vendorFetch() fires this if a refresh attempt itself fails
    // (refresh cookie expired/invalid/missing) — treat as signed out.
    const onExpired = () => setVendorUser(null);
    window.addEventListener('vendor-session-expired', onExpired);
    return () => window.removeEventListener('vendor-session-expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API}/vendor-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // needed so the refresh cookie set by the server is actually stored
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setVendorAccessToken(data.token);
    setVendorUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (name, email, password, phone, serviceCategory) => {
    const res  = await fetch(`${API}/vendor-auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password, phone, service_category: serviceCategory }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    setVendorAccessToken(data.token);
    setVendorUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    // Mark the vendor inactive/offline before clearing their session, so
    // VendorListingPage.jsx and AdminVendors.jsx immediately reflect that
    // they've signed out. Best-effort — a failed request still lets them
    // sign out locally.
    if (getVendorAccessToken()) {
      try {
        await vendorFetch(`${API}/vendor-auth/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_online: false }),
        });
      } catch {
        // ignore — still sign out locally below
      }
    }
    // Clears the HttpOnly refresh cookie server-side, so a silent
    // refresh can't bring this session back after sign-out.
    await fetch(`${API}/vendor-auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setVendorAccessToken(null);
    setVendorUser(null);
  }, []);

  const setOnlineStatus = useCallback(async (isOnline) => {
    if (!getVendorAccessToken()) return;
    const res  = await vendorFetch(`${API}/vendor-auth/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: isOnline }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getVendorAccessToken()) return;
    const res = await vendorFetch(`${API}/vendor-auth/me`);
    const data = await res.json();
    if (data.user) setVendorUser(data.user);
  }, []);

  return (
    <VendorAuthContext.Provider value={{ vendorUser, loading, login, signup, signOut, refreshUser, setOnlineStatus }}>
      {children}
    </VendorAuthContext.Provider>
  );
}

export function useVendorAuth() {
  const ctx = useContext(VendorAuthContext);
  if (!ctx) throw new Error('useVendorAuth must be used inside VendorAuthProvider');
  return ctx;
}

// REMOVED: the old exported `vendorToken()` helper (localStorage.getItem('vendor_token')).
// If anything else in the codebase imports { vendorToken } from this file, replace that
// import with { getVendorAccessToken } from vendorApi.js instead.
