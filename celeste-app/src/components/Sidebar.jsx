
import PriceSlider from "./PriceSlider";
import { EVENTS } from "../context/data/events";
import styles from "./Sidebar.module.css";

const VENUES = [...new Set(EVENTS.map((e) => e.venue))].sort();
const YEARS  = [...new Set(EVENTS.map((e) => e.year))].sort((a, b) => b - a);
const SCALES = ["Small", "Medium", "Large"];
const TYPES  = [...new Set(EVENTS.map((e) => e.type))].sort();
const PRICE_MAX = 200000;  // ← here


function countFor(key, val) {
  return EVENTS.filter((e) => String(e[key]) === String(val)).length;
}

export function Sidebar({ filters, onChange, onClear }) {
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
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>Filters</span>
        <button className={styles.clearBtn} onClick={onClear}>Clear all</button>
      </div>

      <Section title="Price Range">
  <PriceSlider
    min={0}
    max={200000}
    value={filters.price || [0, 200000]}
    onChange={(val) => onChange("price", val)}
  />
   </Section>

      <Section title="Event Type">
        {TYPES.map((t) => (
          <CheckItem
            key={t}
            label={t}
            count={countFor("type", t)}
            checked={filters.type.has(t)}
            onChange={() => toggle("type", t)}
          />
        ))}
      </Section>

      <Section title="Venue / Setting">
        {VENUES.map((v) => (
          <CheckItem
            key={v}
            label={v}
            count={countFor("venue", v)}
            checked={filters.venue.has(v)}
            onChange={() => toggle("venue", v)}
          />
        ))}
      </Section>

      <Section title="Year">
        {YEARS.map((y) => (
          <RadioItem
            key={y}
            label={String(y)}
            count={countFor("year", y)}
            checked={filters.year.has(String(y))}
            onChange={() => toggle("year", String(y), true)}
          />
        ))}
      </Section>

      <Section title="Scale">
        {SCALES.map((s) => (
          <CheckItem
            key={s}
            label={`${s} events`}
            count={countFor("scale", s)}
            checked={filters.scale.has(s)}
            onChange={() => toggle("scale", s)}
          />
        ))}
      </Section>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function CheckItem({ label, count, checked, onChange }) {
  return (
    <label className={styles.filterLabel}>
      <input type="checkbox" checked={checked} onChange={onChange} className={styles.check} />
      <span className={styles.labelText}>{label}</span>
      <span className={styles.count}>{count}</span>
    </label>
  );
}

function RadioItem({ label, count, checked, onChange }) {
  return (
    <label className={styles.filterLabel}>
      <input type="radio" name="yearFilter" checked={checked} onChange={onChange} className={styles.check} />
      <span className={styles.labelText}>{label}</span>
      <span className={styles.count}>{count}</span>
    </label>
  );
}
