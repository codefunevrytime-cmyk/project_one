import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { eventsData } from '../context/data/eventsData';
import { PHOTOGRAPHERS } from '../context/data/photographyData';
import { VENDOR_SERVICE_CONFIGS } from '../context/data/vendorServiceConfig';

import { API_URL } from '../config/api';

const API = API_URL;

// ── Classify a bookmarked item ────────────────────────────────────────────────
// Items stored in AuthContext bookmarkedEventIds are raw IDs (numbers or strings).
// Items stored via onBookmarkToggle(object) may have a .type field.
function classifyItem(item) {
  const id = item?.id ?? item;
  const type = item?.type;

  // Explicit vendor types set when bookmarking from VendorListingPage / VendorProfilePage
  const vendorTypes = ['Photography', 'Vendor', 'Custom Invitations',
    ...VENDOR_SERVICE_CONFIGS.map(s => s.bookmarkType)];
  if (type && vendorTypes.includes(type)) return 'vendor';

  // DB vendor IDs are prefixed 'db_'
  if (typeof id === 'string' && id.startsWith('db_')) return 'vendor';

  // Static photographer IDs are integers 1-9 — but only if item has explicit type
  // Without explicit type, treat as event
  return 'event';
}

function getDbVendorId(item) {
  const id = item?.id ?? item;
  if (typeof id === 'string' && id.startsWith('db_')) return id.replace('db_', '');
  if (item?._dbId) return String(item._dbId);
  return null;
}

// ── Match a bookmark ID against static eventsData ─────────────────────────────
function findStaticEvent(id) {
  const strId = String(id);
  return eventsData.find(e => String(e.id) === strId);
}

// ── Match against static PHOTOGRAPHERS ───────────────────────────────────────
function findStaticPhotographer(id) {
  const numId = parseInt(id);
  return PHOTOGRAPHERS.find(p => p.id === numId);
}

// ── Friendly date label ───────────────────────────────────────────────────────
function dateLabel(event) {
  if (event.dateLabel) return event.dateLabel;
  if (event.eventDate) {
    const d = new Date(event.eventDate);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (event.month && event.year) return `${event.month} ${event.year}`;
  return '';
}

// ── Card ──────────────────────────────────────────────────────────────────────
function SavedCard({ image, eyebrow, title, meta, tags = [], to, onRemove, fallbackEmoji = '📅', accentColor = '#c9a84c' }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasImage = Boolean(image) && !imgError;

  return (
    <div
      style={{
        background: '#1c1812',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.15)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: hovered ? '0 14px 40px rgba(0,0,0,0.45)' : '0 2px 12px rgba(0,0,0,0.25)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 200, flexShrink: 0, overflow: 'hidden', background: '#15100a' }}>
        {hasImage ? (
          <img
            src={image}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.4s ease',
              filter: 'brightness(0.88) saturate(0.9)',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 52,
            background: 'linear-gradient(135deg, #2a1e0c, #1a1208)',
          }}>
            {fallbackEmoji}
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 55%)', pointerEvents: 'none' }} />

        {/* Type badge */}
        <span style={{
          position: 'absolute', left: 12, bottom: 12,
          background: 'rgba(15,10,5,0.8)', backdropFilter: 'blur(6px)',
          color: accentColor, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          padding: '3px 10px', borderRadius: 20,
          border: `1px solid ${accentColor}44`,
        }}>
          {eyebrow}
        </span>

        {/* Remove button */}
        <button
          onClick={onRemove}
          title="Remove bookmark"
          style={{
            position: 'absolute', right: 12, bottom: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(201,168,76,0.85)',
            border: 'none', cursor: 'pointer', color: '#18120a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered ? 1 : 0.7,
            transition: 'opacity 0.15s, transform 0.15s',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 17, fontWeight: 600, color: '#f0e6cc',
          margin: 0, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {title}
        </h3>

        {meta && (
          <p style={{ margin: 0, fontSize: 12, color: '#7a6545', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
            {meta}
          </p>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} style={{
                background: 'rgba(201,168,76,0.1)', color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.22)',
                borderRadius: 20, padding: '3px 9px', fontSize: 10,
                fontFamily: "'DM Sans', sans-serif",
              }}>{tag}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <Link
            to={to}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#D4A853', border: '1px solid rgba(212,168,83,0.35)',
              background: 'rgba(212,168,83,0.08)',
              borderRadius: 8, padding: '7px 14px',
              textDecoration: 'none', fontSize: 12, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            Open
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, count, browseLabel, browseTo, children, isEmpty, emptyText }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(201,168,76,0.18)', paddingBottom: 14, marginBottom: 28,
      }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D4A853', fontFamily: "'DM Sans', sans-serif" }}>
            Saved collection
          </span>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400,
            color: '#f0e6cc', margin: '7px 0 0', lineHeight: 1.2,
          }}>
            {title}{' '}
            <span style={{ fontSize: 14, fontWeight: 400, color: '#5a4b33', fontFamily: "'DM Sans', sans-serif" }}>
              {count} saved
            </span>
          </h2>
        </div>
        <Link to={browseTo} style={{ color: '#D4A853', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          {browseLabel}
        </Link>
      </div>

      {isEmpty ? (
        <div style={{
          border: '1px dashed rgba(201,168,76,0.25)',
          borderRadius: 12, padding: '40px 24px', textAlign: 'center',
        }}>
          <p style={{ color: '#5a4b33', fontFamily: "'DM Sans', sans-serif", fontSize: 14, margin: '0 0 14px' }}>
            {emptyText}
          </p>
          <Link to={browseTo} style={{ color: '#D4A853', textDecoration: 'none', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            {browseLabel} →
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 20,
        }}>
          {children}
        </div>
      )}
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SavedBookmarksPage({ bookmarkList = [], onRemove }) {
  const navigate = useNavigate();

  // API-loaded data
  const [galleryEvents, setGalleryEvents] = useState([]);
  const [apiVendors, setApiVendors] = useState([]);
  const [vendorPortfolios, setVendorPortfolios] = useState({});
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // ── Fetch gallery events ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/gallery`)
      .then(r => r.json())
      .then(d => { setGalleryEvents(Array.isArray(d) ? d : []); setLoadingGallery(false); })
      .catch(() => setLoadingGallery(false));
  }, []);

  // ── Fetch all vendors ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/vendors`)
      .then(r => r.json())
      .then(d => { setApiVendors(Array.isArray(d) ? d : []); setLoadingVendors(false); })
      .catch(() => setLoadingVendors(false));
  }, []);

  // ── Classify bookmarks ────────────────────────────────────────────────────
  const { eventItems, vendorItems } = useMemo(() => {
    const events = [];
    const vendors = [];
    bookmarkList.forEach(item => {
      if (classifyItem(item) === 'vendor') vendors.push(item);
      else events.push(item);
    });
    return { eventItems: events, vendorItems: vendors };
  }, [bookmarkList]);

  // ── Fetch portfolio covers for DB vendors ─────────────────────────────────
  useEffect(() => {
    const dbIds = [...new Set(vendorItems.map(getDbVendorId).filter(Boolean))];
    if (dbIds.length === 0) return;

    Promise.all(dbIds.map(async id => {
      try {
        const r = await fetch(`${API}/vendors/${id}/portfolio`);
        const d = await r.json();
        return [id, Array.isArray(d) ? d : []];
      } catch { return [id, []]; }
    })).then(entries => setVendorPortfolios(Object.fromEntries(entries)));
  }, [vendorItems]);

  // ── Enrich event items ────────────────────────────────────────────────────
  const enrichedEvents = useMemo(() => {
    return eventItems.map(item => {
      const rawId = item?.id ?? item;
      const strId = String(rawId);

      // 1. Try static eventsData first (most bookmarks come from GalleryPage/ExplorePage)
      const staticEvent = findStaticEvent(rawId);
      if (staticEvent) {
        return {
          id: staticEvent.id,
          title: staticEvent.title,
          image: staticEvent.img || staticEvent.image_url || null,
          eyebrow: staticEvent.type,
          meta: [staticEvent.venueName || staticEvent.city, dateLabel(staticEvent)].filter(Boolean).join(' · '),
          tags: staticEvent.pills || [],
          to: `/events?type=${encodeURIComponent(staticEvent.type)}`,
          emoji: '📅',
        };
      }

      // 2. Try gallery API events
      const galleryItem = galleryEvents.find(e => String(e.id) === strId);
      if (galleryItem) {
        const d = galleryItem.event_date ? new Date(galleryItem.event_date) : null;
        return {
          id: galleryItem.id,
          title: galleryItem.title || 'Event',
          image: galleryItem.image_url || null,
          eyebrow: galleryItem.event_type || 'Event',
          meta: [galleryItem.venue, d ? d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null].filter(Boolean).join(' · '),
          tags: Array.isArray(galleryItem.tags) ? galleryItem.tags : [],
          to: `/explore`,
          emoji: '📅',
        };
      }

      // 3. Item has enriched data from bookmark payload
      if (item?.title || item?.name) {
        return {
          id: rawId,
          title: item.title || item.name,
          image: item.image || item.image_url || null,
          eyebrow: item.type || 'Event',
          meta: [item.venueName || item.venue, item.dateLabel || item.city].filter(Boolean).join(' · '),
          tags: item.pills || item.tags || [],
          to: `/events?type=${encodeURIComponent(item.type || '')}`,
          emoji: '📅',
        };
      }

      // 4. Fallback — show with ID
      return {
        id: rawId,
        title: `Event #${strId}`,
        image: null,
        eyebrow: 'Event',
        meta: 'Click to explore similar events',
        tags: [],
        to: '/events',
        emoji: '📅',
      };
    });
  }, [eventItems, galleryEvents]);

  // ── Enrich vendor items ───────────────────────────────────────────────────
  const enrichedVendors = useMemo(() => {
    return vendorItems.map(item => {
      const rawId = item?.id ?? item;
      const dbId = getDbVendorId(item);

      // DB vendor
      if (dbId) {
        const apiVendor = apiVendors.find(v => String(v.id) === dbId);
        const portfolio = vendorPortfolios[dbId] || [];
        const cover = portfolio[0]?.image_url || apiVendor?.photo_url || item?.image || null;
        const serviceConfig = VENDOR_SERVICE_CONFIGS.find(s => String(s.serviceId) === String(apiVendor?.service_id)) 
          || VENDOR_SERVICE_CONFIGS[0];
        return {
          id: rawId,
          title: apiVendor?.name || item?.name || `Vendor #${dbId}`,
          image: cover,
          eyebrow: item?.type || serviceConfig?.bookmarkType || 'Vendor',
          meta: [apiVendor?.specialty || item?.specialty, apiVendor?.contact || item?.contact].filter(Boolean).join(' · '),
          tags: apiVendor?.specialty ? [apiVendor.specialty] : [],
          to: `${serviceConfig?.path || '/services/photography'}/${dbId}`,
          emoji: '📷',
          accentColor: '#4c8aff',
        };
      }

      // Static photographer (IDs 1-9)
      const numId = parseInt(String(rawId).replace('db_', ''));
      const staticPhotog = findStaticPhotographer(numId);
      if (staticPhotog) {
        return {
          id: rawId,
          title: staticPhotog.name,
          image: staticPhotog.cover,
          eyebrow: item?.type || 'Photography',
          meta: [staticPhotog.location, `₹${staticPhotog.pricePerDay.toLocaleString('en-IN')} / day`].join(' · '),
          tags: staticPhotog.tags.slice(0, 2),
          to: `/services/photography/${staticPhotog.id}`,
          emoji: '📷',
          accentColor: '#4c8aff',
        };
      }

      // Enriched from payload
      if (item?.name || item?.title) {
        const serviceId = item.type === 'Custom Invitations' ? 'custom-invitations' : 'photography';
        const serviceConfig = VENDOR_SERVICE_CONFIGS.find(s => s.id === serviceId) || VENDOR_SERVICE_CONFIGS[0];
        return {
          id: rawId,
          title: item.name || item.title,
          image: item.image || item.cover || null,
          eyebrow: item.type || 'Vendor',
          meta: item.specialty || item.contact || '',
          tags: item.specialty ? [item.specialty] : [],
          to: dbId ? `${serviceConfig.path}/${dbId}` : serviceConfig.path,
          emoji: item.type === 'Custom Invitations' ? '✉️' : '📷',
          accentColor: '#4c8aff',
        };
      }

      return {
        id: rawId,
        title: `Vendor #${rawId}`,
        image: null,
        eyebrow: 'Vendor',
        meta: '',
        tags: [],
        to: '/services/photography',
        emoji: '📷',
        accentColor: '#4c8aff',
      };
    });
  }, [vendorItems, apiVendors, vendorPortfolios]);

  const totalCount = bookmarkList.length;

  return (
    <div style={{ minHeight: '100vh', background: '#120d05', fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Header ── */}
      <header style={{
        padding: '56px 6% 40px',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
        background: 'linear-gradient(135deg, #180e04 0%, #1e1508 60%, #180e04 100%)',
      }}>
        <div style={{ maxWidth: 1220, margin: '0 auto' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#D4A853', fontFamily: "'DM Sans', sans-serif" }}>
            Your collection
          </span>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem, 5vw, 3.8rem)',
            fontWeight: 400, color: '#f0e6cc',
            margin: '12px 0 14px', lineHeight: 1.1,
          }}>
            Saved <em style={{ fontStyle: 'italic', color: '#D4A853' }}>boards</em>
          </h1>
          <p style={{ color: '#5a4b33', maxWidth: 520, lineHeight: 1.75, fontSize: 14, margin: '0 0 28px' }}>
            Your bookmarked events and vendors — reopen them, compare, and remove anything you no longer need.
          </p>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              ['All saved', totalCount],
              ['Events', enrichedEvents.length],
              ['Vendors', enrichedVendors.length],
            ].map(([label, count]) => (
              <span key={label} style={{
                border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c',
                borderRadius: 999, padding: '6px 14px', fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
                background: 'rgba(201,168,76,0.06)',
              }}>
                {label}: <strong style={{ fontWeight: 600 }}>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1220, margin: '0 auto', padding: '48px 6% 80px' }}>
        {totalCount === 0 ? (
          /* Empty state */
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            border: '1px dashed rgba(201,168,76,0.2)', borderRadius: 16,
          }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>🔖</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 400, color: '#f0e6cc', marginBottom: 12 }}>
              Nothing saved yet
            </h2>
            <p style={{ color: '#5a4b33', fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
              Hover over an event or vendor card and click the bookmark icon to save it here.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/events" style={ctaStyle}>Browse Events</Link>
              <Link to="/services/photography" style={{ ...ctaStyle, background: 'transparent', color: '#D4A853', border: '1px solid rgba(212,168,83,0.4)' }}>
                Browse Vendors
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Events Section */}
            <Section
              title="Events"
              count={enrichedEvents.length}
              browseLabel="Browse events"
              browseTo="/events"
              isEmpty={enrichedEvents.length === 0}
              emptyText="No saved events yet. Start exploring and bookmark events you like."
            >
              {enrichedEvents.map(ev => (
                <SavedCard
                  key={ev.id}
                  image={ev.image}
                  eyebrow={ev.eyebrow}
                  title={ev.title}
                  meta={ev.meta}
                  tags={ev.tags}
                  to={ev.to}
                  onRemove={() => onRemove(ev.id)}
                  fallbackEmoji={ev.emoji}
                />
              ))}
            </Section>

            {/* Vendors Section */}
            <Section
              title="Vendors"
              count={enrichedVendors.length}
              browseLabel="Browse vendors"
              browseTo="/services/photography"
              isEmpty={enrichedVendors.length === 0}
              emptyText="No saved vendors yet. Browse photography and invitation vendors to save your favourites."
            >
              {enrichedVendors.map(v => (
                <SavedCard
                  key={v.id}
                  image={v.image}
                  eyebrow={v.eyebrow}
                  title={v.title}
                  meta={v.meta}
                  tags={v.tags}
                  to={v.to}
                  onRemove={() => onRemove(v.id)}
                  fallbackEmoji={v.emoji}
                  accentColor={v.accentColor || '#c9a84c'}
                />
              ))}
            </Section>
          </>
        )}
      </main>

      <Footer />

      <style>{`
        @media (max-width: 640px) {
          main { padding: 32px 5% 60px !important; }
        }
      `}</style>
    </div>
  );
}

const ctaStyle = {
  background: '#C9A96E', color: '#1a1208', border: 'none', borderRadius: 8,
  padding: '11px 24px', fontWeight: 600, fontSize: 13, textDecoration: 'none',
  fontFamily: "'DM Sans', sans-serif", display: 'inline-block',
};