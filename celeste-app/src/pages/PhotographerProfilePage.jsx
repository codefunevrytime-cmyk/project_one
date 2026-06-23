// src/pages/PhotographerProfilePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PHOTOGRAPHERS } from '../context/data/photographyData';
import { DEFAULT_VENDOR_SERVICE } from '../context/data/vendorServiceConfig';
import { BookmarkIcon } from '../components/BookmarkIcon';
import { useAuth } from '../hooks/useAuth';
import './PhotographerProfilePage.css';

const API = 'http://localhost:5000/api';

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

const PORTFOLIO_SETS = {
  1: [
    "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80",
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80",
    "https://images.unsplash.com/photo-1529636798458-92182e662485?w=400&q=80",
    "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=80",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80",
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80",
    "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=400&q=80",
    "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=400&q=80",
    "https://images.unsplash.com/photo-1525772764200-be829a350797?w=400&q=80",
  ],
};
for (let i = 2; i <= 9; i++) PORTFOLIO_SETS[i] = PORTFOLIO_SETS[1];

const SERVICES_OFFERED = [
  "Candid Photography", "Traditional Photography", "Traditional Videography",
  "Wedding Films", "Pre-Wedding Shoots", "Pre-Wedding Films",
  "Drone Shots", "Photo Booth", "Live Screening", "Albums",
];

// Maps a DB vendor row + its tags into the same shape the static PHOTOGRAPHERS
// entries use, so the rest of the page doesn't need to branch on data source.
// Mirrors mapVendorToCard() in PhotographyPage.jsx.
function mapDbVendorToProfile(vendor, tags) {
  const typeFromSpecialty = vendor.specialty
    ? vendor.specialty.split(',').map(s => s.trim()).filter(Boolean)
    : ['Photography'];
  return {
    id: vendor.id,
    bookmarkId: `db_${vendor.id}`, // matches the id format used on the listing page
    name: vendor.name,
    location: 'Lucknow',
    rating: 5.0,
    pricePerDay: vendor.price_per_day ? Number(vendor.price_per_day) : 0,
    type: typeFromSpecialty,
    media: ['Photo'],
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
  const name = review.client_name || review.name || 'Anonymous';
  const rating = Number(review.rating) || 5;
  const text = review.message || review.text || '';
  const date = review.created_at
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

// Image carousel for the Portfolio tab — pulls from vendor_portfolio (DB) or
// the static PORTFOLIO_SETS fallback, both normalised to { url, caption, tags }.
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

// ── Main Component ─────────────────────────────────────────────────────────
export default function PhotographerProfilePage({ bookmarks, onBookmarkToggle, serviceConfig = DEFAULT_VENDOR_SERVICE }) {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const staticPhotographer = serviceConfig.id === 'photography'
    ? PHOTOGRAPHERS.find(p => p.id === parseInt(id))
    : null;

  const [activeSection, setActiveSection] = useState('projects');
  const [activeTab, setActiveTab]         = useState('portfolio');

  // DB-backed vendor (used when the id isn't one of the static demo photographers)
  const [dbVendor, setDbVendor]           = useState(null);
  const [dbPortfolio, setDbPortfolio]     = useState([]);
  const [dbTags, setDbTags]               = useState([]);
  const [dbLoading, setDbLoading]         = useState(!staticPhotographer);

  // Reviews from DB
  const [reviews, setReviews]             = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Write review form
  const [reviewText, setReviewText]       = useState('');
  const [reviewRating, setReviewRating]   = useState(0);
  const [hoverRating, setHoverRating]     = useState(0);
  const [budget, setBudget]               = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError]     = useState('');

  // Contact form
  const [contactForm, setContactForm]     = useState({ name: '', phone: '', email: '', date: '', details: '' });
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent]     = useState(false);
  const [messageError, setMessageError]   = useState('');

  const projectsRef = useRef(null);
  const aboutRef    = useRef(null);
  const reviewsRef  = useRef(null);

  const sections = [
    { id: 'projects', label: 'Projects', ref: projectsRef },
    { id: 'about',    label: 'About',    ref: aboutRef    },
    { id: 'reviews',  label: 'Reviews',  ref: reviewsRef  },
  ];

  // Fetch approved reviews from DB
  const fetchReviews = () => {
    setReviewsLoading(true);
    fetch(`${API}/reviews`)
      .then(r => r.json())
      .then(data => { setReviews(Array.isArray(data) ? data : []); setReviewsLoading(false); })
      .catch(() => setReviewsLoading(false));
  };

  useEffect(() => { fetchReviews(); }, []);

  // Fetch the vendor + its portfolio images + tags from the DB when the id
  // doesn't match one of the static demo photographers.
  useEffect(() => {
    if (staticPhotographer) { setDbLoading(false); return; }

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
  }, [id, serviceConfig, staticPhotographer]);

  // Intersection observer for sticky nav
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }); },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach(s => { if (s.ref.current) observer.observe(s.ref.current); });
    return () => observer.disconnect();
  }, []);

  const photographer = staticPhotographer || (dbVendor ? mapDbVendorToProfile(dbVendor, dbTags) : null);

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
        <button onClick={() => navigate(serviceConfig.path)} className="pp-back-btn">← Back to {serviceConfig.title}</button>
      </div>
    );
  }

  const isBookmarked   = !!(bookmarks && bookmarks[photographer.bookmarkId ?? photographer.id]);
  const portfolioImages = photographer.isDbItem
    ? dbPortfolio.map(p => ({ url: p.image_url, caption: p.caption, tags: p.tags || [] }))
    : (PORTFOLIO_SETS[photographer.id] || PORTFOLIO_SETS[1]).map(url => ({ url, caption: null, tags: [] }));
  const heroCover     = photographer.cover || portfolioImages[0]?.url || '';
  const totalReviews  = reviews.length;
  const avgRating     = totalReviews > 0 ? reviews.reduce((s, r) => s + Number(r.rating), 0) / totalReviews : photographer.rating;
  const servicesOffered = serviceConfig.id === 'photography'
    ? SERVICES_OFFERED
    : [...new Set([...photographer.type, ...photographer.tags, serviceConfig.defaultSpecialty])];

  const handleBookmark = () => {
    onBookmarkToggle({ id: photographer.bookmarkId ?? photographer.id, name: photographer.name, image: heroCover, type: serviceConfig.bookmarkType });
  };

  // Submit review → POST /api/reviews
  const handleSubmitReview = async () => {
    if (reviewRating === 0) { setReviewError('Please select a rating.'); return; }
    if (!reviewText.trim()) { setReviewError('Please write your review.'); return; }

    setReviewSubmitting(true);
    setReviewError('');

    const payload = {
      client_name: user?.name || contactForm.name || 'Anonymous',
      message: reviewText,
      rating: Math.ceil(reviewRating / 2), // convert 1-10 scale to 1-5
      approved: false,
    };

    try {
      const res  = await fetch(`${API}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setReviewSuccess('Review submitted! It will appear after approval.');
        setReviewText(''); setReviewRating(0); setBudget('');
        setTimeout(() => setReviewSuccess(''), 5000);
      } else {
        setReviewError('Something went wrong. Please try again.');
      }
    } catch { setReviewError('Could not connect to server.'); }
    setReviewSubmitting(false);
  };

  // Send message → POST /api/queries
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
      const res  = await fetch(`${API}/queries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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

  // Rating bar counts
  const ratingCounts = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.round(Number(r.rating)) === stars).length,
  }));

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
              <span className="pp-hero-reviews">({totalReviews} reviews)</span>
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
            <a href="#contact" className="pp-contact-btn">Add To Your Event</a>
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
                  <div key={i} className="pp-album-card"><img src={img.url} alt={`Album ${i+1}`} loading="lazy" /><div className="pp-album-label">Wedding Album {i+1}</div></div>
                ))}
              </div>
            )}
            {activeTab === 'videos' && (
              <div className="pp-videos-grid">
                {portfolioImages.slice(0, 3).map((img, i) => (
                  <div key={i} className="pp-video-card">
                    <img src={img.url} alt={`Video ${i+1}`} loading="lazy" />
                    <div className="pp-video-play"><svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor"><circle cx="16" cy="16" r="15" fill="rgba(0,0,0,0.5)" /><polygon points="13,10 24,16 13,22" fill="white" /></svg></div>
                    <div className="pp-video-label">Highlight Reel {i+1}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── ABOUT ── */}
          <section id="about" ref={aboutRef} className="pp-section">
            <h2 className="pp-section-title">About {photographer.name}</h2>
            <p className="pp-about-text">{photographer.name} is a Lucknow-based {serviceConfig.defaultSpecialty.toLowerCase()} vendor for weddings and celebrations. Their portfolio, contact details, pricing, and service tags are managed from your admin vendor section.</p>
            <p className="pp-about-text">Use this profile to review their uploaded work, compare styles, and contact the vendor for availability and package details.</p>

            <h3 className="pp-subsection-title">Services Offered</h3>
            <ul className="pp-services-list">
              {servicesOffered.map(s => (
                <li key={s} className="pp-service-item">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {s}
                </li>
              ))}
            </ul>

            <div className="pp-info-grid">
              {[['Travels to Venue','Yes, pan-India travel available'],['Payment Terms','Upto 25% Advance'],['Travel Cost','Outstation travel & stay borne by client'],['Delivery Time','2 weeks after event']].map(([label, val]) => (
                <div key={label} className="pp-info-card"><div className="pp-info-label">{label}</div><div className="pp-info-val">{val}</div></div>
              ))}
            </div>

            <div className="pp-tags-section">
              <h3 className="pp-subsection-title">Specialities</h3>
              <div className="pp-tags-wrap">
                {photographer.tags.map(t => <span key={t} className="pp-tag">🏅 {t}</span>)}
                {photographer.type.map(t => <span key={t} className="pp-tag pp-tag-type">{t}</span>)}
              </div>
            </div>
          </section>

          {/* ── REVIEWS ── */}
          <section id="reviews" ref={reviewsRef} className="pp-section">
            <h2 className="pp-section-title">Reviews ({totalReviews})</h2>

            <div className="pp-reviews-summary">
              <div className="pp-rating-big">
                <span className="pp-rating-big-val">{avgRating.toFixed(1)}</span>
                <RatingStars rating={avgRating} />
                <span className="pp-rating-big-count">{totalReviews} reviews</span>
              </div>
              <div className="pp-rating-bars">
                {ratingCounts.map(({ stars, count }) => (
                  <RatingBar key={stars} stars={stars} count={count} total={totalReviews} />
                ))}
              </div>
            </div>

            {/* Reviews list from DB */}
            <div className="pp-reviews-list">
              {reviewsLoading ? (
                <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <p style={{ color: '#9e8e7a', fontSize: 13 }}>No reviews yet. Be the first to review!</p>
              ) : (
                reviews.map(r => <ReviewCard key={r.id} review={r} />)
              )}
            </div>

            {/* Write a Review */}
            <div className="pp-write-review">
              <h3 className="pp-subsection-title">Write a Review</h3>

              {reviewSuccess && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
                  {reviewSuccess}
                </div>
              )}
              {reviewError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
                  {reviewError}
                </div>
              )}

              <div className="pp-star-picker">
                <span className="pp-star-picker-label">Rate Vendor *</span>
                <div className="pp-star-row">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      className={`pp-star-pick ${n <= (hoverRating || reviewRating) ? 'active' : ''}`}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => { setReviewRating(n); setReviewError(''); }}
                    />
                  ))}
                </div>
              </div>

              <textarea
                className="pp-review-textarea"
                placeholder="Tell us about your experience *"
                value={reviewText}
                onChange={e => { setReviewText(e.target.value); setReviewError(''); }}
                rows={5}
              />

              <input
                type="text"
                className="pp-review-budget-input"
                placeholder="How much did you spend on this vendor? (optional)"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />

              <div className="pp-review-footer">
                <button className="pp-add-photos-btn">Add Photos</button>
                <button className="pp-submit-review-btn" onClick={handleSubmitReview} disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* ── SIDEBAR ── */}
        <aside className="pp-sidebar" id="contact">
          <div className="pp-pricing-card">
            <h3 className="pp-pricing-title">Per Day Price</h3>
            <div className="pp-pricing-row">
              <div className="pp-pricing-item">
                <div className="pp-pricing-amount">₹{photographer.pricePerDay.toLocaleString('en-IN')}</div>
                <div className="pp-pricing-label">{photographer.media.join(' + ')}</div>
              </div>
            </div>
            <div className="pp-event-types">{photographer.type.map(t => <span key={t} className="pp-event-pill">{t}</span>)}</div>
            <div className="pp-award-tags">{photographer.tags.map(t => <span key={t} className="pp-award-pill">🏅 {t}</span>)}</div>
          </div>

          {/* Contact Form → /api/queries */}
          <div className="pp-contact-card">
            <h3 className="pp-contact-title">Send a Message</h3>
            <p className="pp-contact-subtitle">Complete info ensures accurate and timely responses</p>

            {messageError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#b91c1c' }}>
                {messageError}
              </div>
            )}

            <input type="text" className="pp-form-input" placeholder="Full name *" value={contactForm.name} onChange={e => { setContactForm({ ...contactForm, name: e.target.value }); setMessageError(''); }} />
            <input type="tel" className="pp-form-input" placeholder="+91 Phone number *" value={contactForm.phone} onChange={e => { setContactForm({ ...contactForm, phone: e.target.value }); setMessageError(''); }} />
            <input type="email" className="pp-form-input" placeholder="Email address" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
            <input type="date" className="pp-form-input" value={contactForm.date} onChange={e => setContactForm({ ...contactForm, date: e.target.value })} />
            <textarea className="pp-form-textarea" placeholder="Details about your event" value={contactForm.details} onChange={e => setContactForm({ ...contactForm, details: e.target.value })} rows={3} />

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
    </div>
  );
} 
