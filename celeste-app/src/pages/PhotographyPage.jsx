// src/pages/PhotographyPage.jsx
import { useState, useMemo, useRef } from 'react';
import { PHOTOGRAPHERS, EVENT_TYPES, MEDIA_TYPES, YEARS } from "../context/data/photographyData";
import PriceSlider from "../components/PriceSlider";
import { BookmarkIcon } from "../components/BookmarkIcon";
import './PhotographyPage.css';
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── helpers ───────────────────────────────────────────────────────────────
function getRelated(vendor, allVendors) {
  return allVendors
    .filter((v) => v.id !== vendor.id && v.type.some((t) => vendor.type.includes(t)))
    .concat(allVendors.filter((v) => v.id !== vendor.id && !v.type.some((t) => vendor.type.includes(t))))
    .slice(0, 5);
}

// ── sub-components ────────────────────────────────────────────────────────
function StarIcon({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="1">
      <path d="M6 1l1.5 3 3.2.5-2.3 2.2.5 3.3L6 8.5l-2.9 1.5.5-3.3L1.3 4.5l3.2-.5z" />
    </svg>
  );
}

function RatingStars({ rating }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} filled={i <= Math.round(rating)} />)}
    </span>
  );
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="filter-section">
      <button className="filter-section-title" onClick={() => setOpen(o => !o)}>
        {title}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="filter-body">{children}</div>}
    </div>
  );
}

function CheckChip({ label, checked, onChange }) {
  return (
    <label className={`check-chip ${checked ? 'checked' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      {label}
    </label>
  );
}

// ── Expand Panel ──────────────────────────────────────────────────────────
function ExpandPanel({ vendor, allVendors, onClose, onRelatedClick, isBookmarked, onBookmark }) {
  const related = getRelated(vendor, allVendors);

  return (
    <div className="ep-wrap">
      <style>{`
        .ep-wrap {
          grid-column: 1 / -1;
          background: #fff;
          border-radius: 16px;
          border: 0.5px solid rgba(0,0,0,0.08);
          overflow: hidden;
          margin-bottom: 4px;
          animation: epIn 0.28s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
        }
        @keyframes epIn {
          from { opacity:0; transform:translateY(-12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .ep-img-col {
          position: relative;
          overflow: hidden;
          min-height: 520px;   /* ← ADD THIS */
        }
        .ep-img-col img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          position: absolute;  /* ← ADD THIS */
          inset: 0; 
        }
        .ep-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.30) 0%, transparent 50%);
          pointer-events: none;
        }
        .ep-top {
          display: grid;
          grid-template-columns: 44% 1fr;
          min-height: 520px; 
        }
        .ep-close {
          position: absolute;
          top: 14px; right: 14px;
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(0,0,0,0.35);
          border: none;
          cursor: pointer;
          color: #fff;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s;
          z-index: 10;
        }
        .ep-close:hover { background: rgba(0,0,0,0.6); }
        .ep-bm {
          position: absolute;
          bottom: 16px; right: 16px;
          width: 40px; height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
          transition: background 0.18s, transform 0.15s;
          z-index: 10;
        }
        .ep-bm:hover { transform: scale(1.12); }
        .ep-right {
          padding: 28px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #fff;
        }
        .ep-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 30px;
          font-weight: 400;
          color: #1A1714;
          margin-bottom: 6px;
          line-height: 1.2;
        }
        .ep-meta-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .ep-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }
        .ep-cell {
          background: #F7F5F2;
          border-radius: 10px;
          padding: 11px 14px;
          border: 0.5px solid rgba(0,0,0,0.07);
        }
        .ep-cell-label {
          font-size: 9px;
          letter-spacing: 1.1px;
          text-transform: uppercase;
          color: #aaa;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .ep-cell-val {
          font-size: 14px;
          color: #1A1714;
          font-weight: 500;
        }
        .ep-types {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 18px;
        }
        .ep-type-pill {
          font-size: 12px;
          padding: 5px 14px;
          border-radius: 20px;
          background: #EEEDFE;
          color: #534AB7;
          font-weight: 500;
        }
        .ep-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 24px;
        }
        .ep-award-pill {
          font-size: 11px;
          padding: 4px 12px;
          border-radius: 20px;
          background: #F7F5F2;
          color: #888;
          border: 0.5px solid rgba(0,0,0,0.08);
        }
        .ep-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ep-price { display: flex; align-items: baseline; gap: 2px; }
        .ep-price-sym { font-size: 15px; color: #1A1714; }
        .ep-price-val { font-size: 26px; font-weight: 500; color: #1A1714; font-family: 'Cormorant Garamond', serif; }
        .ep-price-unit { font-size: 12px; color: #aaa; margin-left: 4px; }
        .ep-cta {
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          background: #534AB7;
          color: #fff;
          border: none;
          padding: 13px 28px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.18s;
        }
        .ep-cta:hover { background: #3f389e; }
        .ep-related-label {
          border-top: 0.5px solid rgba(0,0,0,0.07);
          padding: 14px 20px 10px;
          font-size: 10px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #aaa;
          font-weight: 600;
        }
        .ep-related-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          padding: 0 16px 16px;
        }
        .ep-rel-card {
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          aspect-ratio: 4/3;
          position: relative;
          transition: transform 0.15s;
        }
        .ep-rel-card:hover { transform: scale(1.05); }
        .ep-rel-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ep-rel-title {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 18px 8px 7px;
          background: linear-gradient(to top, rgba(0,0,0,0.60), transparent);
          font-size: 11px;
          color: #fff;
          font-weight: 500;
          line-height: 1.3;
        }
        .ep-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 500;
          color: #534AB7;
          background: #EEEDFE;
          padding: 3px 9px;
          border-radius: 20px;
        }
      `}</style>

      {/* top */}
      <div className="ep-top">
        {/* left: photo */}
        <div className="ep-img-col">
          <img src={vendor.cover} alt={vendor.name} />
          <div className="ep-img-overlay" />

          {/* close */}
          <button className="ep-close" onClick={onClose}>✕</button>

          {/* bookmark — bottom right only */}
          <button
            className="ep-bm"
            onClick={onBookmark}
            style={{
              background: isBookmarked ? "rgba(83,74,183,0.88)" : "rgba(0,0,0,0.38)",
              color: "#fff",
              boxShadow: isBookmarked ? "0 2px 12px rgba(83,74,183,0.4)" : "none",
            }}
            title={isBookmarked ? "Remove bookmark" : "Save"}
          >
            <BookmarkIcon filled={isBookmarked} size={20} color="#fff" />
          </button>
        </div>

        {/* right: details */}
        <div className="ep-right">
          <div>
            <div className="ep-name">{vendor.name}</div>

            <div className="ep-meta-row">
              <RatingStars rating={vendor.rating} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1714' }}>{vendor.rating.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: '#aaa' }}>({vendor.reviews} reviews)</span>
              {vendor.verified && (
                <span className="ep-verified-badge">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="#534AB7" />
                    <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            {/* meta grid */}
            <div className="ep-grid">
              {[
                ["Location", vendor.location],
                ["Date",     `${MONTH_NAMES[vendor.month]} ${vendor.year}`],
                ["Media",    vendor.media.join(" + ")],
                ["Price",    `₹${vendor.pricePerDay.toLocaleString('en-IN')} / day`],
              ].map(([label, val]) => (
                <div key={label} className="ep-cell">
                  <div className="ep-cell-label">{label}</div>
                  <div className="ep-cell-val">{val}</div>
                </div>
              ))}
            </div>

            {/* event type pills */}
            <div className="ep-types">
              {vendor.type.map((t) => (
                <span key={t} className="ep-type-pill">{t}</span>
              ))}
            </div>

            {/* award tags */}
            {vendor.tags.length > 0 && (
              <div className="ep-tags">
                {vendor.tags.map((t) => (
                  <span key={t} className="ep-award-pill">🏅 {t}</span>
                ))}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="ep-footer">
            <div className="ep-price">
              <span className="ep-price-sym">₹</span>
              <span className="ep-price-val">{vendor.pricePerDay.toLocaleString('en-IN')}</span>
              <span className="ep-price-unit">/ day</span>
            </div>
            <button className="ep-cta">View Profile</button>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <>
          <div className="ep-related-label">More like this</div>
          <div className="ep-related-grid">
            {related.map((r) => (
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

// ── VendorCard ─────────────────────────────────────────────────────────────
function VendorCard({ vendor, isOpen, onOpen, onClose, isBookmarked, onBookmark, allVendors }) {
  const [hovered, setHovered] = useState(false);
  const [bmHovered, setBmHovered] = useState(false);

  const handleBookmark = (e) => {
    e.stopPropagation();
    onBookmark(vendor.id);
  };

  return (
    <>
      <div
  className="vendor-card"
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  onClick={() => isOpen ? onClose() : onOpen(vendor.id)}
  style={{
    outline: isOpen ? '2px solid #534AB7' : 'none',
    outlineOffset: 2,
    display: isOpen ? 'none' : undefined,  // ← ADD THIS LINE
  }}
>
        <div className="vendor-img-wrap">
          <img src={vendor.cover} alt={vendor.name} className="vendor-img" />

          <div className="vendor-media-badge">{vendor.media.join(' + ')}</div>

          {vendor.verified && (
            <div className="vendor-verified">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#534AB7" />
                <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified
            </div>
          )}

          {/* bookmark — bottom right */}
          <button
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: hovered || isBookmarked ? 1 : 0,
              background: isBookmarked
                ? 'rgba(83,74,183,0.88)'
                : bmHovered ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.45)',
              color: '#fff',
              transition: 'opacity 0.15s, background 0.15s, transform 0.15s',
              zIndex: 5,
            }}
            onClick={handleBookmark}
            onMouseEnter={() => setBmHovered(true)}
            onMouseLeave={() => setBmHovered(false)}
            title={isBookmarked ? "Remove bookmark" : "Save"}
          >
            <BookmarkIcon filled={isBookmarked} size={15} color="#fff" />
          </button>
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
                <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" />
                <circle cx="8" cy="6" r="1.5" />
              </svg>
              {vendor.location}
            </span>
            <span className="vendor-date">{MONTH_NAMES[vendor.month]} {vendor.year}</span>
          </div>
          <div className="vendor-types">
            {vendor.type.map(t => <span key={t} className="type-tag">{t}</span>)}
          </div>
          <div className="vendor-bottom-row">
            <div className="vendor-price">
              <span className="price-symbol">₹</span>
              <span className="price-val">{vendor.pricePerDay.toLocaleString('en-IN')}</span>
              <span className="price-unit">/ day</span>
            </div>
            <button className="vendor-cta" onClick={(e) => { e.stopPropagation(); }}>View Profile</button>
          </div>
          <div className="vendor-tags">
            {vendor.tags.slice(0, 2).map(t => <span key={t} className="award-tag">{t}</span>)}
          </div>
        </div>
      </div>

      {/* expand panel — full grid row */}
      {isOpen && (
        <ExpandPanel
          vendor={vendor}
          allVendors={allVendors}
          onClose={onClose}
          onRelatedClick={(r) => onOpen(r.id)}
          isBookmarked={isBookmarked}
          onBookmark={() => onBookmark(vendor.id)}
        />
      )}
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function PhotographyPage({ bookmarks, onBookmarkToggle }) {
  const [priceRange, setPriceRange]     = useState([0, 120000]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [minRating, setMinRating]       = useState(0);
  const [searchQuery, setSearchQuery]   = useState('');
  const [sortBy, setSortBy]             = useState('latest');
  const [view, setView]                 = useState('grid');

  // expand panel state
  const [openId, setOpenId] = useState(null);



const toggleBookmark = (id) => {
  const vendor = PHOTOGRAPHERS.find(p => p.id === id);
  onBookmarkToggle({
    id: vendor.id,
    name: vendor.name,
    image: vendor.cover,
    type: "Photography",
  });
};

  const handleOpen  = (id) => { setOpenId(id); }
  const handleClose = ()   => setOpenId(null);

  const toggleArr = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const clearAll = () => {
    setPriceRange([0, 120000]);
    setSelectedTypes([]);
    setSelectedMedia([]);
    setSelectedYears([]);
    setMinRating(0);
    setSearchQuery('');
    setOpenId(null);
  };

  const filtered = useMemo(() => {
    let list = PHOTOGRAPHERS.filter(p => {
      if (p.pricePerDay < priceRange[0] || p.pricePerDay > priceRange[1]) return false;
      if (selectedTypes.length && !selectedTypes.some(t => p.type.includes(t))) return false;
      if (selectedMedia.length && !selectedMedia.some(m => p.media.includes(m))) return false;
      if (selectedYears.length && !selectedYears.includes(p.year)) return false;
      if (p.rating < minRating) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === 'latest')     return (b.year * 100 + b.month) - (a.year * 100 + a.month);
      if (sortBy === 'rating')     return b.rating - a.rating;
      if (sortBy === 'price_asc')  return a.pricePerDay - b.pricePerDay;
      if (sortBy === 'price_desc') return b.pricePerDay - a.pricePerDay;
      return 0;
    });
    return list;
  }, [priceRange, selectedTypes, selectedMedia, selectedYears, minRating, searchQuery, sortBy]);

  const activeFilterCount = selectedTypes.length + selectedMedia.length + selectedYears.length + (minRating > 0 ? 1 : 0);

  return (
    <div className="photo-page">

      {/* Page Header */}
      <div className="photo-page-header">
        <div className="photo-page-header-inner">
          <div>
            <p className="page-breadcrumb">Services → Photography</p>
            <h1 className="page-title">Photography & Videography</h1>
            <p className="page-subtitle"><strong>{filtered.length}</strong> vendors in Lucknow</p>
          </div>
          <div className="photo-page-header-right">
            <div className="search-box">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6.5" cy="6.5" r="5" /><path d="M11 11l3 3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search photographers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="sort-wrap">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                <option value="latest">Latest First</option>
                <option value="rating">Top Rated</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            </div>
            <div className="view-toggle">
              <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                  <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
                </svg>
                Grid
              </button>
              <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="14" height="2.5" rx="1"/><rect x="1" y="6.8" width="14" height="2.5" rx="1"/>
                  <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
                </svg>
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* Sidebar */}
        <aside className="filter-sidebar">
          <div className="filter-sidebar-head">
            <span className="filter-sidebar-title">
              Filters
              {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
            </span>
            {activeFilterCount > 0 && (
              <button className="clear-all-btn" onClick={clearAll}>Clear all</button>
            )}
          </div>

          <FilterSection title="Price Range">
            <PriceSlider min={0} max={120000} value={priceRange} onChange={setPriceRange} />
          </FilterSection>

          <FilterSection title="Media Type">
            <div className="chip-group">
              {MEDIA_TYPES.map(m => (
                <CheckChip key={m} label={m} checked={selectedMedia.includes(m)}
                  onChange={() => toggleArr(selectedMedia, setSelectedMedia, m)} />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Event Type">
            <div className="chip-group">
              {EVENT_TYPES.map(t => (
                <CheckChip key={t} label={t} checked={selectedTypes.includes(t)}
                  onChange={() => toggleArr(selectedTypes, setSelectedTypes, t)} />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Year">
            <div className="chip-group">
              {YEARS.map(y => (
                <CheckChip key={y} label={String(y)} checked={selectedYears.includes(y)}
                  onChange={() => toggleArr(selectedYears, setSelectedYears, y)} />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Minimum Rating">
            <div className="rating-options">
              {[4.5, 4.0, 3.5, 0].map((r) => (
                <label key={r} className={`rating-option ${minRating === r ? 'selected' : ''}`}>
                  <input type="radio" name="rating" value={r} checked={minRating === r}
                    onChange={() => setMinRating(r)} style={{ display: 'none' }} />
                  {r === 0 ? 'Any rating' : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <RatingStars rating={r} /> {r}+
                    </span>
                  )}
                </label>
              ))}
            </div>
          </FilterSection>
        </aside>

        {/* Results */}
        <main className="results-area">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📷</div>
              <h3>No photographers match your filters</h3>
              <p>Try adjusting your filters or <button onClick={clearAll} className="link-btn">clear all</button></p>
            </div>
          ) : (
            <div className={`vendor-grid ${view === 'list' ? 'vendor-list' : ''}`}>
              {filtered.map(v => (
                <VendorCard
                  key={v.id}
                  vendor={v}
                  isOpen={openId === v.id}
                  onOpen={handleOpen}
                  onClose={handleClose}
                  isBookmarked={!!bookmarks[v.id]
}
                  onBookmark={toggleBookmark}
                  allVendors={PHOTOGRAPHERS}
                />
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}