// src/pages/VendorProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DEFAULT_VENDOR_SERVICE } from '../context/data/vendorServiceConfig';
import { BookmarkIcon } from '../components/BookmarkIcon';
import { useAuth } from '../hooks/useAuth';
import './VendorProfilePage.css';
import ClientMessaging from '../components/ClientMessaging';


const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helpers ────────────────────────────────────────────────────────────────
function StarIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill={filled ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="1.2">
      <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.4l-3.6 1.9.7-4L2.2 5.7l4-.6z" />
    </svg>
  );
}

function RatingStars({ rating }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} filled={i <= Math.round(rating)} />)}
    </span>
  );
}

/* Static/demo vendors used to always fall back to a hardcoded set of
   wedding-photography stock photos (PORTFOLIO_SETS), regardless of which
   service the vendor actually belongs to. Any service whose staticData
   entries don't define their own images silently showed photography
   photos. Now each service supplies its own demo images via
   `serviceConfig.demoPortfolio` (array of URLs), or a per-vendor
   `portfolio` array on the staticData entry itself; if neither exists we
   just show the vendor's single cover image instead of fabricating a
   photo set. */
function getStaticPortfolioImages(staticVendor, serviceConfig) {
  if (Array.isArray(staticVendor?.portfolio) && staticVendor.portfolio.length > 0) {
    return staticVendor.portfolio.map(url => ({ url, caption: null, tags: [] }));
  }
  if (Array.isArray(serviceConfig?.demoPortfolio) && serviceConfig.demoPortfolio.length > 0) {
    return serviceConfig.demoPortfolio.map(url => ({ url, caption: null, tags: [] }));
  }
  return staticVendor?.cover ? [{ url: staticVendor.cover, caption: null, tags: [] }] : [];
}

function mapDbVendorToProfile(vendor, tags, serviceConfig) {
  const typeFromSpecialty = vendor.specialty
    ? vendor.specialty.split(',').map(s => s.trim()).filter(Boolean)
    : [serviceConfig.defaultSpecialty];

  const pricePerDay = vendor.price_per_day ? Number(vendor.price_per_day) : 0;

  // ── Real multi-select "Services Offered" list ─────────────────────────
  // This is the actual list of services the vendor ticked in their profile
  // form (VendorProfile.jsx → the "Services Offered" pills / "Pricing per
  // Service" checkboxes), stored on vendors.services (JSONB). Previously
  // this page never read this column at all — it only ever derived a
  // single tag from the free-text `specialty` field, so selecting several
  // services never surfaced here.
  let services = [];
  if (Array.isArray(vendor.services)) {
    services = vendor.services;
  } else if (typeof vendor.services === 'string') {
    try { services = JSON.parse(vendor.services) || []; } catch { services = []; }
  }

  // ── Per-service prices ──────────────────────────────────────────────
  // vendor.prices is the { "Digital Invites": "200", "Box Invitations":
  // "500", ... } map the vendor filled in on VendorProfile.jsx's "Pricing
  // per Service" section. We surface this so each service can show its
  // own price on the public profile, alongside the overall average.
  let prices = {};
  if (vendor.prices && typeof vendor.prices === 'object' && !Array.isArray(vendor.prices)) {
    prices = vendor.prices;
  } else if (typeof vendor.prices === 'string') {
    try { prices = JSON.parse(vendor.prices) || {}; } catch { prices = {}; }
  }

  return {
    id: vendor.id,
    bookmarkId: `db_${vendor.id}`,
    name: vendor.name,
    location: vendor.location || 'Lucknow',
    rating: 5.0,
    pricePerDay,
    services,
    prices,
    type: typeFromSpecialty,
    media: [serviceConfig.filters.mediaOptions[0]],
    verified: false,
    tags: tags.map(t => t.tag),
    cover: vendor.photo_url || '',
    contact: vendor.contact || '',
    specialty: vendor.specialty || '',
    isDbItem: true,
  };
}


// ── Sub-components ─────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const name   = review.client_name || review.name || 'Anonymous';
  const rating = Number(review.rating) || 5;
  const text   = review.message || review.text || '';
  const date   = review.created_at
    ? new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : review.date || '';

  return (
    <div className="pp-review-card">
      <div className="pp-review-header">
        <div className="pp-review-avatar">{name[0].toUpperCase()}</div>
        <div>
          <div className="pp-review-name">{name}</div>
          <div className="pp-review-meta">
            <RatingStars rating={rating} />
            <span className="pp-review-date">{date}</span>
          </div>
        </div>
      </div>
      <p className="pp-review-text">{text}</p>
    </div>
  );
}

function RatingBar({ stars, count, total }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="pp-rating-bar-row">
      <span className="pp-rating-bar-label">{stars}</span>
      <div className="pp-rating-bar-track">
        <div className="pp-rating-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="pp-rating-bar-count">{count}</span>
    </div>
  );
}

const PP_CAROUSEL_STYLES = `
  .pp-carousel { position:relative; border-radius:14px; overflow:hidden; background:#000; margin-bottom:20px; border:0.5px solid var(--border-soft, rgba(255,255,255,0.08)); }
  .pp-carousel-stage { position:relative; width:100%; height:460px; overflow:hidden; background:#15120D; }
  .pp-carousel-stage img { width:100%; height:100%; object-fit:cover; display:block; position:absolute; inset:0; transition:opacity .35s ease, transform .35s ease; }
  .pp-carousel-stage img.pp-carousel-enter { opacity:0; transform:scale(1.03); }
  .pp-carousel-overlay { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 42%); pointer-events:none; }
  .pp-carousel-counter { position:absolute; top:14px; right:14px; background:rgba(15,13,10,.65); backdrop-filter:blur(6px); color:#F0A020; font-size:11px; padding:4px 11px; border-radius:20px; border:.5px solid rgba(212,134,10,.3); z-index:5; }
  .pp-carousel-nav { position:absolute; top:50%; transform:translateY(-50%); width:38px; height:38px; border-radius:50%; background:rgba(15,13,10,.55); backdrop-filter:blur(6px); border:.5px solid rgba(212,134,10,.3); color:#F5EDD8; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .18s, transform .15s; z-index:5; }
  .pp-carousel-nav:hover { background:rgba(212,134,10,.55); transform:translateY(-50%) scale(1.08); }
  .pp-carousel-prev { left:14px; }
  .pp-carousel-next { right:14px; }
  .pp-carousel-caption { position:absolute; left:16px; bottom:16px; right:96px; color:#F5EDD8; font-size:13px; z-index:5; text-shadow:0 1px 4px rgba(0,0,0,.6); }
  .pp-carousel-ptags { position:absolute; left:16px; bottom:44px; display:flex; gap:6px; flex-wrap:wrap; z-index:5; }
  .pp-carousel-ptag { font-size:10px; padding:3px 10px; border-radius:20px; background:rgba(212,134,10,.2); color:#F0A020; border:.5px solid rgba(212,134,10,.35); backdrop-filter:blur(4px); }
  .pp-carousel-thumbs { display:flex; gap:8px; padding:10px; overflow-x:auto; background:#15120D; }
  .pp-carousel-thumb { flex:0 0 auto; width:76px; height:54px; border-radius:8px; overflow:hidden; cursor:pointer; opacity:.5; border:1.5px solid transparent; transition:opacity .15s, border-color .15s; }
  .pp-carousel-thumb:hover { opacity:.8; }
  .pp-carousel-thumb.active { opacity:1; border-color:#D4860A; }
  .pp-carousel-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .pp-carousel-empty { display:flex; align-items:center; justify-content:center; height:280px; color:#7A6E5C; font-size:13px; background:#1A1610; border-radius:14px; border:0.5px dashed rgba(255,255,255,0.1); margin-bottom:20px; }
`;

function PortfolioCarousel({ images }) {
  const [idx, setIdx]         = useState(0);
  const [sliding, setSliding] = useState(false);

  useEffect(() => { setIdx(0); }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="pp-carousel-empty">
        <style>{PP_CAROUSEL_STYLES}</style>
        No portfolio images yet.
      </div>
    );
  }

  const total   = images.length;
  const current = images[idx];

  const goTo = (i) => {
    if (i === idx || sliding) return;
    setSliding(true);
    setTimeout(() => { setIdx(i); setSliding(false); }, 280);
  };
  const prev = () => goTo((idx - 1 + total) % total);
  const next = () => goTo((idx + 1) % total);

  return (
    <div className="pp-carousel">
      <style>{PP_CAROUSEL_STYLES}</style>
      <div className="pp-carousel-stage">
        <img
          key={current.url}
          src={current.url}
          alt={`Portfolio ${idx + 1}`}
          className={sliding ? 'pp-carousel-enter' : ''}
        />
        <div className="pp-carousel-overlay" />
        {total > 1 && <div className="pp-carousel-counter">{idx + 1} / {total}</div>}
        {current.tags?.length > 0 && (
          <div className="pp-carousel-ptags">
            {current.tags.map((t, i) => <span key={i} className="pp-carousel-ptag">{t}</span>)}
          </div>
        )}
        {current.caption && <div className="pp-carousel-caption">{current.caption}</div>}
        {total > 1 && (
          <>
            <button className="pp-carousel-nav pp-carousel-prev" onClick={prev} title="Previous">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="pp-carousel-nav pp-carousel-next" onClick={next} title="Next">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="pp-carousel-thumbs">
          {images.map((img, i) => (
            <div key={i} className={`pp-carousel-thumb${i === idx ? ' active' : ''}`} onClick={() => goTo(i)}>
              <img src={img.url} alt={`Thumbnail ${i + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Write Review Form ──────────────────────────────────────────────────────
function WriteReviewForm({ vendorId, vendorName, user, onReviewSubmitted }) {
  const [reviewText,       setReviewText]       = useState('');
  const [reviewRating,     setReviewRating]     = useState(0);
  const [hoverRating,      setHoverRating]      = useState(0);
  const [budget,           setBudget]           = useState('');
  const [reviewerName,     setReviewerName]     = useState(user?.name || '');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess,    setReviewSuccess]    = useState('');
  const [reviewError,      setReviewError]      = useState('');

  const handleSubmit = async () => {
    if (reviewRating === 0) { setReviewError('Please select a star rating.'); return; }
    if (!reviewText.trim()) { setReviewError('Please write your review.'); return; }
    if (!reviewerName.trim()) { setReviewError('Please enter your name.'); return; }

    setReviewSubmitting(true);
    setReviewError('');

    const payload = {
      client_name: reviewerName.trim(),
      message:     reviewText.trim(),
      rating:      reviewRating,           // 1-5 stars directly
      approved:    false,
      vendor_id:   vendorId || null,
    };

    try {
      const res  = await fetch(`${API}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccess('Review submitted! It will appear after admin approval.');
        setReviewText('');
        setReviewRating(0);
        setBudget('');
        if (!user) setReviewerName('');
        setTimeout(() => setReviewSuccess(''), 5000);
        if (onReviewSubmitted) onReviewSubmitted();
      } else {
        setReviewError('Something went wrong. Please try again.');
      }
    } catch {
      setReviewError('Could not connect to server.');
    }
    setReviewSubmitting(false);
  };

  return (
    <div className="pp-write-review">
      <h3 className="pp-subsection-title">Write a Review for {vendorName}</h3>

      {reviewSuccess && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
          {reviewSuccess}
        </div>
      )}
      {reviewError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
          {reviewError}
        </div>
      )}

      {/* Reviewer name — pre-filled if logged in */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--pp-text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Your name *
        </label>
        <input
          type="text"
          className="pp-form-input"
          placeholder="e.g. Priya Sharma"
          value={reviewerName}
          onChange={e => { setReviewerName(e.target.value); setReviewError(''); }}
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Star rating — 1–5 stars */}
      <div className="pp-star-picker" style={{ marginBottom: 18 }}>
        <span className="pp-star-picker-label">Star rating *</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => { setReviewRating(n); setReviewError(''); }}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                transition: 'transform 0.15s',
                transform: n <= (hoverRating || reviewRating) ? 'scale(1.2)' : 'scale(1)',
              }}
              title={`${n} star${n > 1 ? 's' : ''}`}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill={n <= (hoverRating || reviewRating) ? '#F59E0B' : 'none'}
                stroke="#F59E0B"
                strokeWidth="1.5"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
          {reviewRating > 0 && (
            <span style={{ fontSize: 13, color: 'var(--pp-text-2)', marginLeft: 4 }}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
            </span>
          )}
        </div>
      </div>

      <textarea
        className="pp-review-textarea"
        placeholder={`Share your experience working with ${vendorName}...`}
        value={reviewText}
        onChange={e => { setReviewText(e.target.value); setReviewError(''); }}
        rows={5}
      />

      <input
        type="text"
        className="pp-review-budget-input"
        placeholder="How much did you spend? (optional, e.g. ₹45,000)"
        value={budget}
        onChange={e => setBudget(e.target.value)}
      />

      <div className="pp-review-footer">
        <button className="pp-submit-review-btn" onClick={handleSubmit} disabled={reviewSubmitting}>
          {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function VendorProfilePage({ bookmarks, onBookmarkToggle, serviceConfig = DEFAULT_VENDOR_SERVICE }) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

 const staticPhotographer = null; // resolved after DB fetch


  const [activeSection, setActiveSection] = useState('projects');
  const [activeTab,     setActiveTab]     = useState('portfolio');

  const [dbVendor,    setDbVendor]    = useState(null);
  const [dbPortfolio, setDbPortfolio] = useState([]);
  const [dbTags,      setDbTags]      = useState([]);
  const [dbLoading,   setDbLoading]   = useState(!staticPhotographer);

  // Per-vendor reviews
  const [reviews,        setReviews]        = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Contact form
  const [contactForm,   setContactForm]   = useState({ name: '', phone: '', email: '', date: '', details: '' });
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent,    setMessageSent]    = useState(false);
  const [messageError,   setMessageError]   = useState('');

  // Booking form state
  const [bookingForm, setBookingForm] = useState({ name: '', phone: '', email: '', date: '', eventType: '' });
  const [bookingSending, setBookingSending] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);

  const projectsRef = useRef(null);
  const aboutRef    = useRef(null);
  const reviewsRef  = useRef(null);

  const sections = [
    { id: 'projects', label: 'Projects', ref: projectsRef },
    { id: 'about',    label: 'About',    ref: aboutRef    },
    { id: 'reviews',  label: 'Reviews',  ref: reviewsRef  },
  ];

  // ── Resolve the numeric vendor ID for DB vendors ───────────────────────
  // Static photographers use numeric ids (1-9); DB vendors use their DB id.
  // We need vendor_id for the reviews endpoint.
  const resolvedVendorId = staticPhotographer
    ? null                                    // static vendors have no DB row
    : dbVendor?.id ?? null;

  // ── Fetch approved reviews filtered by vendor_id ───────────────────────
  const fetchReviews = () => {
    setReviewsLoading(true);
    const url = resolvedVendorId
      ? `${API}/reviews?vendor_id=${resolvedVendorId}`
      : null; // static vendors: skip or show nothing

    if (!url) {
      setReviews([]);
      setReviewsLoading(false);
      return;
    }

    fetch(url)
      .then(r => r.json())
      .then(data => { setReviews(Array.isArray(data) ? data : []); setReviewsLoading(false); })
      .catch(() => setReviewsLoading(false));
  };

  // Re-fetch reviews once we know resolvedVendorId
  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedVendorId]);

  // ── Fetch DB vendor data ───────────────────────────────────────────────
  useEffect(() => {
  let cancelled = false;
  setDbLoading(true);

  (async () => {
    try {
      const res     = await fetch(`${API}/vendors`);
      const vendors = await res.json();
      const match   = Array.isArray(vendors)
        ? vendors.find(v => {
            const serviceId = String(v.service_id || '').trim();
            return v.id === parseInt(id) && (serviceId === String(serviceConfig.serviceId) || (serviceConfig.includeUnassigned && !serviceId));
          })
        : null;

      if (!match) { if (!cancelled) setDbLoading(false); return; }

      const [portRes, tagsRes] = await Promise.all([
        fetch(`${API}/vendors/${match.id}/portfolio`),
        fetch(`${API}/vendors/${match.id}/tags`),
      ]);
      const portfolio = await portRes.json();
      const tags      = await tagsRes.json();

      if (!cancelled) {
        setDbVendor(match);
        setDbPortfolio(Array.isArray(portfolio) ? portfolio : []);
        setDbTags(Array.isArray(tags) ? tags : []);
      }
    } catch (err) {
      console.error('Failed to fetch vendor:', err);
    }
    if (!cancelled) setDbLoading(false);
  })();

  return () => { cancelled = true; };
}, [id, serviceConfig]);

  // ── Intersection observer for sticky nav ──────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }); },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach(s => { if (s.ref.current) observer.observe(s.ref.current); });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const staticFallback = (!dbVendor && !dbLoading && serviceConfig.staticData)
  ? serviceConfig.staticData.find(p => p.id === parseInt(id))
  : null;

const photographer = dbVendor
  ? mapDbVendorToProfile(dbVendor, dbTags, serviceConfig)
  : staticFallback || null;
  if (!photographer) {
    if (dbLoading) {
      return (
        <div className="pp-not-found">
          <h2>Loading…</h2>
        </div>
      );
    }
    return (
      <div className="pp-not-found">
        <h2>{serviceConfig.singular} not found</h2>
        <button onClick={() => navigate(serviceConfig.path)} className="pp-back-btn">
          ← Back to {serviceConfig.title}
        </button>
      </div>
    );
  }

  const isBookmarked     = !!(bookmarks && bookmarks[photographer.bookmarkId ?? photographer.id]);
  const portfolioImages  = photographer.isDbItem
    ? dbPortfolio.map(p => ({ url: p.image_url, caption: p.caption, tags: p.tags || [] }))
    : getStaticPortfolioImages(staticFallback, serviceConfig);
  const heroCover        = photographer.cover || portfolioImages[0]?.url || '';
  const totalReviews     = reviews.length;
  const avgRating        = totalReviews > 0
    ? reviews.reduce((s, r) => s + Number(r.rating), 0) / totalReviews
    : photographer.rating;
  // Previously this ignored `photographer.services` entirely and either
  // used a hardcoded serviceConfig list or a fallback derived from the
  // single `specialty` text field + tags. Now the vendor's own multi-select
  // list (ticked in VendorProfile.jsx, e.g. Digital Invites + Box
  // Invitations + Menu Cards) takes priority.
  const servicesOffered  = photographer.services?.length
    ? photographer.services
    : (serviceConfig.servicesOffered
        ? serviceConfig.servicesOffered
        : [...new Set([...photographer.type, ...photographer.tags, serviceConfig.defaultSpecialty])]);

  const handleBookmark = () => {
    onBookmarkToggle({
      id:    photographer.bookmarkId ?? photographer.id,
      name:  photographer.name,
      image: heroCover,
      type:  serviceConfig.bookmarkType,
    });
  };

  const handleSendMessage = async () => {
    if (!contactForm.name || !contactForm.phone) {
      setMessageError('Name and phone are required.');
      return;
    }
    setMessageSending(true);
    setMessageError('');
    const payload = {
      client_name: contactForm.name,
      email:       contactForm.email || '',
      phone:       contactForm.phone,
      message:     `[${serviceConfig.singular}: ${photographer.name}]\nDate: ${contactForm.date || 'Not specified'}\n${contactForm.details}`,
    };
    try {
      const res  = await fetch(`${API}/queries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessageSent(true);
        setContactForm({ name: '', phone: '', email: '', date: '', details: '' });
        setTimeout(() => setMessageSent(false), 4000);
      } else {
        setMessageError('Something went wrong. Please try again.');
      }
    } catch { setMessageError('Could not connect to server.'); }
    setMessageSending(false);
  };

  // Handle direct booking request
  const handleBookNow = async () => {
    if (!bookingForm.name || !bookingForm.phone) {
      setBookingError('Name and phone are required.');
      return;
    }
    setBookingSending(true);
    setBookingError('');
    const payload = {
      client_name: bookingForm.name,
      email: bookingForm.email || '',
      phone: bookingForm.phone,
      event_type: bookingForm.eventType || 'Event',
      event_date: bookingForm.date || null,
      message: `[${serviceConfig.singular}: ${photographer.name}] - Direct Booking Request\nDate: ${bookingForm.date || 'Not specified'}`,
      reference_event_id: photographer?.id || null,
      reference_image: photographer?.photo_url || null,
    };
    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setBookingSuccess(true);
        setBookingForm({ name: '', phone: '', email: '', date: '', eventType: '' });
        setTimeout(() => { setBookingSuccess(false); setShowBookingModal(false); }, 4000);
      } else {
        setBookingError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) { setBookingError('Could not connect to server: ' + err.message); }
    setBookingSending(false);
  };

  const ratingCounts = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.round(Number(r.rating)) === stars).length,
  }));

  // ── Whether this vendor supports reviews (only DB vendors have an id to attach to)
  const supportsReviews = Boolean(resolvedVendorId);

  return (
    <div className="pp-page">
      {/* ── Hero ── */}
      <div className="pp-hero">
        <div className="pp-hero-img-wrap">
          <img src={heroCover} alt={photographer.name} className="pp-hero-img" />
          <div className="pp-hero-overlay" />
        </div>
        <div className="pp-hero-content">
          <button className="pp-breadcrumb-btn" onClick={() => navigate(serviceConfig.path)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to {serviceConfig.title}
          </button>
          <div className="pp-hero-info">
            <div className="pp-hero-name-row">
              <h1 className="pp-hero-name">{photographer.name}</h1>
              {photographer.verified && (
                <span className="pp-verified-badge">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="#F59E0B" />
                    <path d="M5 8l2 2 4-4" stroke="#1A1100" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Verified
                </span>
              )}
            </div>
            <div className="pp-hero-meta">
              <span className="pp-hero-location">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" />
                  <circle cx="8" cy="6" r="1.5" />
                </svg>
                {photographer.location}
              </span>
              <span className="pp-hero-dot">·</span>
              <RatingStars rating={avgRating} />
              <span className="pp-hero-rating-val">{avgRating.toFixed(1)}</span>
              <span className="pp-hero-reviews">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Sub-Nav ── */}
      <div className="pp-subnav">
        <div className="pp-subnav-inner">
          <div className="pp-subnav-links">
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`} className={`pp-subnav-link ${activeSection === s.id ? 'active' : ''}`}>
                {s.label}
                {s.id === 'reviews' && totalReviews > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: 10, padding: '1px 7px' }}>
                    {totalReviews}
                  </span>
                )}
              </a>
            ))}
          </div>
          <div className="pp-subnav-actions">
            <button className={`pp-bm-btn ${isBookmarked ? 'bookmarked' : ''}`} onClick={handleBookmark} title={isBookmarked ? 'Remove bookmark' : 'Save'}>
              <BookmarkIcon filled={isBookmarked} size={16} color={isBookmarked ? '#c9a84c' : 'currentColor'} />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
            <button className="pp-share-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="3" r="1.5" /><circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="13" r="1.5" />
                <path d="M5.5 7.1l5 -3m-5 5l5 3" strokeLinecap="round" />
              </svg>
              Share
            </button>
            <span className="pp-subnav-price">₹{photographer.pricePerDay.toLocaleString('en-IN')}</span>
            <a href="#contact" className="pp-contact-btn">Contact</a>
            <button className="pp-contact-btn" onClick={() => setShowBookingModal(true)}>Book Now</button>
          </div>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className="pp-body">
        <div className="pp-main-col">

          {/* ── PROJECTS ── */}
          <section id="projects" ref={projectsRef} className="pp-section">
            <div className="pp-tabs">
              {['portfolio', 'albums', 'videos'].map(tab => (
                <button key={tab} className={`pp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'portfolio' ? `Portfolio (${portfolioImages.length})` : tab === 'albums' ? 'Albums (5)' : 'Videos (3)'}
                </button>
              ))}
            </div>

            {activeTab === 'portfolio' && (
              dbLoading && photographer.isDbItem ? (
                <p style={{ color: '#7A6E5C', fontSize: 13 }}>Loading portfolio…</p>
              ) : (
                <PortfolioCarousel images={portfolioImages} />
              )
            )}
            {activeTab === 'albums' && (
              <div className="pp-albums-grid">
                {portfolioImages.slice(0, 5).map((img, i) => (
                  <div key={i} className="pp-album-card">
                    <img src={img.url} alt={`Album ${i+1}`} loading="lazy" />
                    <div className="pp-album-label">Album {i+1}</div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'videos' && (
              <div className="pp-videos-grid">
                {portfolioImages.slice(0, 3).map((img, i) => (
                  <div key={i} className="pp-video-card">
                    <img src={img.url} alt={`Video ${i+1}`} loading="lazy" />
                    <div className="pp-video-play">
                      <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor">
                        <circle cx="16" cy="16" r="15" fill="rgba(0,0,0,0.5)" />
                        <polygon points="13,10 24,16 13,22" fill="white" />
                      </svg>
                    </div>
                    <div className="pp-video-label">Highlight Reel {i+1}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── ABOUT ── */}
          <section id="about" ref={aboutRef} className="pp-section">
            <h2 className="pp-section-title">About {photographer.name}</h2>
            <p className="pp-about-text">
              {photographer.name} is a Lucknow-based {serviceConfig.defaultSpecialty.toLowerCase()} vendor
              specialising in {photographer.type.join(', ')}. Their portfolio, pricing, and service details
              are listed below.
            </p>
            {photographer.contact && (
              <p className="pp-about-text">
                Contact: <span style={{ color: 'var(--pp-amber)' }}>{photographer.contact}</span>
              </p>
            )}

            <h3 className="pp-subsection-title">Services Offered</h3>
            <ul className="pp-services-list">
              {servicesOffered.map(s => (
                <li key={s} className="pp-service-item">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>

            <div className="pp-info-grid">
              {[
                ['Travels to Venue',  'Yes, pan-India travel available'],
                ['Payment Terms',     'Upto 25% Advance'],
                ['Travel Cost',       'Outstation travel & stay borne by client'],
                ['Delivery Time',     '2 weeks after event'],
              ].map(([label, val]) => (
                <div key={label} className="pp-info-card">
                  <div className="pp-info-label">{label}</div>
                  <div className="pp-info-val">{val}</div>
                </div>
              ))}
            </div>

            {photographer.tags.length > 0 && (
              <div className="pp-tags-section">
                <h3 className="pp-subsection-title">Specialities</h3>
                <div className="pp-tags-wrap">
                  {photographer.tags.map(t => <span key={t} className="pp-tag">🏅 {t}</span>)}
                  {photographer.type.map(t => <span key={t} className="pp-tag pp-tag-type">{t}</span>)}
                </div>
              </div>
            )}
          </section>

          {/* ── REVIEWS ── */}
          <section id="reviews" ref={reviewsRef} className="pp-section">
            <h2 className="pp-section-title">
              Reviews ({totalReviews})
              {!supportsReviews && (
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--pp-text-3)', marginLeft: 10 }}>
                  — demo vendor
                </span>
              )}
            </h2>

            {supportsReviews ? (
              <>
                {/* Rating summary */}
                <div className="pp-reviews-summary">
                  <div className="pp-rating-big">
                    <span className="pp-rating-big-val">{avgRating.toFixed(1)}</span>
                    <RatingStars rating={avgRating} />
                    <span className="pp-rating-big-count">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="pp-rating-bars">
                    {ratingCounts.map(({ stars, count }) => (
                      <RatingBar key={stars} stars={stars} count={count} total={totalReviews} />
                    ))}
                  </div>
                </div>

                {/* Reviews list */}
                <div className="pp-reviews-list">
                  {reviewsLoading ? (
                    <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading reviews…</p>
                  ) : reviews.length === 0 ? (
                    <div style={{
                      textAlign: 'center', padding: '32px 20px',
                      background: 'rgba(245,158,11,0.04)',
                      border: '1px solid rgba(245,158,11,0.1)',
                      borderRadius: 12, marginBottom: 24,
                    }}>
                      <p style={{ color: 'var(--pp-text-3)', fontSize: 14 }}>
                        No reviews yet for {photographer.name}. Be the first!
                      </p>
                    </div>
                  ) : (
                    reviews.map(r => <ReviewCard key={r.id} review={r} />)
                  )}
                </div>

                {/* Write review form */}
                <WriteReviewForm
                  vendorId={resolvedVendorId}
                  vendorName={photographer.name}
                  user={user}
                  onReviewSubmitted={fetchReviews}
                />
              </>
            ) : (
              <div style={{
                padding: '32px 20px', textAlign: 'center',
                background: 'rgba(245,158,11,0.04)',
                border: '1px solid rgba(245,158,11,0.1)',
                borderRadius: 12,
              }}>
                <p style={{ color: 'var(--pp-text-2)', fontSize: 14, lineHeight: 1.6 }}>
                  This is a demo vendor. Reviews are available for vendors added through the admin panel.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="pp-sidebar" id="contact">
          <div className="pp-pricing-card">
            <h3 className="pp-pricing-title">Average Price</h3>

            {/* The old per-tier "Pricing Packages" breakdown read from
                `vendor.pricing_packages`, a column that never actually
                existed in the schema, so that branch never fired for real
                vendors. We always show the single average price
                (vendor.price_per_day) as the headline number, computed in
                VendorProfile.jsx. */}
            <div className="pp-pricing-row">
              <div className="pp-pricing-item">
                <div className="pp-pricing-amount">₹{photographer.pricePerDay.toLocaleString('en-IN')}</div>
                <div className="pp-pricing-label">
                  Average across {(photographer.services?.length || photographer.type.length)} service{(photographer.services?.length || photographer.type.length) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Per-service price breakdown — lists each service the vendor
                ticked (photographer.services) together with its own price
                from photographer.prices[service], sourced from the
                "Pricing per Service" section on VendorProfile.jsx. The
                average above stays the headline; this is the detail
                underneath it. Services without an entered price show
                "Price on request" instead of a blank/zero. */}
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(photographer.services?.length ? photographer.services : photographer.type).map(service => {
                const svcPrice = Number(photographer.prices?.[service]) || 0;
                return (
                  <div
                    key={service}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: '1px solid var(--pp-border)',
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: 'var(--pp-text-2)' }}>{service}</span>
                    {svcPrice > 0 ? (
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--pp-amber)' }}>
                        ₹{svcPrice.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--pp-text-3)', fontStyle: 'italic' }}>
                        Price on request
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {photographer.tags.length > 0 && (
              <div className="pp-award-tags" style={{ marginTop: 14 }}>
                {photographer.tags.map(t => <span key={t} className="pp-award-pill">🏅 {t}</span>)}
              </div>
            )}
            {/* Mini rating in sidebar */}
            {supportsReviews && (
              <div style={{
                marginTop: 16, padding: '12px 0 0',
                borderTop: '1px solid var(--pp-border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <RatingStars rating={avgRating} />
                <span style={{ fontSize: 13, color: 'var(--pp-amber)', fontWeight: 600 }}>
                  {avgRating.toFixed(1)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--pp-text-3)' }}>
                  ({totalReviews} review{totalReviews !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {/* Contact form */}
          <div className="pp-contact-card">
            <h3 className="pp-contact-title">Send a Message</h3>
            <p className="pp-contact-subtitle">Complete info ensures accurate and timely responses</p>

            {messageError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#b91c1c' }}>
                {messageError}
              </div>
            )}

            <input type="text"  className="pp-form-input" placeholder="Full name *"         value={contactForm.name}    onChange={e => { setContactForm({ ...contactForm, name: e.target.value });    setMessageError(''); }} />
            <input type="tel"   className="pp-form-input" placeholder="+91 Phone number *"  value={contactForm.phone}   onChange={e => { setContactForm({ ...contactForm, phone: e.target.value });   setMessageError(''); }} />
            <input type="email" className="pp-form-input" placeholder="Email address"       value={contactForm.email}   onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
            <input type="date"  className="pp-form-input"                                   value={contactForm.date}    onChange={e => setContactForm({ ...contactForm, date: e.target.value })} />
            <textarea           className="pp-form-textarea" placeholder="Details about your event" value={contactForm.details} onChange={e => setContactForm({ ...contactForm, details: e.target.value })} rows={3} />

            <button className="pp-send-msg-btn" onClick={handleSendMessage} disabled={messageSending}>
              {messageSending ? 'Sending…' : messageSent ? '✓ Message Sent!' : 'Send Message'}
            </button>

            <div className="pp-demand-badge">
              <span className="pp-demand-dot" />
              In High Demand — 5 enquiries last week
            </div>
          </div>
        </aside>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowBookingModal(false)}>
          <div style={{ background: '#1e1a14', border: '0.5px solid rgba(200,175,120,0.2)', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#e8dcc8' }}>Book {photographer.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(200,175,120,0.4)' }}>Request a booking for your event</div>
              </div>
              <button onClick={() => setShowBookingModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(200,175,120,0.5)', cursor: 'pointer', fontSize: 20 }}>
                ×
              </button>
            </div>

            {bookingSuccess && (
              <div style={{ background: 'rgba(111,207,151,0.1)', border: '0.5px solid rgba(111,207,151,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#6fcf97', fontSize: 13 }}>
                ✓ Booking request sent! The vendor will contact you soon.
              </div>
            )}

            {bookingError && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '0.5px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#f87171', fontSize: 13 }}>
                {bookingError}
              </div>
            )}

            {!bookingSuccess && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(200,175,120,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Name *</label>
                  <input
                    type="text"
                    className="pp-form-input"
                    placeholder="Full name"
                    value={bookingForm.name}
                    onChange={e => { setBookingForm({ ...bookingForm, name: e.target.value }); setBookingError(''); }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(200,175,120,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phone *</label>
                  <input
                    type="tel"
                    className="pp-form-input"
                    placeholder="+91 98765 43210"
                    value={bookingForm.phone}
                    onChange={e => { setBookingForm({ ...bookingForm, phone: e.target.value }); setBookingError(''); }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(200,175,120,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</label>
                  <input
                    type="email"
                    className="pp-form-input"
                    placeholder="you@example.com"
                    value={bookingForm.email}
                    onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(200,175,120,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Event Type</label>
                  <select
                    className="pp-form-input"
                    value={bookingForm.eventType}
                    onChange={e => setBookingForm({ ...bookingForm, eventType: e.target.value })}
                    style={{ marginBottom: 0 }}
                  >
                    <option value="">Select event type</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Pre-Wedding">Pre-Wedding Shoot</option>
                    <option value="Birthday">Birthday Party</option>
                    <option value="Corporate">Corporate Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(200,175,120,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Event Date</label>
                  <input
                    type="date"
                    className="pp-form-input"
                    value={bookingForm.date}
                    onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                  />
                </div>

                <button
                  onClick={handleBookNow}
                  disabled={bookingSending}
                  style={{ width: '100%', padding: '14px 0', background: '#c9a96e', color: '#1a1612', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  {bookingSending ? 'Sending Request...' : 'Confirm Booking Request'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
       <ClientMessaging                         
        vendor={photographer.isDbItem ? dbVendor : null}
        user={user}
      />
    </div>
  );
}