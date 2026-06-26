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

// Maps DB vendor to the same shape as static PHOTOGRAPHERS
function mapDbVendorToProfile(vendor, tags) {
  const typeFromSpecialty = vendor.specialty
    ? vendor.specialty.split(',').map(s => s.trim()).filter(Boolean)
    : ['Photography'];
  return {
    id: vendor.id,
    bookmarkId: `db_${vendor.id}`,
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

// ── Portfolio Carousel (Best Works) ───────────────────────────────────────
const CAROUSEL_CSS = `
  .pp-carousel { position:relative; border-radius:14px; overflow:hidden; background:#000; margin-bottom:20px; border:0.5px solid var(--border-soft,rgba(255,255,255,0.08)); }
  .pp-carousel-stage { position:relative; width:100%; height:480px; overflow:hidden; background:#15120D; }
  .pp-carousel-img { width:100%; height:100%; object-fit:cover; display:block; position:absolute; inset:0; transition:opacity .35s ease, transform .35s ease; }
  .pp-carousel-img.entering { opacity:0; transform:scale(1.03); }
  .pp-carousel-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 48%); pointer-events:none; }
  .pp-carousel-counter { position:absolute; top:14px; right:14px; background:rgba(15,13,10,.65); backdrop-filter:blur(6px); color:#F0A020; font-size:11px; padding:4px 11px; border-radius:20px; border:.5px solid rgba(212,134,10,.3); z-index:5; }
  .pp-carousel-nav { position:absolute; top:50%; transform:translateY(-50%); width:38px; height:38px; border-radius:50%; background:rgba(15,13,10,.55); backdrop-filter:blur(6px); border:.5px solid rgba(212,134,10,.3); color:#F5EDD8; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .18s,transform .15s; z-index:5; }
  .pp-carousel-nav:hover { background:rgba(212,134,10,.55); transform:translateY(-50%) scale(1.08); }
  .pp-carousel-prev { left:14px; }
  .pp-carousel-next { right:14px; }
  .pp-carousel-caption { position:absolute; left:16px; bottom:52px; right:96px; color:#F5EDD8; font-size:14px; font-weight:500; z-index:5; text-shadow:0 1px 4px rgba(0,0,0,.6); }
  .pp-carousel-caption-sub { position:absolute; left:16px; bottom:34px; right:96px; color:rgba(245,237,216,0.55); font-size:12px; z-index:5; }
  .pp-carousel-ptags { position:absolute; left:16px; bottom:14px; display:flex; gap:6px; flex-wrap:wrap; z-index:5; }
  .pp-carousel-ptag { font-size:10px; padding:3px 10px; border-radius:20px; background:rgba(212,134,10,.2); color:#F0A020; border:.5px solid rgba(212,134,10,.35); backdrop-filter:blur(4px); }
  .pp-carousel-thumbs { display:flex; gap:8px; padding:10px; overflow-x:auto; background:#15120D; scrollbar-width:none; }
  .pp-carousel-thumbs::-webkit-scrollbar { display:none; }
  .pp-carousel-thumb { flex:0 0 auto; width:72px; height:52px; border-radius:7px; overflow:hidden; cursor:pointer; opacity:.45; border:1.5px solid transparent; transition:opacity .15s, border-color .15s; }
  .pp-carousel-thumb:hover { opacity:.75; }
  .pp-carousel-thumb.active { opacity:1; border-color:#D4860A; }
  .pp-carousel-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .pp-carousel-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:320px; color:#7A6E5C; font-size:13px; background:#1A1610; border-radius:14px; border:0.5px dashed rgba(255,255,255,0.1); margin-bottom:20px; gap:10px; }
`;

function PortfolioCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  const [sliding, setSliding] = useState(false);

  useEffect(() => { setIdx(0); }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="pp-carousel-empty">
        <style>{CAROUSEL_CSS}</style>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.4">
          <rect x="4" y="8" width="32" height="24" rx="3" stroke="#F0A020" strokeWidth="1.5"/>
          <circle cx="14" cy="17" r="3" stroke="#F0A020" strokeWidth="1.2"/>
          <path d="M4 28l8-7 6 5 4-4 10 9" stroke="#F0A020" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
        No portfolio images uploaded yet
      </div>
    );
  }

  const total = images.length;
  const current = images[idx];

  const goTo = (i) => {
    if (i === idx || sliding) return;
    setSliding(true);
    setTimeout(() => { setIdx(i); setSliding(false); }, 300);
  };

  return (
    <div className="pp-carousel">
      <style>{CAROUSEL_CSS}</style>
      <div className="pp-carousel-stage">
        <img
          key={current.url}
          src={current.url}
          alt={current.caption || `Portfolio ${idx + 1}`}
          className={`pp-carousel-img${sliding ? ' entering' : ''}`}
        />
        <div className="pp-carousel-overlay" />
        {total > 1 && <div className="pp-carousel-counter">{idx + 1} / {total}</div>}
        {current.caption && <div className="pp-carousel-caption">{current.caption}</div>}
        {current.subcaption && <div className="pp-carousel-caption-sub">{current.subcaption}</div>}
        {current.tags?.length > 0 && (
          <div className="pp-carousel-ptags">
            {current.tags.map((t, i) => <span key={i} className="pp-carousel-ptag">{t}</span>)}
          </div>
        )}
        {total > 1 && (
          <>
            <button className="pp-carousel-nav pp-carousel-prev" onClick={() => goTo((idx - 1 + total) % total)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="pp-carousel-nav pp-carousel-next" onClick={() => goTo((idx + 1) % total)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="pp-carousel-thumbs">
          {images.map((img, i) => (
            <div key={i} className={`pp-carousel-thumb${i === idx ? ' active' : ''}`} onClick={() => goTo(i)}>
              <img src={img.url} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Albums Grid ───────────────────────────────────────────────────────────
// Groups portfolio images by caption — each caption = one album/work
const ALBUMS_CSS = `
  .pp-albums-wrap { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .pp-album-tile { position:relative; border-radius:12px; overflow:hidden; cursor:pointer; aspect-ratio:4/3; background:#1A1610; border:0.5px solid rgba(245,158,11,0.1); transition:transform .22s,box-shadow .22s,border-color .22s; }
  .pp-album-tile:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(0,0,0,0.5); border-color:rgba(245,158,11,0.35); }
  .pp-album-tile img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .4s; }
  .pp-album-tile:hover img { transform:scale(1.06); }
  .pp-album-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.1) 55%,transparent 100%); }
  .pp-album-count { position:absolute; top:10px; right:10px; background:rgba(212,134,10,0.88); color:#0F0D0A; font-size:10px; font-weight:700; padding:3px 9px; border-radius:20px; display:flex;align-items:center;gap:4px; }
  .pp-album-info { position:absolute; bottom:0; left:0; right:0; padding:14px 14px 12px; }
  .pp-album-name { font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:400; color:#F5EDD8; margin-bottom:3px; line-height:1.3; }
  .pp-album-sub { font-size:11px; color:rgba(245,237,216,0.45); }
  .pp-album-no-img { display:flex;align-items:center;justify-content:center;height:100%;color:rgba(245,158,11,0.2);font-size:48px; }
  .pp-album-modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(8px); }
  .pp-album-modal { background:#1C160A;border:0.5px solid rgba(245,158,11,0.2);border-radius:18px;overflow:hidden;max-width:900px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 40px 100px rgba(0,0,0,0.7); }
  .pp-album-modal-header { padding:18px 22px 14px;border-bottom:0.5px solid rgba(245,158,11,0.1);display:flex;align-items:center;justify-content:space-between; }
  .pp-album-modal-title { font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:#F5EDD8; }
  .pp-album-modal-meta { font-size:12px;color:rgba(245,158,11,0.45);margin-top:2px; }
  .pp-album-modal-close { width:32px;height:32px;border-radius:50%;background:rgba(245,158,11,0.1);border:0.5px solid rgba(245,158,11,0.2);color:#F0A020;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:background .15s; }
  .pp-album-modal-close:hover { background:rgba(245,158,11,0.2); }
  .pp-album-modal-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:16px;overflow-y:auto; }
  .pp-album-modal-img { aspect-ratio:4/3;border-radius:8px;overflow:hidden;cursor:pointer; }
  .pp-album-modal-img img { width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s; }
  .pp-album-modal-img:hover img { transform:scale(1.05); }
  .pp-album-modal-img-caption { font-size:11px;color:rgba(245,158,11,0.4);margin-top:5px;text-align:center; }
  @media(max-width:640px){ .pp-albums-wrap{grid-template-columns:1fr 1fr;} .pp-album-modal-grid{grid-template-columns:1fr 1fr;} }
`;

function AlbumsGrid({ portfolio }) {
  const [openAlbum, setOpenAlbum] = useState(null);

  // Group images by caption — each unique caption = one album
  const albums = (() => {
    const map = {};
    const noCaption = [];
    portfolio.forEach(img => {
      const key = (img.caption || '').trim();
      if (!key) { noCaption.push(img); return; }
      if (!map[key]) map[key] = [];
      map[key].push(img);
    });
    const result = Object.entries(map).map(([name, images]) => ({ name, images }));
    // uncaptioned images get their own "Miscellaneous" album if any
    if (noCaption.length > 0) result.push({ name: 'Miscellaneous', images: noCaption });
    return result;
  })();

  if (albums.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(245,158,11,0.3)', fontFamily: 'DM Sans,sans-serif', fontSize: 13 }}>
        <style>{ALBUMS_CSS}</style>
        No albums yet. Upload portfolio images with captions to create albums.
      </div>
    );
  }

  return (
    <>
      <style>{ALBUMS_CSS}</style>
      <div className="pp-albums-wrap">
        {albums.map((album, ai) => {
          const cover = album.images[0];
          return (
            <div key={ai} className="pp-album-tile" onClick={() => setOpenAlbum(album)}>
              {cover
                ? <img src={cover.image_url} alt={album.name} loading="lazy" />
                : <div className="pp-album-no-img">📷</div>
              }
              <div className="pp-album-overlay" />
              <div className="pp-album-count">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
                {album.images.length}
              </div>
              <div className="pp-album-info">
                <div className="pp-album-name">{album.name}</div>
                <div className="pp-album-sub">{album.images.length} photo{album.images.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Album detail modal */}
      {openAlbum && (
        <div className="pp-album-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setOpenAlbum(null); }}>
          <div className="pp-album-modal">
            <div className="pp-album-modal-header">
              <div>
                <div className="pp-album-modal-title">{openAlbum.name}</div>
                <div className="pp-album-modal-meta">{openAlbum.images.length} photos in this collection</div>
              </div>
              <button className="pp-album-modal-close" onClick={() => setOpenAlbum(null)}>✕</button>
            </div>
            <div className="pp-album-modal-grid">
              {openAlbum.images.map((img, i) => (
                <div key={i}>
                  <div className="pp-album-modal-img">
                    <img src={img.image_url} alt={img.caption || `Photo ${i + 1}`} loading="lazy" />
                  </div>
                  {img.tags?.length > 0 && (
                    <div className="pp-album-modal-img-caption">{img.tags.slice(0, 2).join(' · ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────
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

// ── Main Component ─────────────────────────────────────────────────────────
export default function PhotographerProfilePage({ bookmarks, onBookmarkToggle, serviceConfig = DEFAULT_VENDOR_SERVICE }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const staticPhotographer = serviceConfig.id === 'photography'
    ? PHOTOGRAPHERS.find(p => p.id === parseInt(id))
    : null;

  const [activeSection, setActiveSection] = useState('projects');
  const [activeTab, setActiveTab] = useState('portfolio');

  const [dbVendor, setDbVendor] = useState(null);
  const [dbPortfolio, setDbPortfolio] = useState([]);  // raw DB portfolio rows
  const [dbTags, setDbTags] = useState([]);
  const [dbLoading, setDbLoading] = useState(!staticPhotographer);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [budget, setBudget] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');

  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', date: '', details: '' });
  const [messageSending, setMessageSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState('');

  const projectsRef = useRef(null);
  const aboutRef = useRef(null);
  const reviewsRef = useRef(null);

  const sections = [
    { id: 'projects', label: 'Projects', ref: projectsRef },
    { id: 'about', label: 'About', ref: aboutRef },
    { id: 'reviews', label: 'Reviews', ref: reviewsRef },
  ];

  // Fetch reviews
  useEffect(() => {
    fetch(`${API}/reviews`)
      .then(r => r.json())
      .then(data => { setReviews(Array.isArray(data) ? data : []); setReviewsLoading(false); })
      .catch(() => setReviewsLoading(false));
  }, []);

  // Fetch DB vendor
  useEffect(() => {
    if (staticPhotographer) { setDbLoading(false); return; }
    let cancelled = false;
    setDbLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API}/vendors`);
        const vendors = await res.json();
        const match = Array.isArray(vendors)
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
        const tags = await tagsRes.json();
        if (!cancelled) {
          setDbVendor(match);
          setDbPortfolio(Array.isArray(portfolio) ? portfolio : []);
          setDbTags(Array.isArray(tags) ? tags : []);
        }
      } catch (err) { console.error(err); }
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
    if (dbLoading) return <div className="pp-not-found"><h2>Loading…</h2></div>;
    return (
      <div className="pp-not-found">
        <h2>{serviceConfig.singular} not found</h2>
        <button onClick={() => navigate(serviceConfig.path)} className="pp-back-btn">← Back to {serviceConfig.title}</button>
      </div>
    );
  }

  // ── Build image arrays ──────────────────────────────────────────────────

  // Portfolio (best works) — for the carousel: each DB row becomes one image
  // For static photographers we use the hardcoded portfolio sets
  const STATIC_PORTFOLIO_URLS = [
    "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    "https://images.unsplash.com/photo-1529636798458-92182e662485?w=600&q=80",
    "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80",
    "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=600&q=80",
    "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=600&q=80",
    "https://images.unsplash.com/photo-1525772764200-be829a350797?w=600&q=80",
  ];

  const portfolioImages = photographer.isDbItem
    ? dbPortfolio.map(p => ({
        url: p.image_url,
        caption: p.caption || null,
        subcaption: p.tags?.length > 0 ? p.tags.join(' · ') : null,
        tags: p.tags || [],
      }))
    : STATIC_PORTFOLIO_URLS.map(url => ({ url, caption: null, subcaption: null, tags: [] }));

  // For albums: pass raw DB rows to AlbumsGrid (it reads caption & image_url)
  // Static photographers get simulated albums from the same URLs
  const rawPortfolioForAlbums = photographer.isDbItem
    ? dbPortfolio
    : [
        { image_url: STATIC_PORTFOLIO_URLS[0], caption: 'Sharma Wedding', tags: ['Bridal'] },
        { image_url: STATIC_PORTFOLIO_URLS[1], caption: 'Sharma Wedding', tags: ['Ceremony'] },
        { image_url: STATIC_PORTFOLIO_URLS[2], caption: 'Sharma Wedding', tags: ['Reception'] },
        { image_url: STATIC_PORTFOLIO_URLS[3], caption: 'Gupta Reception', tags: ['Candid'] },
        { image_url: STATIC_PORTFOLIO_URLS[4], caption: 'Gupta Reception', tags: ['Portraits'] },
        { image_url: STATIC_PORTFOLIO_URLS[5], caption: 'Mehendi by the Lake', tags: ['Mehendi'] },
        { image_url: STATIC_PORTFOLIO_URLS[6], caption: 'Mehendi by the Lake', tags: ['Detail'] },
        { image_url: STATIC_PORTFOLIO_URLS[7], caption: 'Pre-Wedding Shoot', tags: ['Outdoor'] },
        { image_url: STATIC_PORTFOLIO_URLS[8], caption: 'Pre-Wedding Shoot', tags: ['Golden Hour'] },
      ];

  const heroCover = photographer.cover || portfolioImages[0]?.url || '';
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((s, r) => s + Number(r.rating), 0) / totalReviews
    : photographer.rating;

  const servicesOffered = serviceConfig.id === 'photography'
    ? ["Candid Photography", "Traditional Photography", "Traditional Videography", "Wedding Films", "Pre-Wedding Shoots", "Pre-Wedding Films", "Drone Shots", "Photo Booth", "Live Screening", "Albums"]
    : [...new Set([...photographer.type, ...photographer.tags, serviceConfig.defaultSpecialty])];

  const isBookmarked = !!(bookmarks && bookmarks[photographer.bookmarkId ?? photographer.id]);

  const handleBookmark = () => {
    onBookmarkToggle({ id: photographer.bookmarkId ?? photographer.id, name: photographer.name, image: heroCover, type: serviceConfig.bookmarkType });
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { setReviewError('Please select a rating.'); return; }
    if (!reviewText.trim()) { setReviewError('Please write your review.'); return; }
    setReviewSubmitting(true); setReviewError('');
    try {
      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: user?.name || 'Anonymous', message: reviewText, rating: Math.ceil(reviewRating / 2), approved: false }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccess('Review submitted! It will appear after approval.');
        setReviewText(''); setReviewRating(0); setBudget('');
        setTimeout(() => setReviewSuccess(''), 5000);
      } else { setReviewError('Something went wrong.'); }
    } catch { setReviewError('Could not connect to server.'); }
    setReviewSubmitting(false);
  };

  const handleSendMessage = async () => {
    if (!contactForm.name || !contactForm.phone) { setMessageError('Name and phone are required.'); return; }
    setMessageSending(true); setMessageError('');
    try {
      const res = await fetch(`${API}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: contactForm.name, email: contactForm.email || '', phone: contactForm.phone,
          message: `[${serviceConfig.singular}: ${photographer.name}]\nDate: ${contactForm.date || 'Not specified'}\n${contactForm.details}`,
        }),
      });
      const data = await res.json();
      if (data.success) { setMessageSent(true); setContactForm({ name: '', phone: '', email: '', date: '', details: '' }); setTimeout(() => setMessageSent(false), 4000); }
      else setMessageError('Something went wrong.');
    } catch { setMessageError('Could not connect to server.'); }
    setMessageSending(false);
  };

  const ratingCounts = [5, 4, 3, 2, 1].map(stars => ({
    stars, count: reviews.filter(r => Math.round(Number(r.rating)) === stars).length,
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to {serviceConfig.title}
          </button>
          <div className="pp-hero-info">
            <div className="pp-hero-name-row">
              <h1 className="pp-hero-name">{photographer.name}</h1>
              {photographer.verified && (
                <span className="pp-verified-badge">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#F59E0B"/><path d="M5 8l2 2 4-4" stroke="#1A1100" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Verified
                </span>
              )}
            </div>
            <div className="pp-hero-meta">
              <span className="pp-hero-location">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/><circle cx="8" cy="6" r="1.5"/></svg>
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
              <a key={s.id} href={`#${s.id}`} className={`pp-subnav-link ${activeSection === s.id ? 'active' : ''}`}>{s.label}</a>
            ))}
          </div>
          <div className="pp-subnav-actions">
            <button className={`pp-bm-btn ${isBookmarked ? 'bookmarked' : ''}`} onClick={handleBookmark}>
              <BookmarkIcon filled={isBookmarked} size={16} color={isBookmarked ? '#c9a84c' : 'currentColor'} />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
            <button className="pp-share-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="M5.5 7.1l5 -3m-5 5l5 3" strokeLinecap="round"/></svg>
              Share
            </button>
            <span className="pp-subnav-price">₹{photographer.pricePerDay.toLocaleString('en-IN')}</span>
            <a href="#contact" className="pp-contact-btn">Contact</a>
          </div>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className="pp-body">
        <div className="pp-main-col">

          {/* ── PROJECTS ── */}
          <section id="projects" ref={projectsRef} className="pp-section">
            <div className="pp-tabs">
              <button className={`pp-tab ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
                Portfolio{portfolioImages.length > 0 ? ` (${portfolioImages.length})` : ''}
              </button>
              <button className={`pp-tab ${activeTab === 'albums' ? 'active' : ''}`} onClick={() => setActiveTab('albums')}>
                Albums
              </button>
            </div>

            {activeTab === 'portfolio' && (
              dbLoading && photographer.isDbItem
                ? <p style={{ color: '#7A6E5C', fontSize: 13 }}>Loading portfolio…</p>
                : <PortfolioCarousel images={portfolioImages} />
            )}

            {activeTab === 'albums' && (
              dbLoading && photographer.isDbItem
                ? <p style={{ color: '#7A6E5C', fontSize: 13 }}>Loading albums…</p>
                : <AlbumsGrid portfolio={rawPortfolioForAlbums} />
            )}
          </section>

          {/* ── ABOUT ── */}
          <section id="about" ref={aboutRef} className="pp-section">
            <h2 className="pp-section-title">About {photographer.name}</h2>
            <p className="pp-about-text">
              {photographer.name} is a {photographer.location}-based {serviceConfig.defaultSpecialty.toLowerCase()} vendor specialising in
              {photographer.type.length > 0 ? ` ${photographer.type.join(', ').toLowerCase()}` : ' professional photography and videography'}.
            </p>
            <p className="pp-about-text">
              Browse the Portfolio tab for their standout best works, or open Albums to see complete collections from individual events.
            </p>

            <h3 className="pp-subsection-title">Services Offered</h3>
            <ul className="pp-services-list">
              {servicesOffered.map(s => (
                <li key={s} className="pp-service-item">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {s}
                </li>
              ))}
            </ul>

            <div className="pp-info-grid">
              {[
                ['Travels to Venue', 'Yes, pan-India travel available'],
                ['Payment Terms', 'Upto 25% Advance'],
                ['Travel Cost', 'Outstation travel & stay borne by client'],
                ['Delivery Time', '2 weeks after event'],
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

            <div className="pp-reviews-list">
              {reviewsLoading ? (
                <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <p style={{ color: '#9e8e7a', fontSize: 13 }}>No reviews yet. Be the first to review!</p>
              ) : (
                reviews.map(r => <ReviewCard key={r.id} review={r} />)
              )}
            </div>

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
                    <button key={n} className={`pp-star-pick ${n <= (hoverRating || reviewRating) ? 'active' : ''}`}
                      onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}
                      onClick={() => { setReviewRating(n); setReviewError(''); }} />
                  ))}
                </div>
              </div>

              <textarea className="pp-review-textarea" placeholder="Tell us about your experience *"
                value={reviewText} onChange={e => { setReviewText(e.target.value); setReviewError(''); }} rows={5} />

              <input type="text" className="pp-review-budget-input"
                placeholder="How much did you spend on this vendor? (optional)"
                value={budget} onChange={e => setBudget(e.target.value)} />

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
              <div className="pp-pricing-amount">₹{photographer.pricePerDay.toLocaleString('en-IN')}</div>
              <div className="pp-pricing-label">{photographer.media?.join(' + ') || serviceConfig.defaultSpecialty}</div>
            </div>
            <div className="pp-event-types">{photographer.type.map(t => <span key={t} className="pp-event-pill">{t}</span>)}</div>
            <div className="pp-award-tags">{photographer.tags.map(t => <span key={t} className="pp-award-pill">🏅 {t}</span>)}</div>
          </div>

          <div className="pp-contact-card">
            <h3 className="pp-contact-title">Send a Message</h3>
            <p className="pp-contact-subtitle">Complete info ensures accurate and timely responses</p>

            {messageError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#b91c1c' }}>
                {messageError}
              </div>
            )}

            <input type="text" className="pp-form-input" placeholder="Full name *"
              value={contactForm.name} onChange={e => { setContactForm({ ...contactForm, name: e.target.value }); setMessageError(''); }} />
            <input type="tel" className="pp-form-input" placeholder="+91 Phone number *"
              value={contactForm.phone} onChange={e => { setContactForm({ ...contactForm, phone: e.target.value }); setMessageError(''); }} />
            <input type="email" className="pp-form-input" placeholder="Email address"
              value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
            <input type="date" className="pp-form-input"
              value={contactForm.date} onChange={e => setContactForm({ ...contactForm, date: e.target.value })} />
            <textarea className="pp-form-textarea" placeholder="Details about your event"
              value={contactForm.details} onChange={e => setContactForm({ ...contactForm, details: e.target.value })} rows={3} />

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