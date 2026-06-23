
import PriceSlider from "./PriceSlider";
import { FilterOption, FilterPanel, FilterSection } from "./CommonControls";
import { EVENTS } from "../context/data/events";
import styles from "./Sidebar.module.css";

const VENUES = [...new Set(EVENTS.map((e) => e.venue))].sort();
const YEARS  = [...new Set(EVENTS.map((e) => e.year))].sort((a, b) => b - a);
const SCALES = ["Small", "Medium", "Large"];
const TYPES  = [...new Set(EVENTS.map((e) => e.type))].sort();
const PRICE_MAX = 200000;  // ← here


export function Sidebar({ filters, onChange, onClear }) {
  const commonPriceMax = Math.min(PRICE_MAX, 120000);
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
  );
}
