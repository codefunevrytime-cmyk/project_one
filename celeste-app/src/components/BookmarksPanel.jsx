import { EVENTS, THEME_GRADIENTS, EVENT_CATEGORIES } from "../context/data/events";
import { BookmarkIcon } from "./BookmarkIcon";
import styles from "./BookmarksPanel.module.css";

export function BookmarksPanel({ bookmarks, onRemove, isOpen, onClose }) {
  const saved = EVENTS.filter((e) => bookmarks.has(e.id));

  return (
    <>
      <div
        className={styles.overlay}
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />
      <aside
        className={styles.panel}
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BookmarkIcon filled size={18} color="#1D9E75" />
            <span className={styles.title}>Saved Events</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {saved.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔖</div>
            <p className={styles.emptyTitle}>No saved events yet</p>
            <p className={styles.emptySub}>Hover over a card and click the bookmark icon to save events here.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {saved.map((e) => {
              const cat = EVENT_CATEGORIES.find((c) => c.type === e.type);
              const grad = THEME_GRADIENTS[e.type] || ["#e0e0e0","#bdbdbd"];
              return (
                <div key={e.id} className={styles.item}>
                  <div
                    className={styles.thumb}
                    style={{ background: `linear-gradient(135deg,${grad[0]},${grad[1]})` }}
                  >
                    {cat?.icon ?? "📅"}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.name}>{e.title}</div>
                    <div className={styles.sub}>{e.type} · {e.venue}</div>
                    <div className={styles.sub}>{e.month} {e.year}</div>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemove(e.id)}
                    title="Remove"
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
}
