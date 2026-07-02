// src/pages/VendorListingPage.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { YEARS } from "../context/data/photographyData";
import { DEFAULT_VENDOR_SERVICE } from "../context/data/vendorServiceConfig";
import PriceSlider from "../components/PriceSlider";
import { BookmarkButton, FilterOption, FilterPanel, FilterSection, SearchBar } from "../components/CommonControls";
import './VendorListingPage.css';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api';
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function mapVendorToCard(vendor, portfolio, tags, serviceConfig) {
  const coverImg = portfolio[0]?.image_url || vendor.photo_url || '';
  const allTags  = tags.map(t => t.tag);
  const typeFromSpecialty = vendor.specialty
    ? vendor.specialty.split(',').map(s => s.trim()).filter(Boolean)
    : [serviceConfig.defaultSpecialty];
  const portfolioTags = [...new Set(portfolio.flatMap(p => p.tags || []))].slice(0, 3);

  let pricePerDay = vendor.price_per_day ? Number(vendor.price_per_day) : 0;
  let pricingPackages = null;
  let priceRange = null;

  if (vendor.pricing_packages) {
    try {
      pricingPackages = typeof vendor.pricing_packages === 'string'
        ? JSON.parse(vendor.pricing_packages)
        : vendor.pricing_packages;

      const prices = Object.values(pricingPackages).filter(p => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        priceRange = { min: minPrice, max: maxPrice };
        pricePerDay = minPrice;
      }
    } catch {
      // fall back to single price
    }
  }

  return {
    id: `db_${vendor.id}`, _dbId: vendor.id, name: vendor.name,
    location: vendor.location || 'Lucknow',
    rating: 5.0, reviews: 0, pricePerDay,
    pricingPackages, priceRange,
    type: typeFromSpecialty, media: [serviceConfig.filters.mediaOptions[0]],
    year: new Date(vendor.created_at).getFullYear(),
    month: new Date(vendor.created_at).getMonth() + 1,
    verified: false, tags: allTags, portfolioTags,
    cover: coverImg, contact: vendor.contact || '',
    specialty: vendor.specialty || '', portfolio, isDbItem: true,
  };
}

function getRelated(vendor, allVendors) {
  return allVendors
    .filter(v => v.id !== vendor.id && v.type.some(t => vendor.type.includes(t)))
    .concat(allVendors.filter(v => v.id !== vendor.id && !v.type.some(t => vendor.type.includes(t))))
    .slice(0, 5);
}

function StarIcon({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="1">
      <path d="M6 1l1.5 3 3.2.5-2.3 2.2.5 3.3L6 8.5l-2.9 1.5.5-3.3L1.3 4.5l3.2-.5z" />
    </svg>
  );
}

function isVendorForService(vendor, serviceConfig) {
  const serviceId = String(vendor.service_id || '').trim();
  if (serviceId === String(serviceConfig.serviceId)) return true;
  return serviceConfig.includeUnassigned && !serviceId;
}

function RatingStars({ rating }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} filled={i <= Math.round(rating)} />)}
    </span>
  );
}

function getVendorDisplay(vendor, serviceConfig) {
  if (vendor.isDbItem) {
    const priceLabel = vendor.priceRange
      ? `₹${vendor.priceRange.min.toLocaleString('en-IN')} - ${vendor.priceRange.max.toLocaleString('en-IN')}`
      : vendor.pricePerDay > 0
        ? `₹${vendor.pricePerDay.toLocaleString('en-IN')}`
        : null;
    return {
      priceLabel,
      priceUnit: serviceConfig.priceUnit,
      badgeLabel: `${serviceConfig.cardIcon} ${vendor.specialty || 'Gallery'}`,
      showVerified: false,
      metaCells: [
        ['Vendor', vendor.name],
        ['Specialty', vendor.specialty || serviceConfig.defaultSpecialty],
        ['Location', vendor.location],
        ['Contact', vendor.contact || 'N/A'],
      ],
    };
  }
  return {
    priceLabel: `₹${vendor.pricePerDay.toLocaleString('en-IN')}`,
    priceUnit: '/ day',
    badgeLabel: vendor.media.join(' + '),
    showVerified: vendor.verified,
    metaCells: [
      ['Location', vendor.location],
      ['Date', `${MONTH_NAMES[vendor.month]} ${vendor.year}`],
      ['Media', vendor.media.join(' + ')],
      ['Price', `₹${vendor.pricePerDay.toLocaleString('en-IN')} / day`],
    ],
  };
}

const EP_STYLES = `
  .ep-wrap { background:#fff; border-radius:16px; border:0.5px solid rgba(0,0,0,0.08); overflow:hidden; margin-bottom:24px; animation:epIn 0.28s cubic-bezier(0.22,1,0.36,1); box-shadow:0 8px 40px rgba(0,0,0,0.10); }
  @keyframes epIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
  .ep-img-col { position:relative; overflow:hidden; min-height:520px; }
  .ep-img-col img.ep-main-img { width:100%; height:100%; object-fit:cover; display:block; position:absolute; inset:0; transition:opacity 0.35s ease, transform 0.35s ease; }
  .ep-img-col img.ep-main-img.ep-slide-enter { opacity:0; transform:scale(1.03); }
  .ep-img-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.30) 0%,transparent 50%); pointer-events:none; z-index:2; }
  .ep-top { display:grid; grid-template-columns:44% 1fr; min-height:520px; }
  .ep-close { position:absolute; top:14px; right:14px; width:32px; height:32px; border-radius:50%; background:rgba(0,0,0,0.35); border:none; cursor:pointer; color:#fff; font-size:16px; display:flex; align-items:center; justify-content:center; transition:background 0.18s; z-index:10; }
  .ep-close:hover { background:rgba(0,0,0,0.6); }
  .ep-bm { position:absolute; top:14px; left:14px; width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:background 0.18s,transform 0.15s; z-index:10; }
  .ep-bm:hover { transform:scale(1.12); }
  .ep-right { padding:28px 32px; display:flex; flex-direction:column; justify-content:space-between; background:#fff; overflow-y:auto; }
  .ep-name { font-family:'Cormorant Garamond',serif; font-size:30px; font-weight:400; color:#1A1714; margin-bottom:6px; line-height:1.2; }
  .ep-meta-row { display:flex; align-items:center; gap:10px; margin-bottom:18px; flex-wrap:wrap; }
  .ep-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }
  .ep-cell { background:#F7F5F2; border-radius:10px; padding:11px 14px; border:0.5px solid rgba(0,0,0,0.07); }
  .ep-cell-label { font-size:9px; letter-spacing:1.1px; text-transform:uppercase; color:#aaa; margin-bottom:4px; font-weight:600; }
  .ep-cell-val { font-size:14px; color:#1A1714; font-weight:500; }
  .ep-types { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:18px; }
  .ep-type-pill { font-size:12px; padding:5px 14px; border-radius:20px; background:#EEEDFE; color:#534AB7; font-weight:500; }
  .ep-tags { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:16px; }
  .ep-award-pill { font-size:11px; padding:4px 12px; border-radius:20px; background:#F7F5F2; color:#888; border:0.5px solid rgba(0,0,0,0.08); }
  .ep-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:auto; padding-top:16px; }
  .ep-price { display:flex; align-items:baseline; gap:2px; }
  .ep-price-sym { font-size:15px; color:#1A1714; }
  .ep-price-val { font-size:26px; font-weight:500; color:#1A1714; font-family:'Cormorant Garamond',serif; }
  .ep-price-unit { font-size:12px; color:#aaa; margin-left:4px; }
  .ep-cta { font-family:inherit; font-size:13px; font-weight:500; background:#534AB7; color:#fff; border:none; padding:13px 28px; border-radius:10px; cursor:pointer; transition:background 0.18s; white-space:nowrap; }
  .ep-cta:hover { background:#3f389e; }
  .ep-cta-amber { background:#D4860A !important; }
  .ep-cta-amber:hover { background:#b86d08 !important; }
  .ep-related-label { border-top:0.5px solid rgba(0,0,0,0.07); padding:14px 20px 10px; font-size:10px; letter-spacing:1.2px; text-transform:uppercase; color:#aaa; font-weight:600; }
  .ep-related-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; padding:0 16px 16px; }
  .ep-rel-card { border-radius:10px; overflow:hidden; cursor:pointer; aspect-ratio:4/3; position:relative; transition:transform 0.15s; }
  .ep-rel-card:hover { transform:scale(1.05); }
  .ep-rel-card img { width:100%; height:100%; object-fit:cover; display:block; }
  .ep-rel-title { position:absolute; bottom:0; left:0; right:0; padding:18px 8px 7px; background:linear-gradient(to top,rgba(0,0,0,0.60),transparent); font-size:11px; color:#fff; font-weight:500; line-height:1.3; }
  .ep-verified-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:500; color:#534AB7; background:#EEEDFE; padding:3px 9px; border-radius:20px; }
  .ep-specialty-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:500; color:#D4860A; background:rgba(212,134,10,0.10); padding:3px 9px; border-radius:20px; border:0.5px solid rgba(212,134,10,0.25); }

  .ep-carousel-nav { position:absolute; bottom:50%; transform:translateY(50%); z-index:10; width:36px; height:36px; border-radius:50%; background:rgba(0,0,0,0.45); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.2); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.18s, transform 0.15s; }
  .ep-carousel-nav:hover { background:rgba(0,0,0,0.72); transform:translateY(50%) scale(1.1); }
  .ep-carousel-prev { left:12px; }
  .ep-carousel-next { right:12px; }
  .ep-carousel-dots { position:absolute; bottom:14px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:10; }
  .ep-carousel-dot { width:6px; height:6px; border-radius:50%; background:rgba(255,255,255,0.4); cursor:pointer; transition:background 0.2s, transform 0.2s; border:none; padding:0; }
  .ep-carousel-dot.active { background:#fff; transform:scale(1.3); }
  .ep-carousel-counter { position:absolute; top:14px; right:52px; background:rgba(0,0,0,0.50); backdrop-filter:blur(4px); color:#fff; font-size:11px; padding:4px 10px; border-radius:20px; border:0.5px solid rgba(255,255,255,0.2); z-index:10; }
  .ep-ptag { font-size:11px; padding:4px 12px; border-radius:20px; background:rgba(212,134,10,0.1); color:#D4860A; border:0.5px solid rgba(212,134,10,0.25); }
`;

// ── ExpandPanel with image carousel ──────────────────────────────────────────
function ExpandPanel({ vendor, allVendors, onClose, onRelatedClick, isBookmarked, onBookmark, navigate, serviceConfig, pickContext, onAddToEvent }) {
  const related = getRelated(vendor, allVendors);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sliding, setSliding] = useState(false);
  const display = useMemo(() => getVendorDisplay(vendor, serviceConfig), [vendor, serviceConfig]);

  const images = vendor.isDbItem && vendor.portfolio?.length > 0
    ? vendor.portfolio.map(p => ({ url: p.image_url, caption: p.caption, tags: p.tags }))
    : [{ url: vendor.cover, caption: null, tags: [] }];

  const total = images.length;

  const goTo = (idx) => {
    if (idx === activeIdx || sliding) return;
    setSliding(true);
    setTimeout(() => {
      setActiveIdx(idx);
      setSliding(false);
    }, 280);
  };

  const prev = () => goTo((activeIdx - 1 + total) % total);
  const next = () => goTo((activeIdx + 1) % total);

  const currentImg = images[activeIdx];
  const isPicking = pickContext?.type === 'vendor';

  return (
    <div className="ep-wrap">
      <style>{EP_STYLES}</style>
      <div className="ep-top">

        <div className="ep-img-col">
          <img
            src={currentImg.url}
            alt={vendor.name}
            key={currentImg.url}
            className={`ep-main-img${sliding ? ' ep-slide-enter' : ''}`}
          />
          <div className="ep-img-overlay" />

          <BookmarkButton
            className="ep-bm"
            active={isBookmarked}
            onClick={onBookmark}
            size={40}
            iconSize={20}
            activeColor="rgba(201,168,76,0.88)"
            idleColor="rgba(0,0,0,0.38)"
            style={{ boxShadow: isBookmarked ? '0 2px 12px rgba(201,168,76,0.4)' : 'none' }}
          />

          <button className="ep-close" onClick={onClose}>✕</button>

          {total > 1 && (
            <div className="ep-carousel-counter">{activeIdx + 1} / {total}</div>
          )}

          {total > 1 && (
            <>
              <button className="ep-carousel-nav ep-carousel-prev" onClick={prev} title="Previous">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="ep-carousel-nav ep-carousel-next" onClick={next} title="Next">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {total > 1 && (
            <div className="ep-carousel-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`ep-carousel-dot${i === activeIdx ? ' active' : ''}`}
                  onClick={() => goTo(i)}
                  title={`Photo ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="ep-right">
          <div>
            <div className="ep-name">{vendor.name}</div>
            <div className="ep-meta-row">
              {vendor.isDbItem ? (
                <span className="ep-specialty-badge">{display.badgeLabel}</span>
              ) : (
                <>
                  <RatingStars rating={vendor.rating} />
                  <span style={{ fontSize:13, fontWeight:500, color:'#1A1714' }}>{vendor.rating.toFixed(1)}</span>
                  <span style={{ fontSize:12, color:'#aaa' }}>({vendor.reviews} reviews)</span>
                  {display.showVerified && (
                    <span className="ep-verified-badge">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="#534AB7"/>
                        <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Verified
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="ep-grid">
              {display.metaCells.map(([label, val]) => (
                <div key={label} className="ep-cell"><div className="ep-cell-label">{label}</div><div className="ep-cell-val">{val}</div></div>
              ))}
              {vendor.isDbItem && currentImg.caption && (
                <div className="ep-cell" style={{ gridColumn:'1/-1' }}>
                  <div className="ep-cell-label">About this photo</div>
                  <div className="ep-cell-val" style={{ fontSize:13, fontWeight:400 }}>{currentImg.caption}</div>
                </div>
              )}
            </div>

            <div className="ep-types">
              {vendor.type.map(t => <span key={t} className="ep-type-pill">{t}</span>)}
            </div>

            {vendor.tags.length > 0 && (
              <div className="ep-tags">
                {vendor.tags.map(t => <span key={t} className="ep-award-pill">🏅 {t}</span>)}
              </div>
            )}

            {vendor.isDbItem && currentImg.tags?.length > 0 && (
              <div className="ep-tags">
                {currentImg.tags.map((t, i) => <span key={i} className="ep-ptag">{t}</span>)}
              </div>
            )}
          </div>

          <div className="ep-footer">
            {vendor.isDbItem ? (
              <>
                <div style={{ fontSize:12, color:'#9e8e7a' }}>{total} portfolio image{total !== 1 ? 's' : ''}</div>
                <button className="ep-cta ep-cta-amber" onClick={() => navigate(`${serviceConfig.path}/${vendor._dbId}`)}>View Profile</button>
                {isPicking && (
                  <button className="ep-cta" onClick={() => onAddToEvent(vendor)}>+ Add to Event</button>
                )}
              </>
            ) : (
              <>
                <div className="ep-price">
                  <span className="ep-price-sym">₹</span>
                  <span className="ep-price-val">{vendor.pricePerDay.toLocaleString('en-IN')}</span>
                  <span className="ep-price-unit">{display.priceUnit}</span>
                </div>
                <button className="ep-cta" onClick={() => navigate(`${serviceConfig.path}/${vendor.id}`)}>View Profile</button>
                {isPicking ? (
                  <button className="ep-cta" onClick={() => onAddToEvent(vendor)}>+ Add to Event</button>
                ) : (
                  <button className="ep-cta">Add to Your Event</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <>
          <div className="ep-related-label">More like this</div>
          <div className="ep-related-grid">
            {related.map(r => (
              <div key={r.id} className="ep-rel-card" onClick={() => onRelatedClick(r)}>
                <img src={r.cover} alt={r.name} />
                <div className="ep-rel-title">{r.name}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── VendorCard ────────────────────────────────────────────────────────────────
function VendorCard({ vendor, isOpen, onOpen, onClose, isBookmarked, onBookmark, serviceConfig, pickContext, onAddToEvent }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const display = useMemo(() => getVendorDisplay(vendor, serviceConfig), [vendor, serviceConfig]);
  const handleBookmark = (e) => { e.stopPropagation(); onBookmark(vendor.id); };
  const isPicking = pickContext?.type === 'vendor';

  return (
    <div
      className="vendor-card common-card-shell"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isOpen ? onClose() : onOpen(vendor.id)}
      style={{
        outline: isOpen ? '2px solid #534AB7' : 'none',
        outlineOffset: 2,
      }}
    >
      <div className="vendor-img-wrap common-card-media">
        <img src={vendor.cover} alt={vendor.name} className="vendor-img" />

        <div className="vendor-media-badge">{display.badgeLabel}</div>

        {display.showVerified && (
          <div className="vendor-verified">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="#534AB7"/>
              <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Verified
          </div>
        )}

        {vendor.isDbItem && vendor.portfolio?.length > 1 && (
          <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', color:'#fff', fontSize:10, fontWeight:500, padding:'3px 8px', borderRadius:20, border:'0.5px solid rgba(255,255,255,0.2)' }}>
            +{vendor.portfolio.length} photos
          </div>
        )}

        <BookmarkButton
          active={isBookmarked}
          visible={hovered}
          onClick={handleBookmark}
          activeColor="rgba(201,168,76,0.88)"
          idleColor="rgba(0,0,0,0.45)"
          hoverColor="rgba(0,0,0,0.70)"
          style={{ position:'absolute', bottom:10, right:10 }}
        />
      </div>

      <div className="vendor-info">
        <div className="vendor-top-row">
          <h3 className="vendor-name">{vendor.name}</h3>
          <div className="vendor-rating">
            <RatingStars rating={vendor.rating} />
            <span className="vendor-rating-val">{vendor.rating.toFixed(1)}</span>
            <span className="vendor-reviews">({vendor.reviews})</span>
          </div>
        </div>

        <div className="vendor-meta">
          <span className="vendor-location">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/>
              <circle cx="8" cy="6" r="1.5"/>
            </svg>
            {vendor.location}
          </span>
          <span className="vendor-date">{MONTH_NAMES[vendor.month]} {vendor.year}</span>
        </div>

        <div className="vendor-types">
          {vendor.isDbItem
            ? vendor.portfolioTags?.map((t, i) => <span key={i} className="type-tag">{t}</span>)
            : vendor.type.map(t => <span key={t} className="type-tag">{t}</span>)
          }
        </div>

        <div className="vendor-bottom-row">
          <div className="vendor-price">
            {display.priceLabel ? (
              <>
                <span className="price-symbol">₹</span>
                <span className="price-val">{display.priceLabel.replace('₹', '')}</span>
                <span className="price-unit">{display.priceUnit}</span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Price on request</span>
            )}
          </div>
          <button
            className="vendor-cta"
            style={vendor.isDbItem ? { color: '#D4860A', borderColor: 'rgba(212,134,10,0.4)' } : undefined}
            onClick={e => {
              e.stopPropagation();
              if (isPicking) { onAddToEvent(vendor); return; }
              navigate(`${serviceConfig.path}/${vendor.isDbItem ? vendor._dbId : vendor.id}`);
            }}
          >
            {isPicking ? '+ Add to Event' : 'View Profile'}
          </button>
        </div>

        <div className="vendor-tags">
          {vendor.tags.slice(0, 2).map(t => <span key={t} className="award-tag">{t}</span>)}
        </div>
      </div>
    </div>
  );
}

export default function VendorListingPage({ bookmarks, onBookmarkToggle, serviceConfig = DEFAULT_VENDOR_SERVICE }) {
  const [priceRange, setPriceRange]       = useState([0, 120000]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [minRating, setMinRating]         = useState(0);
  const [searchQuery, setSearchQuery]     = useState('');
  const [sortBy, setSortBy]               = useState('latest');
  const [view, setView]                   = useState('grid');
  const [openId, setOpenId]               = useState(null);
  const [dbVendors, setDbVendors]         = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // ── Pick mode: arrived here from Create Event to select a vendor ───────
  const pickContext = location.state?.celestePick?.type === 'vendor' ? location.state.celestePick : null;

  const handleAddToEvent = (vendor) => {
    if (!pickContext) return;
    navigate('/create-event', {
      state: {
        celestePickResult: {
          type: 'vendor',
          serviceKey: pickContext.serviceKey,
          vendor: vendor.isDbItem
            ? {
                id: vendor._dbId,
                name: vendor.name,
                specialty: vendor.specialty,
                price_per_day: vendor.pricePerDay,
                photo_url: vendor.cover,
                portfolio: vendor.portfolio,
              }
            : vendor,
        },
      },
    });
  };

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res     = await fetch(`${API}/vendors`);
        const vendors = await res.json();
        const active  = vendors.filter(v => v.is_active && isVendorForService(v, serviceConfig));
        const enriched = await Promise.all(active.map(async (vendor) => {
          const [portRes, tagsRes] = await Promise.all([
            fetch(`${API}/vendors/${vendor.id}/portfolio`),
            fetch(`${API}/vendors/${vendor.id}/tags`),
          ]);
          const portfolio = await portRes.json();
          const tags      = await tagsRes.json();
          return mapVendorToCard(vendor, Array.isArray(portfolio) ? portfolio : [], Array.isArray(tags) ? tags : [], serviceConfig);
        }));
        setDbVendors(enriched);
      } catch {
        // Ignore vendor fetch errors silently.
      }
    };
    fetchVendors();
  }, [serviceConfig]);

  const allVendors = useMemo(() => {
    const staticVendors = serviceConfig.staticData || [];
    return [...staticVendors, ...dbVendors];
  }, [serviceConfig.staticData, dbVendors]);
  const openVendor = useMemo(() => allVendors.find(v => v.id === openId) || null, [allVendors, openId]);

  const toggleBookmark = (id) => {
    const vendor = allVendors.find(p => p.id === id);
    if (!vendor) return;
    onBookmarkToggle({ id: vendor.id, name: vendor.name, image: vendor.cover, type: serviceConfig.bookmarkType });
  };

  const expandPanelRef = useRef(null);

  const handleOpen = (id) => {
    setOpenId(id);
    setTimeout(() => {
      expandPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };
  const handleClose = () => setOpenId(null);
  const toggleArr   = (arr, setArr, val) => setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  const clearAll    = () => { setPriceRange([0,120000]); setSelectedTypes([]); setSelectedMedia([]); setSelectedYears([]); setMinRating(0); setSearchQuery(''); setOpenId(null); };

  const filtered = useMemo(() => {
    let list = allVendors.filter(p => {
      const effectivePrice = p.priceRange ? p.priceRange.min : p.pricePerDay;
      if (effectivePrice > 0 && (effectivePrice < priceRange[0] || effectivePrice > priceRange[1])) return false;
      if (p.rating < minRating) return false;
      if (!p.isDbItem && selectedMedia.length && !selectedMedia.some(m => p.media.includes(m))) return false;

      if (selectedTypes.length && !selectedTypes.some(t => p.type.includes(t))) return false;
      if (selectedYears.length && !selectedYears.includes(p.year)) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === 'latest')     return (b.year*100+b.month)-(a.year*100+a.month);
      if (sortBy === 'rating')     return b.rating-a.rating;
      if (sortBy === 'price_asc')  return (a.priceRange?.min ?? a.pricePerDay) - (b.priceRange?.min ?? b.pricePerDay);
      if (sortBy === 'price_desc') return (b.priceRange?.min ?? b.pricePerDay) - (a.priceRange?.min ?? a.pricePerDay);
      return 0;
    });
    return list;
  }, [allVendors, priceRange, selectedTypes, selectedMedia, selectedYears, minRating, searchQuery, sortBy]);

  const activeFilterCount = selectedTypes.length + selectedMedia.length + selectedYears.length + (minRating > 0 ? 1 : 0);

  return (
    <div className="photo-page">
      {pickContext && (
        <div style={{
          background: '#D4860A', color: '#0F0D0A', padding: '10px 32px',
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 64, zIndex: 60,
        }}>
          <span>Picking a vendor for your event — click "Add to Event" on the vendor you want.</span>
          <button
            onClick={() => navigate('/create-event')}
            style={{ background: 'rgba(15,13,10,0.15)', border: '1px solid rgba(15,13,10,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#0F0D0A', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="photo-page-header">
        <div className="photo-page-header-inner">
          <div>
            <p className="page-breadcrumb">{serviceConfig.breadcrumb}</p>
            <h1 className="page-title">{serviceConfig.title}</h1>
            <p className="page-subtitle"><strong>{filtered.length}</strong> {serviceConfig.plural} in Lucknow</p>
          </div>
          <div className="photo-page-header-right">
            <SearchBar
              placeholder={serviceConfig.searchPlaceholder}
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              className="search-box"
              inputClassName="search-input"
            />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
              <option value="latest">Latest First</option>
              <option value="rating">Top Rated</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
            <div className="view-toggle">
              <button className={`view-btn ${view==='grid'?'active':''}`} onClick={() => setView('grid')}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
                Grid
              </button>
              <button className={`view-btn ${view==='list'?'active':''}`} onClick={() => setView('list')}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2.5" rx="1"/><rect x="1" y="6.8" width="14" height="2.5" rx="1"/><rect x="1" y="11.5" width="14" height="2.5" rx="1"/></svg>
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <FilterPanel
          className="filter-sidebar"
          headerClassName="filter-sidebar-head"
          titleClassName="filter-sidebar-title"
          countClassName="filter-count-badge"
          clearClassName="clear-all-btn"
          activeCount={activeFilterCount}
          onClear={activeFilterCount > 0 ? clearAll : undefined}
        >
          <FilterSection title="Price Range" className="filter-section" titleClassName="filter-section-title" bodyClassName="filter-body"><PriceSlider min={0} max={120000} value={priceRange} onChange={setPriceRange} /></FilterSection>
          <FilterSection title={serviceConfig.filters.mediaLabel} className="filter-section" titleClassName="filter-section-title" bodyClassName="filter-body"><div className="chip-group">{serviceConfig.filters.mediaOptions.map(m => <FilterOption key={m} variant="chip" className="check-chip" label={m} checked={selectedMedia.includes(m)} onChange={() => toggleArr(selectedMedia, setSelectedMedia, m)} />)}</div></FilterSection>
          <FilterSection title={serviceConfig.filters.typeLabel} className="filter-section" titleClassName="filter-section-title" bodyClassName="filter-body"><div className="chip-group">{serviceConfig.filters.typeOptions.map(t => <FilterOption key={t} variant="chip" className="check-chip" label={t} checked={selectedTypes.includes(t)} onChange={() => toggleArr(selectedTypes, setSelectedTypes, t)} />)}</div></FilterSection>
          <FilterSection title="Year" className="filter-section" titleClassName="filter-section-title" bodyClassName="filter-body"><div className="chip-group">{YEARS.map(y => <FilterOption key={y} variant="chip" className="check-chip" label={String(y)} checked={selectedYears.includes(y)} onChange={() => toggleArr(selectedYears, setSelectedYears, y)} />)}</div></FilterSection>
          <FilterSection title="Minimum Rating" className="filter-section" titleClassName="filter-section-title" bodyClassName="filter-body">
            <div className="rating-options">
              {[4.5, 4.0, 3.5, 0].map(r => (
                <FilterOption key={r} type="radio" name="rating" variant="rating" className="rating-option" value={r} checked={minRating===r} onChange={() => setMinRating(r)}>
                  {r === 0 ? 'Any rating' : <span style={{ display:'flex', alignItems:'center', gap:5 }}><RatingStars rating={r} /> {r}+</span>}
                </FilterOption>
              ))}
            </div>
          </FilterSection>
        </FilterPanel>

        <main className="results-area">
          <div ref={expandPanelRef}>
            {openVendor && (
              <ExpandPanel
                vendor={openVendor}
                allVendors={filtered}
                onClose={handleClose}
                onRelatedClick={(r) => handleOpen(r.id)}
                isBookmarked={!!bookmarks[openVendor.id]}
                onBookmark={() => toggleBookmark(openVendor.id)}
                navigate={navigate}
                serviceConfig={serviceConfig}
                pickContext={pickContext}
                onAddToEvent={handleAddToEvent}
              />
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{serviceConfig.cardIcon}</div>
              <h3>{serviceConfig.emptyTitle}</h3>
              <p>Try adjusting or <button onClick={clearAll} className="link-btn">clear all</button></p>
            </div>
          ) : (
            <div className={`vendor-grid ${view==='list'?'vendor-list':''}`}>
              {filtered.map(v => (
                <VendorCard key={v.id} vendor={v} isOpen={openId===v.id}
                  onOpen={handleOpen} onClose={handleClose}
                  isBookmarked={!!bookmarks[v.id]} onBookmark={toggleBookmark}
                  serviceConfig={serviceConfig}
                  pickContext={pickContext}
                  onAddToEvent={handleAddToEvent}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}