// Legacy localStorage keys from the pre-JWT auth flow. The app no longer
// writes user identity to localStorage at all — the access token lives in
// memory only (see AuthContext.jsx) and the session is restored via the
// HttpOnly refresh cookie. This file now only exists to clean up any
// leftover keys from that old flow on sign-out.
//
// REMOVED: syncUserFromUrl, readStoredUser, storeUserSession. They wrote
// plaintext name/email into localStorage and had no call sites left in
// AuthContext.jsx or anywhere else in the app — dead code that was also a
// latent insecure pattern (plaintext PII in localStorage, readable by any
// script on the page) if something were ever wired back up to them. If a
// future feature needs to persist identity client-side, it should go
// through a deliberate, reviewed mechanism rather than resurrecting these.
const USER_KEY  = 'celeste_user';
const EMAIL_KEY = 'celeste_email';

export function clearUserSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem('celeste_users'); // clean up the old insecure store
}