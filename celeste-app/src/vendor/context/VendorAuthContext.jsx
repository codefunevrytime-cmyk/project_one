import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const VendorAuthContext = createContext(null);
const API = 'http://localhost:5000/api';
const TOKEN_KEY = 'vendor_token';

export function VendorAuthProvider({ children }) {
  const [vendorUser, setVendorUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    fetch(`${API}/vendor-auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.user) setVendorUser(data.user); else localStorage.removeItem(TOKEN_KEY); })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API}/vendor-auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    setVendorUser(data.user);
    return data;
  }, []);

  // ── UPDATED: signup now accepts serviceCategory ────────────────────────
  // This is sent to the backend as `service_category` so the /signup route
  // can create a linked `vendors` row with the correct service_id right
  // away, instead of leaving it NULL until (or unless) the vendor later
  // saves their profile.
  const signup = useCallback(async (name, email, password, phone, serviceCategory) => {
    const res  = await fetch(`${API}/vendor-auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, service_category: serviceCategory }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    setVendorUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setVendorUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const res = await fetch(`${API}/vendor-auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.user) setVendorUser(data.user);
  }, []);

  return (
    <VendorAuthContext.Provider value={{ vendorUser, loading, login, signup, signOut, refreshUser }}>
      {children}
    </VendorAuthContext.Provider>
  );
}

export function useVendorAuth() {
  const ctx = useContext(VendorAuthContext);
  if (!ctx) throw new Error('useVendorAuth must be used inside VendorAuthProvider');
  return ctx;
}

export function vendorToken() {
  return localStorage.getItem('vendor_token');
}