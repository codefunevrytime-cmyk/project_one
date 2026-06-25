import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import BookmarkToast from "./components/BookmarkToast_2";
import LoginPromptModal from "./components/LoginPromptModal";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import SavedBookmarksPage from "./pages/SavedBookmarksPage";
import ContactPage from "./pages/ContactPage";
import ExploreEventPage from "./pages/ExploreEventPage";
import GalleryPage from "./pages/GalleryPage";
import LoginPage from "./pages/LoginPage";
import ProductPage from "./pages/ProductPage";
import SignupPage from "./pages/SignupPage";
import PhotographyPage from "./pages/PhotographyPage";
import PhotographerProfilePage from "./pages/PhotographerProfilePage";
import { getVendorServiceConfig } from "./context/data/vendorServiceConfig";
import MyEvents from "./pages/MyEvents";
import AdminApp from "./admin/AdminApp";
import CreateEventPage from "./pages/CreateEventPage";
import PaymentsEmpty from "./pages/PaymentsEmpty";
import PaymentCheckout from './pages/PaymentCheckout';
import PaymentsHistory from './pages/PaymentsHistory';
import ProtectedRoute from './components/ProtectedRoute';


// ── Decides which payments page to show based on real payment history ─────────
function PaymentsGate() {
  const { user } = useAuth();
  const [hasPayments, setHasPayments] = useState(false);
  const [checking,    setChecking]    = useState(true);

  useEffect(() => {
    if (!user?.email) { setChecking(false); return; }
    fetch(`http://localhost:5000/api/payments/history?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(d => { setHasPayments(Array.isArray(d) && d.length > 0); setChecking(false); })
      .catch(() => setChecking(false));
  }, [user]);

  if (checking) return null;
  return hasPayments ? <PaymentsHistory /> : <PaymentsEmpty />;
}

// ── Main layout — receives bm from AppWithAuth ────────────────────────────────
function MainApp({ bm }) {
  const location = useLocation();
  const isAdmin  = location.pathname.startsWith("/admin");
  const { loginPromptOpen, closeLoginPrompt } = useAuth();

  return (
    <>
      {!isAdmin && <Navbar bookmarkCount={bm.count} />}

      <Routes>
        {/* ── General ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/products" element={<ProductPage />} />

        {/* ── Bookmarks ── */}
        <Route
          path="/bookmarks"
          element={
            <SavedBookmarksPage
              bookmarkList={bm.bookmarkList}
              onRemove={bm.remove}
            />
          }
        />

        {/* ── Explore ── */}
        <Route
          path="/explore"
          element={
            <ExploreEventPage
              bookmarks={bm.bookmarks}
              onBookmarkToggle={bm.toggle}
            />
          }
        />

        {/* ── Vendor services ── */}
        <Route
          path="/services/photography"
          element={
            <PhotographyPage
              bookmarks={bm.bookmarks}
              onBookmarkToggle={bm.toggle}
            />
          }
        />
        <Route
          path="/services/custom-invitations"
          element={
            <PhotographyPage
              serviceConfig={getVendorServiceConfig('custom-invitations')}
              bookmarks={bm.bookmarks}
              onBookmarkToggle={bm.toggle}
            />
          }
        />
        <Route
          path="/services/photography/:id"
          element={
            <PhotographerProfilePage
              bookmarks={bm.bookmarks}
              onBookmarkToggle={bm.toggle}
            />
          }
        />
        <Route
          path="/services/custom-invitations/:id"
          element={
            <PhotographerProfilePage
              serviceConfig={getVendorServiceConfig('custom-invitations')}
              bookmarks={bm.bookmarks}
              onBookmarkToggle={bm.toggle}
            />
          }
        />

        {/* ── Events ── */}
        <Route path="/my-events"     element={<ProtectedRoute><MyEvents /></ProtectedRoute>} />
        <Route path="/create-event"  element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
        <Route path="/create-events" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />

        {/* ── Payments ── */}
        <Route path="/payments"          element={<ProtectedRoute><PaymentsGate /></ProtectedRoute>} />
        <Route path="/payments/checkout" element={<ProtectedRoute><PaymentCheckout /></ProtectedRoute>} />
        <Route path="/payments/history"  element={<ProtectedRoute><PaymentsHistory /></ProtectedRoute>} />

        {/* ── Admin ── */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdmin && <BookmarkToast toast={bm.toast} />}
      <LoginPromptModal open={loginPromptOpen} onClose={closeLoginPrompt} />
    </>
  );
}

// ── Reads bookmarks from AuthContext and builds the bm object ─────────────────
function AppWithAuth() {
  const { bookmarkedEventIds, toggleBookmark, bookmarkCount } = useAuth();
  const [toast, setToast] = useState({ visible: false, message: '' });
  const timerRef = useRef(null);

  const showToast = (msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message: msg });
    timerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
  };

  const toggle = (item) => {
    const id = item.id ?? item;
    const alreadySaved = bookmarkedEventIds.includes(id);
    const didToggle = toggleBookmark(id);
    if (didToggle) showToast(alreadySaved ? 'Bookmark removed' : 'Bookmark added');
  };

  const remove = (id) => toggleBookmark(id);

  const bm = {
    bookmarks:    Object.fromEntries(bookmarkedEventIds.map(id => [id, { id }])),
    bookmarkList: bookmarkedEventIds.map(id => ({ id })),
    count:        bookmarkCount,
    toggle,
    remove,
    toast,
  };

  return <MainApp bm={bm} />;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppWithAuth />
      </Router>
    </AuthProvider>
  );
}