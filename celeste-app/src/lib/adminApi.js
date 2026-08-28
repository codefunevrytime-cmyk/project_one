// Central fetch wrapper for all admin API calls.
// Handles attaching the access token and silently refreshing it on 401 —
// so AdminVendors.jsx, AdminGallery.jsx, AdminVendorPayouts.jsx etc. don't
// each need their own token/refresh logic.

import { API_URL } from '../config/api';

let accessToken = null;
let refreshPromise = null; // dedupes concurrent refreshes if multiple calls 401 at once

export function setAdminAccessToken(t) {
  accessToken = t;
}

export function getAdminAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/admin/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('refresh failed'))))
      .then((data) => {
        accessToken = data.token;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Use this instead of raw fetch() for every admin API call.
// Pass either a full URL or a path starting with '/api/...' — paths are
// automatically prefixed with API_URL, same convention as vendorApi.js.
export async function adminFetch(url, options = {}) {
  const fullUrl = url.startsWith('/') ? `${API_URL}${url}` : url;

  const doFetch = (token) =>
    fetch(fullUrl, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let res = await doFetch(accessToken);

  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      res = await doFetch(newToken);
    } catch {
      // Refresh cookie itself expired/invalid — force back to login.
      accessToken = null;
      window.dispatchEvent(new Event('admin-session-expired'));
      throw new Error('Session expired');
    }
  }

  return res;
}