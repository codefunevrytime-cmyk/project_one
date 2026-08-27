import { useState, useEffect } from 'react';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { setAdminAccessToken } from "../lib/adminApi";
export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch('/api/admin/refresh', { method: 'POST', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setAdminAccessToken(data.token);
        setLoggedIn(true);
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setCheckingSession(false));

    // adminFetch fires this when a refresh attempt itself fails
    // (refresh cookie expired/invalid) — bounce back to the login screen.
    const onExpired = () => setLoggedIn(false);
    window.addEventListener('admin-session-expired', onExpired);
    return () => window.removeEventListener('admin-session-expired', onExpired);
  }, []);

  const handleLogin = (t) => {
    setAdminAccessToken(t);
    setLoggedIn(true);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setAdminAccessToken(null);
    setLoggedIn(false);
  };

  if (checkingSession) {
    return null; // or a spinner
  }

  if (!loggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
}
