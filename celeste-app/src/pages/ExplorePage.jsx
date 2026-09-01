import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { MONTH_IDX } from "../context/data/events";
import { EventCard } from "../components/EventCard";
import { Sidebar } from "../components/Sidebar";
import styles from "./ExplorePage.module.css";
import ClientAdminChat from '../components/ClientAdminChat';
import { useAuth } from '../hooks/useAuth';
import OnboardingTour from '../components/onboarding/OnboardingTour';
import { exploreTourSteps } from './exploreTourSteps';


import { API_URL } from '../config/api';

const API = API_URL;

// Fallback range used only until real event prices have loaded — actual
// slider max is computed dynamically in the component below from the
// highest-priced event, rounded up to the next ₹500 plus a ₹1,000 buffer.
const DEFAULT_PRICE_MAX = 120000;

function emptyFilters(maxPrice) {
  return { type: new Set(), venue: new Set(), year: new Set(), scale: new Set(), price: [0, maxPrice] };
}

function cloneFilters(f, fallbackMax) {
  return {
    type: new Set(f.type),
    venue: new Set(f.venue),
    year: new Set(f.year),
    scale: new Set(f.scale),
    price: [...(f.price || [0, fallbackMax])],
  };
}
function normalizeImages(raw) {
  let arr = raw;

  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      arr = [];
    }
  }

  if (!Array.isArray(arr)) return [];

  return arr
    .map((item) => (typeof item === "string" ? item : item?.url || item?.image_url || null))
    .filter(Boolean);
}
function mapGalleryToEvent(item) {
  const date  = item.event_date ? new Date(item.event_date) : null;
  const month = date ? date.toLocaleString('en-IN', { month: 'long' }) : 'January';
  const year  = date ? date.getFullYear() : new Date().getFullYear();
  const type = (item.event_type && item.event_type.trim()) ? item.event_type.trim() : 'Wedding';
  const venue = (item.venue && item.venue.trim()) ? item.venue.trim() : '';
  const scale = (item.scale && item.scale.trim()) ? item.scale.trim() : '';
  const description = item.description || '';

 const parsedImages = normalizeImages(item.images);
  const images = parsedImages.length > 0
    ? parsedImages
    : (item.image_url ? [item.image_url] : []);

  return {
    id: item.id,
    title: item.title || 'Untitled',
    type,
    venue,
    scale,
    month,
    year,
    description,
    planner: '',
    image_url: item.image_url || images[0] || null,
    images,
    price: item.price && Number(item.price) > 0 ? Number(item.price) : null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    verified: true,
    _raw: item,
  };
}

export function ExplorePage({ bookmarks, onBookmarkToggle, selectedType, onClearType }) {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Pick mode: arrived here from Create Event to select a reference
  //    event, either as the global event reference or a per-vendor one. ──
  const pickContext = location.state?.celestePick
    && (location.state.celestePick.type === 'globalRef' || location.state.celestePick.type === 'vendorRef')
    ? location.state.celestePick
    : null;

  const handleAddToEvent = (event) => {
    if (!pickContext) return;
    const images = Array.isArray(event.images) && event.images.length > 0
      ? event.images
      : (event.image_url ? [event.image_url] : []);
    const refPayload = {
      id: event.id,
      title: event.title,
      type: event.type,
      img: event.image_url || images[0] || null,
      city: event.venue || '',
      dateLabel: `${event.month || ''} ${event.year || ''}`.trim(),
      price: event.price ? `₹${Number(event.price).toLocaleString('en-IN')}` : '',
    };
    navigate('/create-event', {
      state: {
        celestePickResult:
          pickContext.type === 'globalRef'
            ? { type: 'globalRef', event: refPayload }
            : { type: 'vendorRef', serviceKey: pickContext.serviceKey, event: refPayload },
      },
    });
  };

  // ── Price slider max ─────────────────────────────────────────────────
  // Starts at DEFAULT_PRICE_MAX and gets recalculated below once real
  // event prices are loaded from the API.
  const [maxPrice, setMaxPrice] = useState(DEFAULT_PRICE_MAX);
  const priceInitializedRef = useRef(false);

  const [filters, setFilters] = useState(() => {
    if (selectedType) return { ...emptyFilters(DEFAULT_PRICE_MAX), type: new Set([selectedType]) };
    return emptyFilters(DEFAULT_PRICE_MAX);
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [openId, setOpenId] = useState(null);
  const [searchParams] = useSearchParams();

  // ── Mobile filter drawer ──────────────────────────────────────────
  // Controls whether the Sidebar renders as an open slide-in drawer on
  // small screens (<=900px). Unused on desktop — Sidebar ignores it
  // there and sits inline as before.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Lock background scroll while the mobile filter drawer is open.
  // overflow:hidden alone doesn't stop touch-scroll chaining on mobile —
  // pinning the body with position:fixed is the reliable cross-browser fix
  // (prevents the page behind the drawer from bounce-scrolling into view).
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const scrollY = window.scrollY;
    const { position, top, width, overflow } = document.body.style;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      document.body.style.overflow = overflow;
      window.scrollTo(0, scrollY);
    };
  }, [mobileFiltersOpen]);

  // Handle open query param from admin
  const openParam = searchParams.get('open');
  useEffect(() => {
    if (openParam) {
      setOpenId(openParam);
    }
  }, [openParam]);

  // Ref on the expand panel so we can scroll to it
  const expandPanelRef = useRef(null);

  const handleOpen = (id) => {
    setOpenId(id);
  };

  const handleClose = () => setOpenId(null);

  // Auto-scroll to the expand panel whenever it opens
  useEffect(() => {
    if (openId && expandPanelRef.current) {
      // Small delay so the panel has rendered before scrolling
      const timer = setTimeout(() => {
        expandPanelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [openId]);

  useEffect(() => {
    fetch(`${API}/gallery`)
      .then(res => res.json())
      .then(data => {
        const mapped = Array.isArray(data) ? data.map(mapGalleryToEvent) : [];
        setAllEvents(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Dynamic price-slider max ────────────────────────────────────────
  // Find the highest real price across all fetched events, round UP to
  // the next multiple of 500, then add a ₹1,000 buffer on top —
  // e.g. highest price ₹1,230 → round to ₹1,500 → +1,000 buffer →
  // slider max = ₹2,500. Runs once events are loaded.
  useEffect(() => {
    if (allEvents.length === 0) return;
    const prices = allEvents.map(e => Number(e.price || 0)).filter(p => p > 0);
    if (prices.length === 0) return;

    const highest    = Math.max(...prices);
    const roundedMax = Math.ceil(highest / 500) * 500 + 1000;

    setMaxPrice(roundedMax);

    // Only auto-set the slider's default full range once, on first
    // successful load — don't override the user's current selection on
    // later background refetches.
    if (!priceInitializedRef.current) {
      setFilters(prev => ({ ...prev, price: [0, roundedMax] }));
      priceInitializedRef.current = true;
    }
  }, [allEvents]);

  useEffect(() => {
    if (!selectedType) return;

    const timer = window.setTimeout(() => {
      setFilters((prev) => { const f = cloneFilters(prev, maxPrice); f.type = new Set([selectedType]); return f; });
      setOpenId(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedType, maxPrice]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => { const f = cloneFilters(prev, maxPrice); f[key] = val; return f; });
    setOpenId(null);
    if (key === "type") onClearType?.();
  };

  const clearAll = () => {
    setFilters(emptyFilters(maxPrice));
    setSearch("");
    setOpenId(null);
    onClearType?.();
  };

  const activeChips = useMemo(() => {
    const chips = [];
    filters.type.forEach((v) => chips.push({ key: "type", val: v, label: v }));
    filters.venue.forEach((v) => chips.push({ key: "venue", val: v, label: v }));
    filters.year.forEach((v) => chips.push({ key: "year", val: v, label: v }));
    filters.scale.forEach((v) => chips.push({ key: "scale", val: v, label: `${v} scale` }));
    if (filters.price && (filters.price[0] > 0 || filters.price[1] < maxPrice)) {
      chips.push({
        key: "price",
        val: "range",
        label: `Rs ${filters.price[0].toLocaleString("en-IN")} - Rs ${filters.price[1].toLocaleString("en-IN")}`,
      });
    }
    return chips;
  }, [filters, maxPrice]);

  const removeChip = (key, val) => {
    setFilters((prev) => {
      const f = cloneFilters(prev, maxPrice);
      if (key === "year") f.year = new Set();
      else if (key === "price") f.price = [0, maxPrice];
      else f[key].delete(val);
      return f;
    });
    setOpenId(null);
    if (key === "type") onClearType?.();
  };

  const filtered = useMemo(() => {
    let evs = allEvents;
    const q = search.toLowerCase().trim();
    if (q) evs = evs.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q)
    );
    if (filters.type.size) evs = evs.filter((e) => filters.type.has(e.type));
    if (filters.venue.size) evs = evs.filter((e) => filters.venue.has(e.venue));
    if (filters.year.size) evs = evs.filter((e) => filters.year.has(String(e.year)));
    if (filters.scale.size) evs = evs.filter((e) => filters.scale.has(e.scale));
    if (filters.price) {
      evs = evs.filter((e) => {
        const price = Number(e.price || 0);
        return price === 0 || (price >= filters.price[0] && price <= filters.price[1]);
      });
    }
    return [...evs].sort((a, b) => {
      const av = a.year * 100 + (MONTH_IDX[a.month] ?? 0);
      const bv = b.year * 100 + (MONTH_IDX[b.month] ?? 0);
      return sort === "latest" ? bv - av : av - bv;
    });
  }, [filters, search, sort, allEvents]);

  // The currently open event object
  const openEvent = useMemo(
    () => filtered.find((e) => e.id === openId) || null,
    [filtered, openId]
  );

  return (
    <>
    <div className={styles.layout}>
      <Sidebar
        filters={filters}
        onChange={handleFilterChange}
        onClear={clearAll}
        maxPrice={maxPrice}
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
      />

      <main className={styles.main}>
        {/* Pick-mode banner — shown when arriving here from Create Event to
            choose a reference event, either the event-level reference or a
            per-vendor one. */}
        {pickContext && (
          <div style={{
            background: '#D4860A', color: '#1a1008', padding: '10px 20px',
            borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
            gap: 12, flexWrap: 'wrap',
          }}>
            <span>
              {pickContext.type === 'vendorRef'
                ? 'Picking a reference event for this vendor — click "+ Add to Event" on the one you want.'
                : 'Picking a reference event for your event — click "+ Add to Event" on the one you want.'}
            </span>
            <button
              onClick={() => navigate('/create-event')}
              style={{ background: 'rgba(26,16,8,0.15)', border: '1px solid rgba(26,16,8,0.3)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#1a1008', fontFamily: 'inherit', flexShrink: 0 }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* top bar */}
        <div className={styles.topBar}>
          {/* Mobile-only "Filters" button — opens the Sidebar drawer.
              Hidden on desktop via CSS (the sidebar sits inline there). */}
         <div className={styles.searchBox} data-tour="searchBox">
            <span className={styles.searchIcon}>⌕</span>
            <input
              type="text"
              placeholder="Search events, venues, planners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            {!search && <span className={styles.searchHint}>Ctrl+K</span>}
            {search && <button className={styles.clearSearch} onClick={() => setSearch("")}>✕</button>}
          </div>
        
          <button
            type="button"
            className={styles.filterToggleBtn}
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Open filters"
            data-tour="filterToggleBtn"
          >
            <span className={styles.filterToggleIcon} aria-hidden="true">⎘</span>
            Filters
            {activeChips.length > 0 && (
              <span className={styles.filterToggleBadge}>{activeChips.length}</span>
            )}
          </button>

         
          <select className={styles.sortSelect} value={sort} onChange={(e) => setSort(e.target.value)} data-tour="sortSelect">
            <option value="latest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {/* filter chips */}
        {activeChips.length > 0 && (
          <div className={styles.chips} data-tour="chips">
            {activeChips.map((c) => (
              <button key={`${c.key}:${c.val}`} className={styles.chip} onClick={() => removeChip(c.key, c.val)}>
                {c.label} <span className={styles.chipX}>✕</span>
              </button>
            ))}
            <button className={styles.chipClear} onClick={clearAll}>Clear all</button>
          </div>
        )}

        {loading ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Loading events…</div>
          </div>
        ) : (
          <>
            <div className={styles.resultsCount}>
              Showing <strong>{filtered.length}</strong> of <strong>{allEvents.length}</strong> events
            </div>

            {filtered.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔍</div>
                <div className={styles.emptyTitle}>No events found</div>
                <div className={styles.emptySub}>Try adjusting filters or search term</div>
              </div>
            ) : (
              <>
                {/* ── Expand panel renders HERE, above the grid, with ref for scroll ── */}
                {openEvent && (
                  <div ref={expandPanelRef}>
                    <EventCard
                      key={`expand-${openEvent.id}`}
                      event={openEvent}
                      isBookmarked={!!bookmarks[openEvent.id]}
                      onBookmarkToggle={onBookmarkToggle}
                      allEvents={allEvents}
                      openId={openId}
                      onOpen={handleOpen}
                      onClose={handleClose}
                      forceExpanded
                      pickContext={pickContext}
                      onAddToEvent={handleAddToEvent}
                    />
                  </div>
                )}

                {/* ── Card grid ── */}
                <div className={styles.grid} data-tour="grid">
                  {filtered.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isBookmarked={!!bookmarks[event.id]}
                      onBookmarkToggle={onBookmarkToggle}
                      allEvents={allEvents}
                      openId={openId}
                      onOpen={handleOpen}
                      onClose={handleClose}
                      pickContext={pickContext}
                      onAddToEvent={handleAddToEvent}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <ClientAdminChat user={user} pageContext="Event Planning" />

    </div>
    <OnboardingTour tourId="explore" steps={exploreTourSteps} />
  </>
  );
}
