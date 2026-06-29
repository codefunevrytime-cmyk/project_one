import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { VendorAuthProvider, useVendorAuth } from './context/VendorAuthContext';
import VendorLogin from './pages/VendorLogin';
import VendorSignup from './pages/VendorSignup';
import VendorDashboard from './pages/VendorDashboard';
import VendorProfile from './pages/VendorProfile';
import VendorPortfolio from './pages/VendorPortfolio';
import VendorAvailability from './pages/VendorAvailability';
import VendorEnquiries from './pages/VendorEnquiries';
import VendorLayout from './components/VendorLayout';
import VendorPending from './pages/VendorPending';
import VendorEventRequests from './pages/VendorEventRequests';
import VendorMessages from './pages/VendorMessages';



function ProtectedVendorRoute({ children }) {
  const { vendorUser, loading } = useVendorAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(140,180,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
      Loading…
    </div>
  );
  if (!vendorUser) return <Navigate to="/vendor/login" replace />;
  if (vendorUser.status === 'pending' || vendorUser.status === 'rejected') return <VendorPending />;
  return children;
}

function VendorRoutes() {
  const { vendorUser, loading } = useVendorAuth();
  if (loading) return null;

  return (
    <Routes>
  <Route path="/vendor/login"  element={vendorUser ? <Navigate to="/vendor/dashboard" replace /> : <VendorLogin />} />
  <Route path="/vendor/signup" element={vendorUser ? <Navigate to="/vendor/dashboard" replace /> : <VendorSignup />} />
  <Route path="/vendor/*" element={
    <ProtectedVendorRoute>
      <VendorLayout>
        <Routes>
          <Route path="dashboard"      element={<VendorDashboard />} />
          <Route path="profile"        element={<VendorProfile />} />
          <Route path="portfolio"      element={<VendorPortfolio />} />
          <Route path="availability"   element={<VendorAvailability />} />
          <Route path="enquiries"      element={<VendorEnquiries />} />
          <Route path="messages"       element={<VendorMessages />} />
          <Route path="event-requests" element={<VendorEventRequests />} />
          <Route path="*"              element={<Navigate to="/vendor/dashboard" replace />} />
        </Routes>
      </VendorLayout>
    </ProtectedVendorRoute>
  } />
  <Route path="*" element={<Navigate to="/vendor/login" replace />} />
</Routes>
  );
}

export default function VendorApp() {
  return (
    <VendorAuthProvider>
      <Router>
        <VendorRoutes />
      </Router>
    </VendorAuthProvider>
  );
}
