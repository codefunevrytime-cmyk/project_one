import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { BookmarkButton } from '../components/CommonControls';
import { getVendorServiceConfig } from '../context/data/vendorServiceConfig';

const API = 'http://localhost:5000/api';

function isVendorBookmark(item) {
  return ['Photography', 'Vendor', 'Custom Invitations'].includes(item.type);
}

function getVendorDbId(item) {
  if (item._dbId) return String(item._dbId);
  if (typeof item.id === 'string' && item.id.startsWith('db_')) return item.id.replace('db_', '');
  return null;
}

function getEventImage(item) {
  if (Array.isArray(item.images) && item.images[0]) return item.images[0];
  return item.image_url || item.image || item.cover || '';
}

function getEventTitle(item) {
  return item.title || item.name || 'Saved event';
}

function getEventPath(item) {
  return item.type ? `/explore?type=${encodeURIComponent(item.type)}` : '/explore';
}

function getVendorPath(item) {
  const dbId = getVendorDbId(item);
  const serviceId = item.type === 'Custom Invitations' ? 'custom-invitations' : 'photography';
  const basePath = getVendorServiceConfig(serviceId).path;
  return dbId ? `${basePath}/${dbId}` : basePath;
}

function SavedCard({ image, eyebrow, title, meta, tags = [], to, onRemove, fallbackText = 'No image' }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasImage = Boolean(image) && !imgError;

  return (
    <article
      className="common-card-shell"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#1c1c1e',
        border: '1px solid rgba(201,168,76,0.55)',
        boxShadow: hovered ? '0 14px 36px rgba(0,0,0,0.32)' : '0 4px 18px rgba(0,0,0,0.18)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <div className="common-card-media">
        {hasImage ? (
          <img
            src={image}
            alt={title}
            onError={() => setImgError(true)}
            style={{ transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.3s' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#20160c',
            color: '#9e8e7a',
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {fallbackText}
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.58), transparent 56%)' }} />
        <span style={{
          position: 'absolute',
          left: 14,
          bottom: 14,
          border: '1px solid rgba(201,168,76,0.55)',
          background: 'rgba(15,13,10,0.75)',
          color: '#c9a84c',
          borderRadius: 20,
          padding: '5px 12px',
          fontSize: 11,
          fontWeight: 600,
        }}>
          {eyebrow}
        </span>
        <BookmarkButton
          active
          onClick={onRemove}
          size={36}
          iconSize={16}
          style={{
            position: 'absolute',
            right: 14,
            bottom: 14,
            opacity: hovered ? 1 : 0.82,
            boxShadow: '0 4px 16px rgba(201,168,76,0.35)',
          }}
          title="Remove bookmark"
        />
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <h3 style={{
          color: '#f5f0e8',
          fontFamily: 'Playfair Display, serif',
          fontSize: 18,
          lineHeight: 1.25,
          margin: '0 0 9px',
          fontWeight: 600,
        }}>
          {title}
        </h3>
        <p style={{ color: '#9e8e7a', fontSize: 12.5, margin: '0 0 13px', fontFamily: 'DM Sans, sans-serif' }}>
          {meta}
        </p>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{
                background: 'rgba(201,168,76,0.12)',
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.28)',
                borderRadius: 20,
                padding: '4px 9px',
                fontSize: 11,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <Link
          to={to}
          style={{
            display: 'inline-flex',
            color: '#D4860A',
            border: '1px solid rgba(212,134,10,0.45)',
            borderRadius: 8,
            padding: '8px 14px',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Open
        </Link>
      </div>
    </article>
  );
}

function Section({ title, count, children, empty, action }) {
  return (
    <section style={{ marginTop: 42 }}>
      <div style={{
        display: 'flex',
        alignItems: 'end',
        justifyContent: 'space-between',
        gap: 16,
        borderBottom: '1px solid rgba(201,168,76,0.28)',
        paddingBottom: 14,
        marginBottom: 24,
      }}>
        <div>
          <span style={{ color: '#D4860A', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700 }}>
            Saved collection
          </span>
          <h2 style={{ color: '#f5f0e8', fontFamily: 'Playfair Display, serif', fontSize: 28, margin: '7px 0 0' }}>
            {title} <span style={{ color: '#9e8e7a', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>{count} saved</span>
          </h2>
        </div>
        {action}
      </div>
      {count === 0 ? empty : children}
    </section>
  );
}

function EmptyBlock({ text, to, label }) {
  return (
    <div style={{
      border: '1px dashed rgba(201,168,76,0.35)',
      background: 'rgba(255,255,255,0.025)',
      borderRadius: 14,
      padding: '34px 20px',
      textAlign: 'center',
      color: '#9e8e7a',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <p style={{ margin: '0 0 16px' }}>{text}</p>
      <Link to={to} style={{ color: '#D4860A', textDecoration: 'none', fontWeight: 700 }}>
        {label}
      </Link>
    </div>
  );
}

export default function SavedBookmarksPage({ bookmarkList = [], onRemove }) {
  const [galleryEvents, setGalleryEvents] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [portfolios, setPortfolios] = useState({});

  const eventItems = useMemo(
    () => bookmarkList.filter((item) => !isVendorBookmark(item)),
    [bookmarkList],
  );
  const vendorItems = useMemo(
    () => bookmarkList.filter(isVendorBookmark),
    [bookmarkList],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadGalleryEvents() {
      try {
        const response = await fetch(`${API}/gallery`);
        const data = await response.json();
        if (!cancelled) setGalleryEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setGalleryEvents([]);
      }
    }

    loadGalleryEvents();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVendors() {
      try {
        const response = await fetch(`${API}/vendors`);
        const data = await response.json();
        if (!cancelled) setVendors(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setVendors([]);
      }
    }

    loadVendors();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set(vendorItems.map(getVendorDbId).filter(Boolean))];
    if (ids.length === 0) {
      const timer = window.setTimeout(() => setPortfolios({}), 0);
      return () => window.clearTimeout(timer);
    }

    async function loadPortfolios() {
      const entries = await Promise.all(ids.map(async (id) => {
        try {
          const response = await fetch(`${API}/vendors/${id}/portfolio`);
          const data = await response.json();
          return [id, Array.isArray(data) ? data : []];
        } catch {
          return [id, []];
        }
      }));
      if (!cancelled) setPortfolios(Object.fromEntries(entries));
    }

    loadPortfolios();
    return () => { cancelled = true; };
  }, [vendorItems]);

  const enrichedVendors = vendorItems.map((item) => {
    const dbId = getVendorDbId(item);
    const vendor = dbId ? vendors.find((entry) => String(entry.id) === String(dbId)) : null;
    const portfolio = dbId ? portfolios[dbId] || [] : [];
    const image = portfolio[0]?.image_url || vendor?.photo_url || item.image || item.cover || '';
    return {
      ...item,
      _dbId: dbId || item._dbId,
      name: vendor?.name || item.name || 'Saved vendor',
      specialty: vendor?.specialty || item.specialty || item.type,
      contact: vendor?.contact || item.contact || 'Lucknow',
      image,
    };
  });

  const enrichedEvents = eventItems.map((item) => {
    const galleryItem = galleryEvents.find((event) => String(event.id) === String(item.id));
    if (!galleryItem) return item;

    const date = galleryItem.event_date ? new Date(galleryItem.event_date) : null;
    return {
      ...item,
      title: galleryItem.title || item.title || item.name,
      name: galleryItem.title || item.name,
      type: galleryItem.event_type || item.type,
      venue: galleryItem.venue || item.venue,
      scale: galleryItem.scale || item.scale,
      month: date ? date.toLocaleString('en-IN', { month: 'long' }) : item.month,
      year: date ? date.getFullYear() : item.year,
      image: galleryItem.image_url || item.image,
      image_url: galleryItem.image_url || item.image_url,
      tags: Array.isArray(galleryItem.tags) && galleryItem.tags.length > 0 ? galleryItem.tags : item.tags,
      price: galleryItem.price || item.price,
    };
  });

  const total = bookmarkList.length;

  return (
    <div style={{ minHeight: '100vh', background: '#120d05' }}>
      <header style={{ padding: '64px 6% 34px', borderBottom: '1px solid rgba(201,168,76,0.18)' }}>
        <div style={{ maxWidth: 1220, margin: '0 auto' }}>
          <span style={{ color: '#D4860A', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>
            Settings / Bookmarks
          </span>
          <h1 style={{ color: '#f5f0e8', fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 5vw, 4rem)', margin: '12px 0 12px', lineHeight: 1 }}>
            Saved boards
          </h1>
          <p style={{ color: '#9e8e7a', maxWidth: 560, lineHeight: 1.7, fontFamily: 'DM Sans, sans-serif' }}>
            Your bookmarked event setups and vendors stay here so you can reopen them, compare options, and remove anything you no longer need.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            {[
              ['All saved', total],
              ['Events', eventItems.length],
              ['Vendors', vendorItems.length],
            ].map(([label, count]) => (
              <span key={label} style={{
                border: '1px solid rgba(201,168,76,0.35)',
                color: '#c9a84c',
                borderRadius: 999,
                padding: '7px 13px',
                fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                {label}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1220, margin: '0 auto', padding: '34px 6% 72px' }}>
        {total === 0 ? (
          <EmptyBlock text="Nothing is bookmarked yet. Start by saving an event or a vendor." to="/explore" label="Explore events" />
        ) : (
          <>
            <Section
              title="Events"
              count={eventItems.length}
              empty={<EmptyBlock text="No saved events yet." to="/explore" label="Browse events" />}
              action={<Link to="/explore" style={{ color: '#D4860A', textDecoration: 'none', fontWeight: 700 }}>Browse events</Link>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {enrichedEvents.map((item) => (
                  <SavedCard
                    key={item.id}
                    image={getEventImage(item)}
                    eyebrow={item.type || 'Event'}
                    title={getEventTitle(item)}
                    meta={[item.venue, item.month && item.year ? `${item.month} ${item.year}` : null].filter(Boolean).join(' / ') || 'Saved event'}
                    tags={item.tags || [item.scale, item.planner].filter(Boolean)}
                    to={getEventPath(item)}
                    onRemove={() => onRemove(item.id)}
                    fallbackText="Event image unavailable"
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Vendors"
              count={vendorItems.length}
              empty={<EmptyBlock text="No saved vendors yet." to="/services/photography" label="Browse vendors" />}
              action={<Link to="/services/photography" style={{ color: '#D4860A', textDecoration: 'none', fontWeight: 700 }}>Browse vendors</Link>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {enrichedVendors.map((vendor) => (
                  <SavedCard
                    key={vendor.id}
                    image={vendor.image}
                    eyebrow={vendor.type || 'Vendor'}
                    title={vendor.name}
                    meta={vendor.contact || 'Lucknow'}
                    tags={[vendor.specialty].filter(Boolean)}
                    to={getVendorPath(vendor)}
                    onRemove={() => onRemove(vendor.id)}
                    fallbackText="Vendor image unavailable"
                  />
                ))}
              </div>
            </Section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
