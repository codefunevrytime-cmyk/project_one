import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import {
  clearUserSession,
  readStoredUser,
  storeUserSession,
} from './authStorage';

const API_BASE = '';
const BOOKMARKS_KEY = 'celeste_bookmarks';

function readBookmarkedEventIds() {
  try {
    const rawValue = localStorage.getItem(BOOKMARKS_KEY);
    const parsedValue = JSON.parse(rawValue || '[]');

    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

async function parseAuthResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.errors?.[0]?.msg || fallbackMessage);
  }

  return data;
}

export function AuthProvider({ children }) {
  // Read the saved session once so the navbar knows whether a user is signed in.
  const [user, setUser] = useState(() => readStoredUser());
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState(() => readBookmarkedEventIds());

  // Persist bookmarked event ids so the saved list survives refreshes.
  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarkedEventIds));
  }, [bookmarkedEventIds]);

  // Reuse the "store session and update state" step for both login and signup.
  const finishAuthentication = useCallback((data) => {
    const nextUser = {
      name: data.name,
      email: data.email,
    };

    storeUserSession(nextUser.name, nextUser.email);
    setUser(nextUser);

    return data;
  }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember }),
    });
    const data = await parseAuthResponse(response, 'Login failed');

    return finishAuthentication(data);
  }, [finishAuthentication]);

  const signup = useCallback(async (firstName, lastName, email, password, phone = '', terms = true) => {
    const response = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword: password,
        terms: String(terms),
      }),
    });
    const data = await parseAuthResponse(response, 'Signup failed');

    return finishAuthentication(data);
  }, [finishAuthentication]);

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

    for (let index = 0; index < str.length; index += 1) {
      hash = str.charCodeAt(index) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }, []);

  const signOut = useCallback(() => {
    clearUserSession();
    setUser(null);

    // The UI can update immediately even if the backend logout request fails.
    fetch(`${API_BASE}/api/logout`, { method: 'POST' }).catch(() => null);
  }, []);

  const toggleBookmark = useCallback((eventId) => {
    setBookmarkedEventIds((currentIds) => (
      currentIds.includes(eventId)
        ? currentIds.filter((id) => id !== eventId)
        : [eventId, ...currentIds]
    ));
  }, []);

  const isBookmarked = useCallback(
    (eventId) => bookmarkedEventIds.includes(eventId),
    [bookmarkedEventIds],
  );

  const value = {
    user,
    isLoggedIn: Boolean(user),
    bookmarkedEventIds,
    bookmarkCount: bookmarkedEventIds.length,
    login,
    signup,
    signOut,
    toggleBookmark,
    isBookmarked,
    getInitials,
    avatarColor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
