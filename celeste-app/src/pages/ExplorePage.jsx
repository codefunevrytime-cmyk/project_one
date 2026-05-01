import { useState, useMemo } from "react";
import { EVENTS, MONTH_IDX } from "../context/data/events";
import { EventCard } from "../components/EventCard";
import { Sidebar } from "../components/Sidebar";
import styles from "./ExplorePage.module.css";

const EMPTY_FILTERS = { type: new Set(), venue: new Set(), year: new Set(), scale: new Set(), price: [0, 200000] };
function cloneFilters(f) {
  return { type: new Set(f.type), venue: new Set(f.venue), year: new Set(f.year), scale: new Set(f.scale), price: f.price };
}

export function ExplorePage({ bookmarks, onBookmarkToggle, selectedType, onClearType }) {
  const [filters, setFilters] = useState(() => {
    if (selectedType) return { ...EMPTY_FILTERS, type: new Set([selectedType]) };
    return EMPTY_FILTERS;
  });
  const [search, setSearch]   = useState("");
  const [sort, setSort]       = useState("latest");

  // ── expand panel ───────────────────────────────────────────────────────
  const [openId, setOpenId] = useState(null);
  const handleOpen  = (id) => setOpenId(id);
  const handleClose = ()   => setOpenId(null);
  // ───────────────────────────────────────────────────────────────────────

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
    filters.type.forEach((v)  => chips.push({ key: "type",  val: v, label: v }));
    filters.venue.forEach((v) => chips.push({ key: "venue", val: v, label: v }));
    filters.year.forEach((v)  => chips.push({ key: "year",  val: v, label: v }));
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
    let evs = EVENTS;
    const q = search.toLowerCase().trim();
    if (q) evs = evs.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.planner.toLowerCase().includes(q)
    );
    if (filters.type.size)  evs = evs.filter((e) => filters.type.has(e.type));
    if (filters.venue.size) evs = evs.filter((e) => filters.venue.has(e.venue));
    if (filters.year.size)  evs = evs.filter((e) => filters.year.has(String(e.year)));
    if (filters.scale.size) evs = evs.filter((e) => filters.scale.has(e.scale));
    if (filters.price) evs = evs.filter((e) => e.price >= filters.price[0] && e.price <= filters.price[1]);
    return [...evs].sort((a, b) => {
      const av = a.year * 100 + MONTH_IDX[a.month];
      const bv = b.year * 100 + MONTH_IDX[b.month];
      return sort === "latest" ? bv - av : av - bv;
    });
  }, [filters, search, sort]);

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

        <div className={styles.resultsCount}>
          Showing <strong>{filtered.length}</strong> of <strong>{EVENTS.length}</strong> events
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
                allEvents={EVENTS}
                openId={openId}
                onOpen={handleOpen}
                onClose={handleClose}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}