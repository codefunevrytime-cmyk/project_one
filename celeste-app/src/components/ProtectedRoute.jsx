import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1612', color: '#c8af78', fontFamily: 'DM Sans, sans-serif' }}>
      Loading…
    </div>
  );
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}