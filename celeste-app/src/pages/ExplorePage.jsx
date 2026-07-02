import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { MONTH_IDX } from "../context/data/events";
import { EventCard } from "../components/EventCard";
import { Sidebar } from "../components/Sidebar";
import styles from "./ExplorePage.module.css";
import ClientAdminChat from '../components/ClientAdminChat';
import { useAuth } from '../hooks/useAuth';


import { API_URL } from '../config/api';

const API = API_URL;

const EVENT_PRICE_MAX = 120000;
const EMPTY_FILTERS = { type: new Set(), venue: new Set(), year: new Set(), scale: new Set(), price: [0, EVENT_PRICE_MAX] };

function cloneFilters(f) {
  return {
    type: new Set(f.type),
    venue: new Set(f.venue),
    year: new Set(f.year),
    scale: new Set(f.scale),
    price: [...(f.price || [0, EVENT_PRICE_MAX])],
  };
}

function mapGalleryToEvent(item) {
  const date  = item.event_date ? new Date(item.event_date) : null;
  const month = date ? date.toLocaleString('en-IN', { month: 'long' }) : 'January';
  const year  = date ? date.getFullYear() : new Date().getFullYear();
  const type = (item.event_type && item.event_type.trim()) ? item.event_type.trim() : 'Wedding';
  const venue = (item.venue && item.venue.trim()) ? item.venue.trim() : '';
  const scale = (item.scale && item.scale.trim()) ? item.scale.trim() : '';
  const description = item.description || '';

  const images = Array.isArray(item.images) && item.images.length > 0
    ? item.images
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

  const [filters, setFilters] = useState(() => {
    if (selectedType) return { ...cloneFilters(EMPTY_FILTERS), type: new Set([selectedType]) };
    return cloneFilters(EMPTY_FILTERS);
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [openId, setOpenId] = useState(null);
  const [searchParams] = useSearchParams();

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

  useEffect(() => {
    if (!selectedType) return;

    const timer = window.setTimeout(() => {
      setFilters((prev) => { const f = cloneFilters(prev); f.type = new Set([selectedType]); return f; });
      setOpenId(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedType]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => { const f = cloneFilters(prev); f[key] = val; return f; });
    setOpenId(null);
    if (key === "type") onClearType?.();
  };

  const clearAll = () => {
    setFilters(cloneFilters(EMPTY_FILTERS));
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
    if (filters.price && (filters.price[0] > 0 || filters.price[1] < EVENT_PRICE_MAX)) {
      chips.push({
        key: "price",
        val: "range",
        label: `Rs ${filters.price[0].toLocaleString("en-IN")} - Rs ${filters.price[1].toLocaleString("en-IN")}`,
      });
    }
    return chips;
  }, [filters]);

  const removeChip = (key, val) => {
    setFilters((prev) => {
      const f = cloneFilters(prev);
      if (key === "year") f.year = new Set();
      else if (key === "price") f.price = [0, EVENT_PRICE_MAX];
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
    <div className={styles.layout}>
      <Sidebar filters={filters} onChange={handleFilterChange} onClear={clearAll} />

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
          <div className={styles.searchBox}>
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
          <select className={styles.sortSelect} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="latest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {/* filter chips */}
        {activeChips.length > 0 && (
          <div className={styles.chips}>
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
                <div className={styles.grid}>
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
  );
}