import PriceSlider from "./PriceSlider";
import { FilterOption, FilterPanel, FilterSection } from "./CommonControls";
import { EVENTS } from "../context/data/events";
import styles from "./Sidebar.module.css";

const VENUES = [...new Set(EVENTS.map((e) => e.venue))].sort();
const YEARS  = [...new Set(EVENTS.map((e) => e.year))].sort((a, b) => b - a);
const SCALES = ["Small", "Medium", "Large"];
const TYPES  = [...new Set(EVENTS.map((e) => e.type))].sort();


// maxPrice now comes from ExplorePage (computed dynamically from real
// event prices — round to nearest 500 + a ₹1,000 buffer). Falls back to
// 120000 if no prop is passed, just in case Sidebar is ever rendered
// without it.
export function Sidebar({ filters, onChange, onClear, maxPrice = 120000, isOpen = false, onClose }) {
  const commonPriceMax = maxPrice;
  const activeCount =
    filters.type.size +
    filters.venue.size +
    filters.year.size +
    filters.scale.size +
    (filters.price && (filters.price[0] > 0 || filters.price[1] < commonPriceMax) ? 1 : 0);

  const toggle = (key, val, isRadio = false) => {
    const prev = filters[key];
    if (isRadio) {
      onChange(key, prev.has(val) ? new Set() : new Set([val]));
      return;
    }
    const next = new Set(prev);
    next.has(val) ? next.delete(val) : next.add(val);
    onChange(key, next);
  };

  return (
    <>
      {/* Backdrop — only rendered visually on mobile (CSS-controlled).
          Tapping it closes the drawer, same as tapping outside on Amazon. */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Wrap is a no-op box on desktop; on mobile it becomes the fixed
          full-screen slide-in drawer container (see Sidebar.module.css). */}
      <div className={`${styles.sidebarWrap} ${isOpen ? styles.sidebarWrapOpen : ""}`}>
        {/* Single mobile-drawer header — title, active-count badge, Clear
            all, and the close button all live here. FilterPanel's own
            internal header (title + count + clear) is hidden on mobile
            via CSS so "Filters" never renders twice. */}
        <div className={styles.mobileHeader}>
          <span className={styles.mobileHeaderTitle}>
            Filters
            {activeCount > 0 && <span className={styles.mobileHeaderBadge}>{activeCount}</span>}
          </span>
          <div className={styles.mobileHeaderActions}>
            {activeCount > 0 && (
              <button type="button" className={styles.mobileHeaderClear} onClick={onClear}>
                Clear all
              </button>
            )}
            <button
              type="button"
              className={styles.mobileCloseBtn}
              onClick={onClose}
              aria-label="Close filters"
            >
              ✕
            </button>
          </div>
        </div>

        <FilterPanel
          className={styles.sidebar}
          headerClassName={styles.sidebarHeader}
          titleClassName={styles.sidebarTitle}
          clearClassName={styles.clearBtn}
          activeCount={activeCount}
          countClassName={styles.filterCountBadge}
          onClear={activeCount > 0 ? onClear : undefined}
        >

      <FilterSection title="Price Range" className={styles.section} titleClassName={styles.sectionTitle} bodyClassName={styles.filterBody}>
  <PriceSlider
    min={0}
    max={commonPriceMax}
    value={filters.price || [0, commonPriceMax]}
    onChange={(val) => onChange("price", val)}
  />
   </FilterSection>

      <FilterSection title="Event Type" className={styles.section} titleClassName={styles.sectionTitle} bodyClassName={styles.filterBody}>
        <div className={styles.chipGroup}>
        {TYPES.map((t) => (
          <FilterOption
            key={t}
            variant="chip"
            label={t}
            checked={filters.type.has(t)}
            onChange={() => toggle("type", t)}
            className={styles.checkChip}
            inputClassName={styles.check}
          />
        ))}
        </div>
      </FilterSection>

      <FilterSection title="Venue / Setting" className={styles.section} titleClassName={styles.sectionTitle} bodyClassName={styles.filterBody}>
        <div className={styles.chipGroup}>
        {VENUES.map((v) => (
          <FilterOption
            key={v}
            variant="chip"
            label={v}
            checked={filters.venue.has(v)}
            onChange={() => toggle("venue", v)}
            className={styles.checkChip}
            inputClassName={styles.check}
          />
        ))}
        </div>
      </FilterSection>

      <FilterSection title="Year" className={styles.section} titleClassName={styles.sectionTitle} bodyClassName={styles.filterBody}>
        <div className={styles.chipGroup}>
        {YEARS.map((y) => (
          <FilterOption
            key={y}
            variant="chip"
            label={String(y)}
            checked={filters.year.has(String(y))}
            onChange={() => toggle("year", String(y), true)}
            type="radio"
            name="yearFilter"
            className={styles.checkChip}
            inputClassName={styles.check}
          />
        ))}
        </div>
      </FilterSection>

      <FilterSection title="Scale" className={styles.section} titleClassName={styles.sectionTitle} bodyClassName={styles.filterBody}>
        <div className={styles.chipGroup}>
        {SCALES.map((s) => (
          <FilterOption
            key={s}
            variant="chip"
            label={`${s} events`}
            checked={filters.scale.has(s)}
            onChange={() => toggle("scale", s)}
            className={styles.checkChip}
            inputClassName={styles.check}
          />
        ))}
        </div>
      </FilterSection>
        </FilterPanel>

        {/* Mobile-only "apply" button — closes the drawer to reveal the
            already-live-filtered results underneath. Hidden on desktop. */}
        <button type="button" className={styles.mobileApplyBtn} onClick={onClose}>
          Show results
        </button>
      </div>
    </>
  );
}