import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import { clearUserSession } from './authStorage';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const BOOKMARKS_KEY = 'celeste_bookmarks';
const TOKEN_KEY     = 'celeste_token';

function readBookmarkedEventIds() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function AuthProvider({ children }) {
  const [user,   setUser]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState(readBookmarkedEventIds);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  // Restore session from stored JWT on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarkedEventIds));
  }, [bookmarkedEventIds]);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API_BASE}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (firstName, lastName, email, password) => {
    const name = `${firstName} ${lastName}`.trim();
    const res  = await fetch(`${API_BASE}/api/auth/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    clearUserSession();
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
      { bg: '#fdf4e7', color: '#a16207' },
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
      setLoginPromptOpen(true);
      return false;
    }
    setBookmarkedEventIds(cur =>
      cur.includes(eventId) ? cur.filter(id => id !== eventId) : [eventId, ...cur]
    );
    return true;
  }, [user]);

  const closeLoginPrompt = useCallback(() => setLoginPromptOpen(false), []);

  const isBookmarked = useCallback(
    (eventId) => bookmarkedEventIds.includes(eventId),
    [bookmarkedEventIds]
  );

  const value = {
    user,
    loading,
    isLoggedIn: Boolean(user),
    bookmarkedEventIds,
    bookmarkCount: bookmarkedEventIds.length,
    login,
    signup,
    signOut,
    toggleBookmark,
    isBookmarked,
    loginPromptOpen,
    closeLoginPrompt,
    getInitials,
    avatarColor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}