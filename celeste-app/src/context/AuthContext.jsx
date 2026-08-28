import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthContext } from './auth-context';
import { clearUserSession } from './authStorage';

import { API_BASE } from '../config/api';
const BOOKMARKS_KEY = 'celeste_bookmarks';

// Access tokens are short-lived (15 min — see routes/auth.js). Refresh a
// bit before they actually expire so an in-progress session never trips
// a 401 out from under the user mid-action.
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000;
const REFRESH_MARGIN_MS = 60 * 1000;

function readBookmarkedEventIds() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function AuthProvider({ children }) {
  const [user,   setUser]   = useState(null);
  // The short-lived access token, kept in memory only (never localStorage —
  // it's attached as a Bearer header by callers, e.g. WriteReviewForm in
  // VendorProfilePage.jsx). Lost on a hard refresh by design; restored via
  // the refresh-cookie flow below.
  const [token,  setToken]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState(readBookmarkedEventIds);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [loginPromptReason, setLoginPromptReason] = useState('bookmark');

  const refreshTimerRef = useRef(null);

  const scheduleRefresh = useCallback((refreshFn) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(refreshFn, ACCESS_TOKEN_LIFETIME_MS - REFRESH_MARGIN_MS);
  }, []);

  // Mint a fresh access token from the HttpOnly refresh cookie
  // (POST /api/auth/refresh — see routes/auth.js). Used both on initial
  // mount (to restore a session across a page reload, now that the access
  // token itself isn't persisted) and on a timer to keep the session alive
  // past the 15-minute access-token lifetime.
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // sends the HttpOnly refresh cookie
      });
      if (!res.ok) {
        setToken(null);
        setUser(null);
        return null;
      }
      const data = await res.json();
      setToken(data.token);
      scheduleRefresh(refreshAccessToken);
      return data.token;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, [scheduleRefresh]);

  // Restore session on mount: refresh → get a fresh access token → fetch
  // the profile with it. Replaces the old direct GET /me + cookie
  // approach, which stopped working once /me required a Bearer header
  // (Lax cookies were never actually sent on this cross-origin fetch to
  // begin with — see the earlier trust-proxy/cookie discussion).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const accessToken = await refreshAccessToken();
      if (cancelled) return;
      if (!accessToken) { setLoading(false); return; }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!cancelled) setUser(res.ok && data.user ? data.user : null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarkedEventIds));
  }, [bookmarkedEventIds]);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API_BASE}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // lets the server set the refresh cookie
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    setToken(data.token);
    scheduleRefresh(refreshAccessToken);
    return data;
  }, [refreshAccessToken, scheduleRefresh]);

  const signup = useCallback(async (firstName, lastName, email, password) => {
    const name = `${firstName} ${lastName}`.trim();
    const res  = await fetch(`${API_BASE}/api/auth/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:    JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    setUser(data.user);
    setToken(data.token);
    scheduleRefresh(refreshAccessToken);
    return data;
  }, [refreshAccessToken, scheduleRefresh]);

  // Google Sign-In. Takes the ID token (credential) from the GoogleLogin
  // component and exchanges it for our own access+refresh pair, same
  // shape/response as login and signup above.
  const loginWithGoogle = useCallback(async (credential) => {
    const res  = await fetch(`${API_BASE}/api/auth/google`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:    JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
    setUser(data.user);
    setToken(data.token);
    scheduleRefresh(refreshAccessToken);
    return data;
  }, [refreshAccessToken, scheduleRefresh]);

  const signOut = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    clearUserSession();
    setToken(null);
    setUser(null);
  }, []);

  const getInitials = useCallback((name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }, []);

  const avatarColor = useCallback((str) => {
    const colors = [
      { bg: '#fff0d0', color: '#b45309' },
      { bg: '#fce7d6', color: '#c2410c' },
      { bg: '#fef3c7', color: '#92400e' },
      { bg: 'rgb(255 223 176)', color: '#a16207' },
      { bg: '#fff7e6', color: '#d97706' },
      { bg: '#fdebd0', color: '#b45309' },
      { bg: '#fef9ec', color: '#b45309' },
      { bg: '#fff3cd', color: '#9a3412' },
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Only logged-in users can bookmark; guests get a login prompt instead.
  // Returns true when the bookmark was toggled, false when blocked.
  const toggleBookmark = useCallback((eventId) => {
    if (!user) {
      setLoginPromptReason('bookmark');
      setLoginPromptOpen(true);
      return false;
    }
    setBookmarkedEventIds(cur =>
      cur.includes(eventId) ? cur.filter(id => id !== eventId) : [eventId, ...cur]
    );
    return true;
  }, [user]);

  const closeLoginPrompt = useCallback(() => setLoginPromptOpen(false), []);

  // Generic login gate other features (bookmark, vendor chat "Send
  // Message", "Write a Review", etc.) reuse so guests see the same modal,
  // just with copy tailored to why they were asked to log in. `reason`
  // is passed straight through as LoginPromptModal's `reason` prop —
  // any string LoginPromptModal's COPY table recognises works here
  // ('bookmark' | 'message' | 'review', currently).
  const openLoginPrompt = useCallback((reason = 'bookmark') => {
    setLoginPromptReason(reason);
    setLoginPromptOpen(true);
  }, []);

  const isBookmarked = useCallback(
    (eventId) => bookmarkedEventIds.includes(eventId),
    [bookmarkedEventIds]
  );

  // Convenience wrapper for authenticated API calls: attaches the current
  // access token and retries once after a silent refresh if the first
  // attempt comes back 401 (covers the case where the token expired
  // between page load and this call, before the proactive refresh timer
  // fired). Callers can keep passing their own Authorization header
  // manually (as VendorProfilePage.jsx currently does via the raw `token`
  // value) — this is just here for new call sites that want the retry
  // behaviour without reimplementing it.
  const authFetch = useCallback(async (url, options = {}) => {
    const doFetch = (bearerToken) => fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${bearerToken}` },
    });

    let res = await doFetch(token);
    if (res.status === 401) {
      const freshToken = await refreshAccessToken();
      if (freshToken) res = await doFetch(freshToken);
    }
    return res;
  }, [token, refreshAccessToken]);

  const value = {
    user,
    token,
    loading,
    isLoggedIn: Boolean(user),
    bookmarkedEventIds,
    bookmarkCount: bookmarkedEventIds.length,
    login,
    signup,
    loginWithGoogle,
    signOut,
    toggleBookmark,
    isBookmarked,
    loginPromptOpen,
    loginPromptReason,
    closeLoginPrompt,
    openLoginPrompt,
    getInitials,
    avatarColor,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}