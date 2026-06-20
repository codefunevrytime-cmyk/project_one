// src/pages/PhotographyPage.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PHOTOGRAPHERS, EVENT_TYPES, MEDIA_TYPES, YEARS } from "../context/data/photographyData";
import PriceSlider from "../components/PriceSlider";
import { BookmarkIcon } from "../components/BookmarkIcon";
import './PhotographyPage.css';

const API = 'http://localhost:5000/api';
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function mapVendorToCard(vendor, portfolio, tags) {
  const coverImg = portfolio[0]?.image_url || vendor.photo_url || '';
  const allTags  = tags.map(t => t.tag);
  const typeFromSpecialty = vendor.specialty
    ? vendor.specialty.split(',').map(s => s.trim()).filter(Boolean)
    : ['Photography'];
  const portfolioTags = [...new Set(portfolio.flatMap(p => p.tags || []))].slice(0, 3);
  return {
    id: `db_${vendor.id}`, _dbId: vendor.id, name: vendor.name,
    location: 'Lucknow', rating: 5.0, reviews: 0, pricePerDay: vendor.price_per_day ? Number(vendor.price_per_day) : 0,
    type: typeFromSpecialty, media: ['Photo'],
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

function RatingStars({ rating }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} filled={i <= Math.round(rating)} />)}
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

const EP_STYLES = `
  .ep-wrap { background:#fff; border-radius:16px; border:0.5px solid rgba(0,0,0,0.08); overflow:hidden; margin-bottom:20px; animation:epIn 0.28s cubic-bezier(0.22,1,0.36,1); box-shadow:0 8px 40px rgba(0,0,0,0.10); scroll-margin-top:96px; }
  @keyframes epIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
  .ep-img-col { position:relative; overflow:hidden; min-height:520px; }
  .ep-img-col img { width:100%; height:100%; object-fit:cover; display:block; position:absolute; inset:0; transition:opacity 0.3s; }
  .ep-img-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.30) 0%,transparent 50%); pointer-events:none; }
  .ep-top { display:grid; grid-template-columns:44% 1fr; min-height:520px; }
  .ep-close { position:absolute; top:14px; right:14px; width:32px; height:32px; border-radius:50%; background:rgba(0,0,0,0.35); border:none; cursor:pointer; color:#fff; font-size:16px; display:flex; align-items:center; justify-content:center; transition:background 0.18s; z-index:10; }
  .ep-close:hover { background:rgba(0,0,0,0.6); }
  .ep-bm { position:absolute; bottom:16px; right:16px; width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:background 0.18s,transform 0.15s; z-index:10; }
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
  .ep-thumbs { position:absolute; bottom:14px; left:14px; display:flex; gap:6px; z-index:10; flex-wrap:wrap; max-width:80%; }
  .ep-thumb { width:46px; height:46px; border-radius:7px; overflow:hidden; cursor:pointer; border:2px solid rgba(255,255,255,0.3); transition:border-color 0.15s,transform 0.15s; flex-shrink:0; }
  .ep-thumb:hover { transform:scale(1.08); border-color:rgba(255,255,255,0.7); }
  .ep-thumb.ep-thumb-active { border-color:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.4); }
  .ep-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .ep-ptag { font-size:11px; padding:4px 12px; border-radius:20px; background:rgba(212,134,10,0.1); color:#D4860A; border:0.5px solid rgba(212,134,10,0.25); }
  .ep-photo-count { position:absolute; top:14px; left:14px; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); color:#fff; font-size:11px; padding:4px 10px; border-radius:20px; border:0.5px solid rgba(255,255,255,0.2); z-index:10; }
`;

function ExpandPanel({ vendor, allVendors, onClose, onRelatedClick, isBookmarked, onBookmark, navigate }) {
  const related = getRelated(vendor, allVendors);
  const [activeIdx, setActiveIdx] = useState(0);
  const displayImg = vendor.isDbItem && vendor.portfolio?.length > 0
    ? vendor.portfolio[activeIdx]?.image_url
    : vendor.cover;
  const currentPortfolio = vendor.isDbItem ? vendor.portfolio?.[activeIdx] : null;

  return (
    <div className="ep-wrap">
      <style>{EP_STYLES}</style>
      <div className="ep-top">
        <div className="ep-img-col">
          <img src={displayImg} alt={vendor.name} key={displayImg} />
          <div className="ep-img-overlay" />
          <button className="ep-close" onClick={onClose}>✕</button>
          <button className="ep-bm" onClick={onBookmark}
            style={{ background: isBookmarked ? 'rgba(83,74,183,0.88)' : 'rgba(0,0,0,0.38)', color: '#fff', boxShadow: isBookmarked ? '0 2px 12px rgba(83,74,183,0.4)' : 'none' }}>
            <BookmarkIcon filled={isBookmarked} size={20} color="#fff" />
          </button>
          {vendor.isDbItem && vendor.portfolio?.length > 1 && (
            <>
              <div className="ep-photo-count">📸 {vendor.portfolio.length} photos</div>
              <div className="ep-thumbs">
                {vendor.portfolio.map((p, i) => (
                  <div key={p.id} className={`ep-thumb ${i === activeIdx ? 'ep-thumb-active' : ''}`} onClick={() => setActiveIdx(i)}>
                    <img src={p.image_url} alt={p.caption || `Photo ${i+1}`} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ep-right">
          <div>
            <div className="ep-name">{vendor.name}</div>
            <div className="ep-meta-row">
              {vendor.isDbItem ? (
                <span className="ep-specialty-badge">📸 {vendor.specialty || 'Photography'}</span>
              ) : (
                <>
                  <RatingStars rating={vendor.rating} />
                  <span style={{ fontSize:13, fontWeight:500, color:'#1A1714' }}>{vendor.rating.toFixed(1)}</span>
                  <span style={{ fontSize:12, color:'#aaa' }}>({vendor.reviews} reviews)</span>
                  {vendor.verified && (
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
              {vendor.isDbItem ? (
                <>
                  <div className="ep-cell"><div className="ep-cell-label">Vendor</div><div className="ep-cell-val">{vendor.name}</div></div>
                  <div className="ep-cell"><div className="ep-cell-label">Specialty</div><div className="ep-cell-val">{vendor.specialty || 'Photography'}</div></div>
                  <div className="ep-cell"><div className="ep-cell-label">Location</div><div className="ep-cell-val">{vendor.location}</div></div>
                  <div className="ep-cell"><div className="ep-cell-label">Contact</div><div className="ep-cell-val" style={{ fontSize:12 }}>{vendor.contact || 'N/A'}</div></div>
                  {currentPortfolio?.caption && (
                    <div className="ep-cell" style={{ gridColumn:'1/-1' }}>
                      <div className="ep-cell-label">About this work</div>
                      <div className="ep-cell-val" style={{ fontSize:13, fontWeight:400 }}>{currentPortfolio.caption}</div>
                    </div>
                  )}
                </>
              ) : (
                [['Location', vendor.location], ['Date', `${MONTH_NAMES[vendor.month]} ${vendor.year}`], ['Media', vendor.media.join(' + ')], ['Price', `₹${vendor.pricePerDay.toLocaleString('en-IN')} / day`]].map(([label, val]) => (
                  <div key={label} className="ep-cell"><div className="ep-cell-label">{label}</div><div className="ep-cell-val">{val}</div></div>
                ))
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

            {vendor.isDbItem && currentPortfolio?.tags?.length > 0 && (
              <div className="ep-tags">
                {currentPortfolio.tags.map((t, i) => <span key={i} className="ep-ptag">{t}</span>)}
              </div>
            )}
          </div>

          <div className="ep-footer">
            {vendor.isDbItem ? (
              <>
                <div style={{ fontSize:12, color:'#9e8e7a' }}>{vendor.portfolio?.length || 0} portfolio image{vendor.portfolio?.length !== 1 ? 's' : ''}</div>
                <button className="ep-cta ep-cta-amber">Enquire Now</button>
              </>
            ) : (
              <>
                <div className="ep-price">
                  <span className="ep-price-sym">₹</span>
                  <span className="ep-price-val">{vendor.pricePerDay.toLocaleString('en-IN')}</span>
                  <span className="ep-price-unit">/ day</span>
                </div>
                <button className="ep-cta" onClick={() => navigate(`/services/photography/${vendor.id}`)}>View Profile</button>
                <button className="ep-cta">Add to Your Event</button>
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

function VendorCard({ vendor, isOpen, onOpen, onClose, isBookmarked, onBookmark }) {
  const [hovered, setHovered]     = useState(false);
  const [bmHovered, setBmHovered] = useState(false);
  const navigate = useNavigate();
  const handleBookmark = (e) => { e.stopPropagation(); onBookmark(vendor.id); };

  return (
    <>
      <div
        className="vendor-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => isOpen ? onClose() : onOpen(vendor.id)}
        style={{ outline: isOpen ? '2px solid #534AB7' : 'none', outlineOffset: 2, display: isOpen ? 'none' : undefined }}
      >
        <div className="vendor-img-wrap">
          <img src={vendor.cover} alt={vendor.name} className="vendor-img" />

          <div className="vendor-media-badge">
            {vendor.isDbItem ? `📸 ${vendor.specialty || 'Gallery'}` : vendor.media.join(' + ')}
          </div>

          {!vendor.isDbItem && vendor.verified && (
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

          

          <button
            style={{ position:'absolute', bottom:10, right:10, width:32, height:32, borderRadius:'50%', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', opacity:hovered||isBookmarked?1:0, background:isBookmarked?'rgba(83,74,183,0.88)':bmHovered?'rgba(0,0,0,0.70)':'rgba(0,0,0,0.45)', color:'#fff', transition:'opacity 0.15s,background 0.15s,transform 0.15s', zIndex:5 }}
            onClick={handleBookmark} onMouseEnter={() => setBmHovered(true)} onMouseLeave={() => setBmHovered(false)}
          >
            <BookmarkIcon filled={isBookmarked} size={15} color="#fff" />
          </button>
        </div>

        <div className="vendor-info">
          <div className="vendor-top-row">
            <h3 className="vendor-name">{vendor.name}</h3>
            {
             (
              <div className="vendor-rating">
                <RatingStars rating={vendor.rating} />
                <span className="vendor-rating-val">{vendor.rating.toFixed(1)}</span>
                <span className="vendor-reviews">({vendor.reviews})</span>
              </div>
            )}
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
            {vendor.isDbItem ? (
              <>
                <div className="vendor-price">
                  {vendor.pricePerDay > 0 ? (
                    <>
                      <span className="price-symbol">₹</span>
                      <span className="price-val">{vendor.pricePerDay.toLocaleString('en-IN')}</span>
                      <span className="price-unit">/ day</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Price on request</span>
                  )}
                </div>
                <button className="vendor-cta" style={{ color:'#D4860A', borderColor:'rgba(212,134,10,0.4)' }} onClick={e => { e.stopPropagation(); navigate(`/services/photography/${vendor._dbId}`); }}>View Profile</button>
              </>
            ) : (
              <>
                <div className="vendor-price">
                  <span className="price-symbol">₹</span>
                  <span className="price-val">{vendor.pricePerDay.toLocaleString('en-IN')}</span>
                  <span className="price-unit">/ day</span>
                </div>
                <button className="vendor-cta" onClick={e => { e.stopPropagation(); navigate(`/services/photography/${vendor.id}`); }}>View Profile</button>
              </>
            )}
          </div>

          <div className="vendor-tags">
            {vendor.tags.slice(0, 2).map(t => <span key={t} className="award-tag">{t}</span>)}
          </div>
        </div>
      </div>

    </>
  );
}

export default function PhotographyPage({ bookmarks, onBookmarkToggle }) {
  const navigate = useNavigate();
  const expandPanelRef                    = useRef(null);
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

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res     = await fetch(`${API}/vendors`);
        const vendors = await res.json();
        const active  = vendors.filter(v => v.is_active);
        const enriched = await Promise.all(active.map(async (vendor) => {
          const [portRes, tagsRes] = await Promise.all([
            fetch(`${API}/vendors/${vendor.id}/portfolio`),
            fetch(`${API}/vendors/${vendor.id}/tags`),
          ]);
          const portfolio = await portRes.json();
          const tags      = await tagsRes.json();
          return mapVendorToCard(vendor, Array.isArray(portfolio) ? portfolio : [], Array.isArray(tags) ? tags : []);
        }));
        setDbVendors(enriched);
      } catch (err) { console.error('Failed to fetch vendors:', err); }
    };
    fetchVendors();
  }, []);

  const allVendors = useMemo(() => [...PHOTOGRAPHERS, ...dbVendors], [dbVendors]);

  const toggleBookmark = (id) => {
    const vendor = allVendors.find(p => p.id === id);
    if (!vendor) return;
    onBookmarkToggle({ id: vendor.id, name: vendor.name, image: vendor.cover, type: 'Photography' });
  };

  const handleOpen  = (id) => setOpenId(id);
  const handleClose = ()   => setOpenId(null);

  useEffect(() => {
    if (openId && expandPanelRef.current) {
      expandPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [openId]);

  const toggleArr   = (arr, setArr, val) => setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  const clearAll    = () => { setPriceRange([0,120000]); setSelectedTypes([]); setSelectedMedia([]); setSelectedYears([]); setMinRating(0); setSearchQuery(''); setOpenId(null); };

  const filtered = useMemo(() => {
    let list = allVendors.filter(p => {
      if (!p.isDbItem) {
        if (p.pricePerDay < priceRange[0] || p.pricePerDay > priceRange[1]) return false;
        if (p.rating < minRating) return false;
        if (selectedMedia.length && !selectedMedia.some(m => p.media.includes(m))) return false;
      }
      if (selectedTypes.length && !selectedTypes.some(t => p.type.includes(t))) return false;
      if (selectedYears.length && !selectedYears.includes(p.year)) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === 'latest')     return (b.year*100+b.month)-(a.year*100+a.month);
      if (sortBy === 'rating')     return b.rating-a.rating;
      if (sortBy === 'price_asc')  return a.pricePerDay-b.pricePerDay;
      if (sortBy === 'price_desc') return b.pricePerDay-a.pricePerDay;
      return 0;
    });
    return list;
  }, [allVendors, priceRange, selectedTypes, selectedMedia, selectedYears, minRating, searchQuery, sortBy]);

  const activeFilterCount = selectedTypes.length + selectedMedia.length + selectedYears.length + (minRating > 0 ? 1 : 0);

  return (
    <div className="photo-page">
      <div className="photo-page-header">
        <div className="photo-page-header-inner">
          <div>
            <p className="page-breadcrumb">Services → Photography</p>
            <h1 className="page-title">Photography & Videography</h1>
            <p className="page-subtitle"><strong>{filtered.length}</strong> vendors in Lucknow</p>
          </div>
          <div className="photo-page-header-right">
            <div className="search-box">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3" strokeLinecap="round"/></svg>
              <input type="text" placeholder="Search photographers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />
            </div>
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
        <aside className="filter-sidebar">
          <div className="filter-sidebar-head">
            <span className="filter-sidebar-title">Filters {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}</span>
            {activeFilterCount > 0 && <button className="clear-all-btn" onClick={clearAll}>Clear all</button>}
          </div>
          <FilterSection title="Price Range"><PriceSlider min={0} max={120000} value={priceRange} onChange={setPriceRange} /></FilterSection>
          <FilterSection title="Media Type"><div className="chip-group">{MEDIA_TYPES.map(m => <CheckChip key={m} label={m} checked={selectedMedia.includes(m)} onChange={() => toggleArr(selectedMedia, setSelectedMedia, m)} />)}</div></FilterSection>
          <FilterSection title="Event Type"><div className="chip-group">{EVENT_TYPES.map(t => <CheckChip key={t} label={t} checked={selectedTypes.includes(t)} onChange={() => toggleArr(selectedTypes, setSelectedTypes, t)} />)}</div></FilterSection>
          <FilterSection title="Year"><div className="chip-group">{YEARS.map(y => <CheckChip key={y} label={String(y)} checked={selectedYears.includes(y)} onChange={() => toggleArr(selectedYears, setSelectedYears, y)} />)}</div></FilterSection>
          <FilterSection title="Minimum Rating">
            <div className="rating-options">
              {[4.5, 4.0, 3.5, 0].map(r => (
                <label key={r} className={`rating-option ${minRating===r?'selected':''}`}>
                  <input type="radio" name="rating" value={r} checked={minRating===r} onChange={() => setMinRating(r)} style={{ display:'none' }} />
                  {r === 0 ? 'Any rating' : <span style={{ display:'flex', alignItems:'center', gap:5 }}><RatingStars rating={r} /> {r}+</span>}
                </label>
              ))}
            </div>
          </FilterSection>
        </aside>

        <main className="results-area">
          {openId && (() => {
            const openVendor = filtered.find(v => v.id === openId) || allVendors.find(v => v.id === openId);
            if (!openVendor) return null;
            return (
              <div ref={expandPanelRef}>
                <ExpandPanel
                  vendor={openVendor}
                  allVendors={filtered}
                  onClose={handleClose}
                  onRelatedClick={r => handleOpen(r.id)}
                  isBookmarked={!!bookmarks[openVendor.id]}
                  onBookmark={() => toggleBookmark(openVendor.id)}
                  navigate={navigate}
                />
              </div>
            );
          })()}

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📷</div>
              <h3>No photographers match your filters</h3>
              <p>Try adjusting or <button onClick={clearAll} className="link-btn">clear all</button></p>
            </div>
          ) : (
            <div className={`vendor-grid ${view==='list'?'vendor-list':''}`}>
              {filtered.map(v => (
                <VendorCard key={v.id} vendor={v} isOpen={openId===v.id}
                  onOpen={handleOpen} onClose={handleClose}
                  isBookmarked={!!bookmarks[v.id]} onBookmark={toggleBookmark} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}