import { useState, useRef, useEffect } from "react";
import { BookmarkIcon } from "./BookmarkIcon";
import { EVENT_CATEGORIES } from "../data/events";
import styles from "./Navbar.module.css";

export function Navbar({ bookmarkCount, onOpenBookmarks, onSelectType }) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const exploreRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target)) setExploreOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTypeSelect = (type) => {
    onSelectType(type);
    setExploreOpen(false);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>✦ Eventique</div>

      <div className={styles.links}>
        <span className={styles.link}>Home</span>
        <span className={styles.link}>Products</span>

        {/* Explore dropdown */}
        <div className={styles.dropWrap} ref={exploreRef}>
          <button
            className={`${styles.exploreBtn} ${exploreOpen ? styles.exploreBtnActive : ""}`}
            onClick={() => setExploreOpen((o) => !o)}
          >
            Explore Events
            <span className={`${styles.chevron} ${exploreOpen ? styles.chevronOpen : ""}`} />
          </button>
          {exploreOpen && (
            <div className={styles.exploreMenu}>
              <div className={styles.menuHeader}>Browse by type</div>
              {EVENT_CATEGORIES.map((cat) => (
                <div
                  key={cat.type}
                  className={styles.menuItem}
                  onClick={() => handleTypeSelect(cat.type)}
                >
                  <span
                    className={styles.menuIcon}
                    style={{ background: cat.bg }}
                  >{cat.icon}</span>
                  {cat.type}
                </div>
              ))}
            </div>
          )}
        </div>

        <span className={`${styles.link} ${styles.active}`}>Events</span>
        <span className={styles.link}>About</span>
        <span className={styles.link}>Contact</span>
      </div>

      <div className={styles.right}>
        {/* Bookmark button */}
        <button className={styles.iconBtn} onClick={onOpenBookmarks} title="Saved events">
          <BookmarkIcon size={17} color="currentColor" />
          {bookmarkCount > 0 && (
            <span className={styles.badge}>{bookmarkCount}</span>
          )}
        </button>

        {/* Profile dropdown */}
        <div className={styles.dropWrap} ref={profileRef}>
          <div
            className={styles.avatar}
            onClick={() => setProfileOpen((o) => !o)}
          >AK</div>
          {profileOpen && (
            <div className={styles.profileMenu}>
              <div className={styles.profileItem}>👤 My Profile</div>
              <div
                className={styles.profileItem}
                onClick={() => { setProfileOpen(false); onOpenBookmarks(); }}
              >🔖 Saved Events {bookmarkCount > 0 && <span className={styles.profileBadge}>{bookmarkCount}</span>}</div>
              <div className={styles.profileItem}>⚙️ Settings</div>
              <div className={`${styles.profileItem} ${styles.profileItemDanger}`}>Sign Out</div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
