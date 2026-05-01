const USER_KEY = 'celeste_user';
const EMAIL_KEY = 'celeste_email';

// Pull user details out of the URL once after an auth redirect.
export function syncUserFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('user');
  const email = params.get('email') || '';

  if (!name) {
    return;
  }

  sessionStorage.setItem(USER_KEY, name);
  sessionStorage.setItem(EMAIL_KEY, email);
  window.history.replaceState({}, '', window.location.pathname);
}

// Read the current signed-in user from sessionStorage.
export function readStoredUser() {
  const name = sessionStorage.getItem(USER_KEY);

  if (!name) {
    return null;
  }

  return {
    name,
    email: sessionStorage.getItem(EMAIL_KEY) || '',
  };
}

// Save the signed-in user so refreshes keep the session UI.
export function storeUserSession(name, email = '') {
  sessionStorage.setItem(USER_KEY, name);
  sessionStorage.setItem(EMAIL_KEY, email);
}

// Clear the stored user during sign-out.
export function clearUserSession() {
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
}
