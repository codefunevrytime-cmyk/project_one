import { Link } from 'react-router-dom';
import EventModal from '../components/EventModal';
import Footer from '../components/Footer';
import { eventsData } from '../context/data/eventsData';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';
import { EventCard } from '../components/EventCard';
import { BookmarksPanel } from '../components/BookmarksPanel';
import { Sidebar } from '../components/Sidebar';
import { BookmarkIcon } from '../components/BookmarkIcon';
import { ExplorePage } from '../pages/ExplorePage';

function sortLatestFirst(events) {
  return [...events].sort((first, second) => new Date(second.eventDate) - new Date(first.eventDate));
}

export default function BookmarksPage() {
  const { bookmarkCount, bookmarkedEventIds, isBookmarked, toggleBookmark } = useAuth();
  const bookmarkedEvents = sortLatestFirst(
    eventsData.filter((event) => bookmarkedEventIds.includes(event.id)),
  );

  const { isOpen, open, close, navigate, currentIndex } = useModal(bookmarkedEvents.length);
  const activeEvent = bookmarkedEvents[currentIndex] || null;

  return (
    <div className="events-page">
      <section className="events-hero saved-hero">
        <div>
          <span className="events-eyebrow">Saved Boards</span>
          <h1>Your bookmarked event references live here.</h1>
          <p>
            Save cards from Explore Events and they stay collected in one place for quick comparison
            or client discussion.
          </p>
        </div>

        <Link to="/events" className="events-bookmark-shortcut">
          <span>Back to explore</span>
          <strong>{bookmarkCount}</strong>
        </Link>
      </section>

      <section className="events-results saved-results">
        <div className="events-results-header">
          <div>
            <span className="events-sidebar-label">Bookmarked</span>
            <h2>{bookmarkCount} saved event references</h2>
            <p>Hover any card and use the bookmark toggle again when you want to remove it.</p>
          </div>
        </div>

        {bookmarkedEvents.length === 0 ? (
          <div className="events-empty-state">
            <h3>No bookmarks yet.</h3>
            <p>Open Explore Events, hover a card, and tap the bookmark icon in the top-right corner.</p>
            <Link to="/events" className="btn-book">
              Explore events
            </Link>
          </div>
        ) : (
          <div className="events-grid">
            {bookmarkedEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                isBookmarked={isBookmarked(event.id)}
                onToggleBookmark={toggleBookmark}
                onOpen={() => open(index)}
              />
            ))}
          </div>
        )}
      </section>

      <EventModal
        event={activeEvent}
        isOpen={isOpen}
        isBookmarked={activeEvent ? isBookmarked(activeEvent.id) : false}
        onClose={close}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToggleBookmark={toggleBookmark}
      />

      <Footer />
    </div>
  );
}
