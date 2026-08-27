// Frontend counterpart to vendor.js — same shape as adminApi.js.
// Wherever vendor-side components currently do
// localStorage.getItem('vendor_token'), swap to vendorFetch() instead.
//
// IMPORTANT: adjust this import path to match wherever this file actually
// lives relative to config/api.js — it must resolve the same way it does
// in VendorAuthContext.jsx. Using API_URL (not a hardcoded relative path)
// matters if frontend and backend run on different hosts/ports in dev.
import { API_URL } from '../../config/api';

let accessToken = null;
let refreshPromise = null;

export function setVendorAccessToken(t) {
  accessToken = t;
}

export function getVendorAccessToken() {
  return accessToken;
}

async function refreshVendorAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/vendor-auth/refresh`, {
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

export async function vendorFetch(url, options = {}) {
  const doFetch = (token) =>
    fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });

  let res = await doFetch(accessToken);

  if (res.status === 401) {
    try {
      const newToken = await refreshVendorAccessToken();
      res = await doFetch(newToken);
    } catch {
      accessToken = null;
      window.dispatchEvent(new Event('vendor-session-expired'));
      throw new Error('Session expired');
    }
  }

  return res;
}
