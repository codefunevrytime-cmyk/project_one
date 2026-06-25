const USER_KEY  = 'celeste_user';
const EMAIL_KEY = 'celeste_email';

export function syncUserFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const name   = params.get('user');
  const email  = params.get('email') || '';
  if (!name) return;
  localStorage.setItem(USER_KEY, name);
  localStorage.setItem(EMAIL_KEY, email);
  window.history.replaceState({}, '', window.location.pathname);
}

export function readStoredUser() {
  const name = localStorage.getItem(USER_KEY);
  if (!name) return null;
  return { name, email: localStorage.getItem(EMAIL_KEY) || '' };
}

export function storeUserSession(name, email = '') {
  localStorage.setItem(USER_KEY, name);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearUserSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem('celeste_users'); // clean up the old insecure store
}