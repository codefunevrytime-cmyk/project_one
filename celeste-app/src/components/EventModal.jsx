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

function DetailRow({ label, value }) {
  return (
    <div className="event-modal-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// Large detail view for the selected event card.
export default function EventModal({
  event,
  isOpen,
  isBookmarked,
  onClose,
  onPrev,
  onNext,
  onToggleBookmark,
}) {
  if (!event) {
    return null;
  }

  return (
    <div
      className={isOpen ? 'modal-backdrop open' : 'modal-backdrop'}
      onClick={(eventObject) => {
        if (eventObject.target === eventObject.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="event-modal-shell" key={event.id}>
        <div className="event-modal-media">
          <img src={event.img} alt={event.title} />
          <div className="event-modal-pill">{event.type}</div>
        </div>

        <div className="event-modal-body">
          <button type="button" className="modal-close" onClick={onClose}>
            x
          </button>

          <button
            type="button"
            className={`event-modal-bookmark${isBookmarked ? ' active' : ''}`}
            onClick={() => onToggleBookmark(event.id)}
          >
            <BookmarkIcon active={isBookmarked} />
            {isBookmarked ? 'Saved' : 'Save'}
          </button>

          <div className="event-modal-heading">
            <span>{event.dateLabel}</span>
            <h2>{event.title}</h2>
            <p>{event.desc}</p>
          </div>

          <div className="event-modal-grid">
            <DetailRow label="Event Type" value={event.type} />
            <DetailRow label="Venue Style" value={event.venueType} />
            <DetailRow label="Venue Name" value={event.venueName} />
            <DetailRow label="City" value={event.city} />
            <DetailRow label="Guest Size" value={event.guests} />
            <DetailRow label="Package" value={event.price} />
          </div>

          <div className="event-modal-tags">
            {event.pills.map((pill) => (
              <span key={pill}>{pill}</span>
            ))}
          </div>

          <div className="event-modal-actions">
            <div>
              <div className="price-big">{event.price}</div>
              <div className="price-note">production-ready package</div>
            </div>

            <div className="footer-right">
              <button type="button" className="nav-btn" onClick={onPrev} title="Previous event">
                &larr;
              </button>
              <button type="button" className="nav-btn" onClick={onNext} title="Next event">
                &rarr;
              </button>
              <button type="button" className="btn-book">
                Start this event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
