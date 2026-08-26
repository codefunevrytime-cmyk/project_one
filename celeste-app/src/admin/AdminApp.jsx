import { useState } from 'react';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem('adminToken'));

  const handleLogin = (t) => {
    localStorage.setItem('adminToken', t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
}