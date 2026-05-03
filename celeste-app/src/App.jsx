import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useBookmarks } from "./hooks/useBookmarks";
import BookmarkToast from "./components/BookmarkToast_2";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import BookmarksPage from "./pages/BookmarksPage";
import ContactPage from "./pages/ContactPage";
import ExploreEventPage from "./pages/ExploreEventPage";
import GalleryPage from "./pages/GalleryPage";
import LoginPage from "./pages/LoginPage";
import ProductPage from "./pages/ProductPage";
import SignupPage from "./pages/SignupPage";
import PhotographyPage from './pages/PhotographyPage';
import PhotographerProfilePage from './pages/PhotographerProfilePage';
import MyEvents from './pages/MyEvents';
import AdminApp from './admin/AdminApp';
import CreateEventPage from './pages/CreateEventPage';
import PaymentCheckout from "./pages/PaymentCheckout";
import PaymentsHistory from "./pages/PaymentsHistory";
import PaymentsEmpty   from "./pages/PaymentsEmpty";



function MainApp({ bm }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Navbar bookmarkCount={bm.count} />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/bookmarks" element={
          <BookmarksPage
            bookmarks={bm.bookmarks}
            bookmarkList={bm.bookmarkList}
            onRemove={bm.remove}
          />}
        />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/explore" element={
          <ExploreEventPage
            bookmarks={bm.bookmarks}
            onBookmarkToggle={bm.toggle}
          />}
        />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/products" element={<ProductPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/services/photography" element={
          <PhotographyPage
            bookmarks={bm.bookmarks}
            onBookmarkToggle={bm.toggle}
          />}
        />
        {/* ── Photographer Profile Page ── */}
        <Route path="/services/photography/:id" element={
          <PhotographerProfilePage
            bookmarks={bm.bookmarks}
            onBookmarkToggle={bm.toggle}
          />}
        />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        <Route path="/create-events" element={<CreateEventPage />} />
        <Route path="/services/photography2" element={
<Route path="/services/photography" element={
  <PhotographyPage
    bookmarks={bm.bookmarks}
    onBookmarkToggle={bm.toggle}
  />}
  
/>}
/>
      </Routes>
      {!isAdmin && <BookmarkToast toast={bm.toast} />}
    </>
  );
}

export default function App() {
  const bm = useBookmarks();

  return (
    <AuthProvider>
      <Router>
        <MainApp bm={bm} />
      </Router>
    </AuthProvider>
  );
}
