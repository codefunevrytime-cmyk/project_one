import { useState, useEffect } from 'react';
import { BookmarkIcon } from '../components/BookmarkIcon';

const API = 'http://localhost:5000/api';

export default function PhotographyPage2({ bookmarks, onBookmarkToggle }) {
  const [vendors, setVendors] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorsRes, ...portfolioRes] = await Promise.all([
          fetch(`${API}/vendors`),
        ]);
        const vendorsData = await vendorsRes.json();
        const activeVendors = vendorsData.filter(v => v.is_active);
        setVendors(activeVendors);

        // fetch portfolio for each vendor
        const allPortfolio = await Promise.all(
          activeVendors.map(async (v) => {
            const res = await fetch(`${API}/vendors/${v.id}/portfolio`);
            const data = await res.json();
            return data.map(img => ({ ...img, vendor: v }));
          })
        );
        setPortfolio(allPortfolio.flat());
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = portfolio.filter(item =>
    !search || item.caption?.toLowerCase().includes(search.toLowerCase()) ||
    item.vendor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F2', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '28px 40px 20px', position: 'sticky', top: 64, zIndex: 50 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Services → Photography</p>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 400, color: '#1A1714' }}>Photography & Videography</h1>
            <p style={{ fontSize: 12.5, color: '#888', marginTop: 4 }}><strong style={{ color: '#1A1714' }}>{vendors.length}</strong> vendors · <strong style={{ color: '#1A1714' }}>{portfolio.length}</strong> works</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F7F5F2', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 14px' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6.5" cy="6.5" r="5"/><path d="M11 11l3 3" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search works or vendors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: 13, outline: 'none', width: 200, fontFamily: 'inherit', color: '#1A1714' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 40px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9e8e7a', fontSize: 14 }}>Loading...</div>
        ) : portfolio.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📷</div>
            <h3 style={{ fontSize: 18, color: '#1a1008', marginBottom: 8 }}>No work uploaded yet</h3>
            <p style={{ fontSize: 13, color: '#9e8e7a' }}>Check back soon — vendors are uploading their portfolio.</p>
          </div>
        ) : (
          <>
            {/* Work Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {filtered.map(item => (
                <WorkCard
                  key={item.id}
                  item={item}
                  isOpen={openItem?.id === item.id}
                  onOpen={() => setOpenItem(item)}
                  onClose={() => setOpenItem(null)}
                  isBookmarked={!!bookmarks?.[item.id]}
                  onBookmark={() => onBookmarkToggle?.({ id: item.id, name: item.caption, image: item.image_url, type: 'Photography' })}
                />
              ))}
            </div>

            {/* Expand Panel */}
            {openItem && (
              <ExpandPanel
                item={openItem}
                onClose={() => setOpenItem(null)}
                isBookmarked={!!bookmarks?.[openItem.id]}
                onBookmark={() => onBookmarkToggle?.({ id: openItem.id, name: openItem.caption, image: openItem.image_url, type: 'Photography' })}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WorkCard({ item, isOpen, onOpen, onClose, isBookmarked, onBookmark }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isOpen ? onClose() : onOpen()}
      style={{
        background: '#fff',
        borderRadius: 12,
        border: `1px solid ${isOpen ? '#c9a84c' : 'rgba(0,0,0,0.07)'}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered && !isOpen ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.2s',
        boxShadow: isOpen ? '0 8px 32px rgba(201,168,76,0.2)' : hovered ? '0 6px 20px rgba(0,0,0,0.08)' : 'none',
        display: isOpen ? 'none' : 'block',
      }}
    >
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <img src={item.image_url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />

        {/* Tags overlay */}
        {item.tags && item.tags.length > 0 && (
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(201,168,76,0.85)', color: '#fff', fontWeight: 500, backdropFilter: 'blur(4px)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bookmark button */}
        <button
          onClick={e => { e.stopPropagation(); onBookmark(); }}
          style={{
            position: 'absolute', bottom: 10, right: 10,
            width: 32, height: 32, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            background: isBookmarked ? 'rgba(201,168,76,0.88)' : 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered || isBookmarked ? 1 : 0,
            transition: 'all 0.15s',
          }}
        >
          <BookmarkIcon filled={isBookmarked} size={15} color="#fff" />
        </button>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1714', marginBottom: 4 }}>{item.caption || 'Untitled'}</div>
        <div style={{ fontSize: 11, color: '#9e8e7a' }}>by {item.vendor?.name}</div>
      </div>
    </div>
  );
}

function ExpandPanel({ item, onClose, isBookmarked, onBookmark }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e8e0d5',
      overflow: 'hidden', marginTop: 20,
      animation: 'epIn 0.28s cubic-bezier(0.22,1,0.36,1)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
    }}>
      <style>{`@keyframes epIn { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{ display: 'grid', gridTemplateColumns: '50% 1fr', minHeight: 460 }}>

        {/* Image */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img src={item.image_url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)', pointerEvents: 'none' }} />

          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

          <button onClick={onBookmark} style={{
            position: 'absolute', bottom: 16, right: 16, width: 40, height: 40,
            borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: isBookmarked ? 'rgba(201,168,76,0.88)' : 'rgba(0,0,0,0.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookmarkIcon filled={isBookmarked} size={20} color="#fff" />
          </button>
        </div>

        {/* Details */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#c9a84c', marginBottom: 8 }}>Photography Work</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, fontWeight: 400, color: '#1A1714', marginBottom: 6, lineHeight: 1.2 }}>{item.caption || 'Untitled Work'}</h2>
            <p style={{ fontSize: 13, color: '#9e8e7a', marginBottom: 24 }}>by <strong style={{ color: '#1A1714' }}>{item.vendor?.name}</strong></p>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: '#aaa', marginBottom: 10 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {item.tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44', fontWeight: 500 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Vendor info */}
            <div style={{ background: '#f7f5f2', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: '#aaa', marginBottom: 8 }}>Vendor</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1714', marginBottom: 4 }}>{item.vendor?.name}</div>
              <div style={{ fontSize: 12, color: '#9e8e7a' }}>{item.vendor?.specialty}</div>
              {item.vendor?.contact && <div style={{ fontSize: 12, color: '#9e8e7a', marginTop: 2 }}>{item.vendor?.contact}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ flex: 1, padding: '12px', background: '#1a1008', color: '#ffa01e', border: 'none', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer' }}>
              View Profile
            </button>
            <button style={{ flex: 1, padding: '12px', background: '#f7f5f2', color: '#1a1008', border: '1px solid #e8e0d5', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
              Add to Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}