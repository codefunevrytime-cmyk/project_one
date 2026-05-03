import { useState, useMemo, useEffect } from "react";
import { MONTH_IDX } from "../context/data/events";
import { EventCard } from "../components/EventCard";
import { Sidebar } from "../components/Sidebar";
import styles from "./ExplorePage.module.css";

const API = "http://localhost:5000/api";

const EMPTY_FILTERS = { type: new Set(), venue: new Set(), year: new Set(), scale: new Set() };

function cloneFilters(f) {
  return { type: new Set(f.type), venue: new Set(f.venue), year: new Set(f.year), scale: new Set(f.scale) };
}

// Map DB gallery row → EventCard shape
function mapGalleryToEvent(item) {
  const date = item.event_date ? new Date(item.event_date) : null;
  const month = date ? date.toLocaleString('en-IN', { month: 'long' }) : 'January';
  const year = date ? date.getFullYear() : new Date().getFullYear();

  // Parse type/venue/scale from description if stored as "[Type|Venue|Scale] text"
  // Otherwise fall back to sensible defaults
  let type = 'Wedding';
  let venue = 'Lawn';
  let scale = 'Large';
  let planner = item.description || '';

  const metaMatch = item.description && item.description.match(/^\[([^\]]+)\]/);
  if (metaMatch) {
    const parts = metaMatch[1].split('|');
    if (parts[0]) type = parts[0].trim();
    if (parts[1]) venue = parts[1].trim();
    if (parts[2]) scale = parts[2].trim();
    planner = item.description.replace(/^\[[^\]]+\]\s*/, '');
  }

  return {
    id: item.id,
    title: item.title || 'Untitled',
    type,
    venue,
    scale,
    month,
    year,
    planner,
    image_url: item.image_url,
    // Pass through original fields for modal
    _raw: item,
  };
}

export function ExplorePage({ bookmarks, onBookmarkToggle, selectedType, onClearType }) {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState(() => {
    if (selectedType) return { ...EMPTY_FILTERS, type: new Set([selectedType]) };
    return EMPTY_FILTERS;
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");

  const [openId, setOpenId] = useState(null);
  const handleOpen = (id) => setOpenId(id);
  const handleClose = () => setOpenId(null);

  // Fetch from DB
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

  // sync selectedType from navbar
  useMemo(() => {
    if (selectedType) {
      setFilters((prev) => { const f = cloneFilters(prev); f.type = new Set([selectedType]); return f; });
      setOpenId(null);
    }
  }, [selectedType]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => { const f = cloneFilters(prev); f[key] = val; return f; });
    setOpenId(null);
    if (key === "type") onClearType?.();
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
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
    return chips;
  }, [filters]);

  const removeChip = (key, val) => {
    setFilters((prev) => {
      const f = cloneFilters(prev);
      if (key === "year") f.year = new Set();
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
      e.venue.toLowerCase().includes(q) ||
      e.planner.toLowerCase().includes(q)
    );
    if (filters.type.size) evs = evs.filter((e) => filters.type.has(e.type));
    if (filters.venue.size) evs = evs.filter((e) => filters.venue.has(e.venue));
    if (filters.year.size) evs = evs.filter((e) => filters.year.has(String(e.year)));
    if (filters.scale.size) evs = evs.filter((e) => filters.scale.has(e.scale));
    return [...evs].sort((a, b) => {
      const av = a.year * 100 + (MONTH_IDX[a.month] ?? 0);
      const bv = b.year * 100 + (MONTH_IDX[b.month] ?? 0);
      return sort === "latest" ? bv - av : av - bv;
    });
  }, [filters, search, sort, allEvents]);

  return (
    <div className={styles.layout}>
      <Sidebar filters={filters} onChange={handleFilterChange} onClear={clearAll} />

      <main className={styles.main}>
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
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}