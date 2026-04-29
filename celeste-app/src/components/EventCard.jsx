import { useState } from "react";
import { BookmarkIcon } from "./BookmarkIcon";
import { THEME_GRADIENTS, EVENT_CATEGORIES } from "../context/data/events";
import styles from "./EventCard.module.css";

export function EventCard({ event, isBookmarked, onBookmarkToggle }) {
  const [hovered, setHovered] = useState(false);
  const [bmHovered, setBmHovered] = useState(false);

  const gradient = THEME_GRADIENTS[event.type] || ["#e0e0e0", "#bdbdbd"];
  const category = EVENT_CATEGORIES.find((c) => c.type === event.type);
  const emoji = category?.icon ?? "📅";

  const handleBookmark = (e) => {
    e.stopPropagation();
    onBookmarkToggle(event.id);
  };

  return (
    <div
      className={styles.card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ transform: hovered ? "translateY(-3px)" : "translateY(0)" }}
    >
      {/* Image area */}
      <div
        className={styles.imgArea}
        style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
      >
        <div className={styles.imgContent}>
          <div className={styles.emoji}>{emoji}</div>
          <div className={styles.imgDate}>{event.month} {event.year}</div>
        </div>

        {/* Bookmark button */}
        <button
          className={styles.bmBtn}
          style={{
            opacity: hovered || isBookmarked ? 1 : 0,
            background: isBookmarked
              ? "rgba(29,158,117,0.88)"
              : bmHovered
              ? "rgba(0,0,0,0.72)"
              : "rgba(0,0,0,0.52)",
          }}
          onClick={handleBookmark}
          onMouseEnter={() => setBmHovered(true)}
          onMouseLeave={() => setBmHovered(false)}
          title={isBookmarked ? "Remove bookmark" : "Save event"}
        >
          <BookmarkIcon filled={isBookmarked} size={15} color="#fff" />
        </button>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <div className={styles.tags}>
          <span className={styles.tagType}>{event.type}</span>
          <span className={styles.tagVenue}>{event.venue}</span>
          <span className={styles.tagScale}>{event.scale}</span>
        </div>
        <div className={styles.title}>{event.title}</div>
        <div className={styles.meta}>
          <span>📅 {event.month} {event.year}</span>
          <span className={styles.planner}>by {event.planner}</span>
        </div>
      </div>
    </div>
  );
}
