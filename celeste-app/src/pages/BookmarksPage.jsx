import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { EventCard } from '../components/EventCard';
import { BookmarkButton } from '../components/CommonControls';

const API = 'http://localhost:5000/api';

// ─── tiny vendor card for the Vendors row ───────────────────────────────────
function VendorBookmarkCard({ vendor, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const coverImg = vendor.cover || vendor.image || '';
  const name = vendor.name || 'Unknown Vendor';
  const specialty = vendor.specialty || 'Photography';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(26,16,8,0.08)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: hovered ? '0 12px 40px rgba(26,16,8,0.13)' : '0 2px 12px rgba(26,16,8,0.06)',
        transform: hovered ? 'translateY(-3px)' : 'none',
        position: 'relative',
      }}
    >
      {/* image */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: '#f0ebe3' }}>
        {coverImg && !imgError ? (
          <img
            src={coverImg}
            alt={name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#2d1a10,#4a2c18)', color: 'rgba(255,200,100,0.4)', fontSize: 40 }}>
            📸
          </div>
        )}

        {/* overlay gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)', pointerEvents: 'none' }} />

        {/* specialty badge */}
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(212,134,10,0.85)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, letterSpacing: 0.6 }}>
          📸 {specialty}
        </div>

        {/* bookmark remove btn */}
        <BookmarkButton
          active
          iconSize={15}
          size={34}
          onClick={() => onRemove(vendor.id)}
          style={{
            position: 'absolute', bottom: 10, right: 10,
            opacity: hovered ? 1 : 0.7,
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            zIndex: 5,
          }}
          title="Remove bookmark"
        />
      </div>

      {/* info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 400, color: '#1a1008', marginBottom: 4, lineHeight: 1.3 }}>
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#9e8e7a" strokeWidth="1.5">
            <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" />
            <circle cx="8" cy="6" r="1.5" />
          </svg>
          <span style={{ fontSize: 12, color: '#9e8e7a', fontFamily: 'DM Sans, sans-serif' }}>Lucknow</span>
        </div>
        {vendor.contact && (
          <div style={{ fontSize: 11, color: '#b8a090', fontFamily: 'DM Sans, sans-serif', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {vendor.contact}
          </div>
        )}
        <Link
          to={`/services/photography/${vendor._dbId || vendor.id}`}
          style={{ display: 'inline-block', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#D4860A', border: '1px solid rgba(212,134,10,0.35)', borderRadius: 8, padding: '6px 14px', textDecoration: 'none', transition: 'background 0.15s' }}
        >
          View Profile →
        </Link>
      </div>
    </div>
  );
}

// ─── section header ──────────────────────────────────────────────────────────
function SectionHeader({ label, title, count, accent }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <span style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: accent, fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: 6 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, color: '#1a1008', fontWeight: 400, margin: 0 }}>
          {title}
        </h2>
        <span style={{ fontSize: 13, color: '#9e8e7a', fontFamily: 'DM Sans, sans-serif' }}>
          {count} saved
        </span>
      </div>
      <div style={{ marginTop: 10, height: 1, background: `linear-gradient(to right, ${accent}55, transparent)` }} />
    </div>
  );
}

// ─── empty section placeholder ───────────────────────────────────────────────
function EmptySection({ icon, message }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px dashed rgba(26,16,8,0.12)', padding: '32px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#b8a090', margin: 0 }}>{message}</p>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────
export default function BookmarksPage({ bookmarks, bookmarkList, onRemove }) {
  const [openId, setOpenId] = useState(null);
  const [vendorDetails, setVendorDetails] = useState({});
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Split bookmarks into events and vendors
  const eventItems = (bookmarkList || []).filter(item => item.type !== 'Photography' && item.type !== 'Vendor');
  const vendorItems = (bookmarkList || []).filter(item => item.type === 'Photography' || item.type === 'Vendor');

  const totalCount = (bookmarkList || []).length;

  // Fetch full vendor details from DB for bookmarked vendors
  useEffect(() => {
    const vendorIdsToFetch = vendorItems
      .filter(v => v._dbId || (typeof v.id === 'string' && v.id.startsWith('db_')))
      .map(v => v._dbId || v.id.replace('db_', ''));

    if (vendorIdsToFetch.length === 0) return;

    setLoadingVendors(true);
    Promise.all(
      vendorIdsToFetch.map(async (dbId) => {
        try {
          const [vRes, portRes] = await Promise.all([
            fetch(`${API}/vendors/${dbId}`),
            fetch(`${API}/vendors/${dbId}/portfolio`),
          ]);
          const vendor = await vRes.json();
          const portfolio = await portRes.json();
          return { dbId, vendor, portfolio: Array.isArray(portfolio) ? portfolio : [] };
        } catch {
          return null;
        }
      })
    ).then(results => {
      const map = {};
      results.filter(Boolean).forEach(({ dbId, vendor, portfolio }) => {
        map[`db_${dbId}`] = { ...vendor, portfolio };
      });
      setVendorDetails(map);
      setLoadingVendors(false);
    });
  }, [vendorItems.length]);

  // Enrich vendor items with DB data
  const enrichedVendors = vendorItems.map(item => {
    const dbData = vendorDetails[item.id] || vendorDetails[`db_${item._dbId}`];
    if (dbData) {
      const coverImg = dbData.portfolio?.[0]?.image_url || dbData.photo_url || item.image || '';
      return {
        ...item,
        name: dbData.name || item.name,
        cover: coverImg,
        contact: dbData.contact || '',
        specialty: dbData.specialty || item.specialty || 'Photography',
        _dbId: dbData.id || item._dbId,
      };
    }
    return { ...item, cover: item.cover || item.image || '' };
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #FBF6EE)' }}>

      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #1a1008 0%, #3a2410 60%, #1a1008 100%)',
        padding: '72px 6% 60px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* subtle texture dots */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,160,30,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#c9a84c', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: 16 }}>
            Saved Boards
          </span>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 5vw, 3.6rem)', color: '#faf7f2', fontWeight: 400, lineHeight: 1.15, marginBottom: 16, maxWidth: 620 }}>
            Your curated event inspirations, all in one place.
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(250,247,242,0.6)', fontWeight: 300, lineHeight: 1.8, maxWidth: 480, marginBottom: 36 }}>
            Bookmark events and photography vendors — they collect here for easy reference.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', border: '1.5px solid rgba(201,168,76,0.5)', color: '#c9a84c', textDecoration: 'none', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 8H2M5 5L2 8l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Explore
            </Link>

            {/* stat pills */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { icon: '🗓️', count: eventItems.length, label: 'Events', accent: '#c9a84c' },
                { icon: '📸', count: vendorItems.length, label: 'Vendors', accent: '#D4860A' },
              ].map(({ icon, count, label, accent }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent}33`, borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ color: accent, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
                    <strong style={{ fontSize: 18, fontFamily: 'Playfair Display, serif' }}>{count}</strong> {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── content ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '56px 6%', maxWidth: 1300, margin: '0 auto' }}>

        {totalCount === 0 ? (
          /* ── completely empty state ── */
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 16, border: '1px solid rgba(26,16,8,0.08)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, color: '#1a1008', marginBottom: 10, fontWeight: 400 }}>Nothing saved yet</h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9e8e7a', marginBottom: 28, lineHeight: 1.7 }}>
              Hover any event card or photography vendor and tap the bookmark icon.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/explore" style={{ display: 'inline-block', background: '#1a1008', color: '#ffa01e', textDecoration: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                Explore events
              </Link>
              <Link to="/services/photography" style={{ display: 'inline-block', background: 'transparent', color: '#D4860A', textDecoration: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, border: '1.5px solid rgba(212,134,10,0.4)' }}>
                Browse photographers
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── hint text ── */}
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9e8e7a', marginBottom: 48, lineHeight: 1.6 }}>
              Bookmark again on any card to remove it from your collection.
            </p>

            {/* ══ EVENT GALLERY ROW ══════════════════════════════════════════ */}
            <div style={{ marginBottom: 60 }}>
              <SectionHeader
                label="Section 01"
                title="Event Gallery"
                count={eventItems.length}
                accent="#c9a84c"
              />

              {eventItems.length === 0 ? (
                <EmptySection icon="🗓️" message="No events bookmarked yet — explore and save some!" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                  {eventItems.map((item) => (
                    <EventCard
                      key={item.id}
                      event={item}
                      isBookmarked={true}
                      onBookmarkToggle={() => onRemove(item.id)}
                      allEvents={eventItems}
                      openId={openId}
                      onOpen={setOpenId}
                      onClose={() => setOpenId(null)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ══ VENDORS ROW ═══════════════════════════════════════════════ */}
            <div>
              <SectionHeader
                label="Section 02"
                title="Vendors"
                count={vendorItems.length}
                accent="#D4860A"
              />

              {vendorItems.length === 0 ? (
                <EmptySection icon="📸" message="No vendors bookmarked yet — browse photography vendors and save some!" />
              ) : loadingVendors ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
                  {vendorItems.map((_, i) => (
                    <div key={i} style={{ height: 300, borderRadius: 16, background: 'linear-gradient(90deg,#f0ebe3 25%,#e8e0d5 50%,#f0ebe3 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', border: '1px solid rgba(26,16,8,0.06)' }} />
                  ))}
                  <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
                  {enrichedVendors.map((vendor) => (
                    <VendorBookmarkCard
                      key={vendor.id}
                      vendor={vendor}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
