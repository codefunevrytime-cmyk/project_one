function BookmarkIcon({ active }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M6 3.5h8a1 1 0 0 1 1 1v12l-5-3.2L5 16.5v-12a1 1 0 0 1 1-1Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Reusable image card shared by the main event explorer and saved bookmarks page.
export default function EventCard({
  event,
  isBookmarked,
  onToggleBookmark,
  onOpen,
}) {
  const handleBookmarkClick = (eventObject) => {
    eventObject.stopPropagation();
    onToggleBookmark(event.id);
  };

  return (
    <article className="event-card" onClick={onOpen}>
      <img className="event-card-image" src={event.img} alt={event.title} loading="lazy" />

      <button
        type="button"
        className={`event-bookmark-btn${isBookmarked ? ' active' : ''}`}
        onClick={handleBookmarkClick}
        aria-label={isBookmarked ? `Remove ${event.title} from bookmarks` : `Save ${event.title} to bookmarks`}
      >
        <BookmarkIcon active={isBookmarked} />
      </button>

      <div className="event-card-overlay"></div>

      <div className="event-card-content">
        <div className="event-card-meta">
          <span className="event-card-type">{event.type}</span>
          <span className="event-card-date">{event.dateLabel}</span>
        </div>

        <h3>{event.title}</h3>

        <div className="event-card-details">
          <span>{event.venueType}</span>
          <span>{event.city}</span>
          <span>{event.guests}</span>
        </div>

        <div className="event-card-footer">
          <p>{event.venueName}</p>
          <strong>{event.price}</strong>
        </div>
      </div>
    </article>
  );
}
