import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import EventModal from '../components/EventModal';
import Footer from '../components/Footer';
import { eventsData, featuredEventTypes } from '../data/eventsData';
import { useAuth } from '../hooks/useAuth';
import { useModal } from '../hooks/useModal';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest to oldest' },
  { value: 'oldest', label: 'Oldest to latest' },
  { value: 'priceHigh', label: 'Highest budget first' },
  { value: 'priceLow', label: 'Lowest budget first' },
];

function getEventYear(event) {
  return String(new Date(event.eventDate).getFullYear());
}

function getEventPrice(event) {
  return Number(event.price.replace(/[^0-9]/g, ''));
}

function toggleListValue(list, value) {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

function matchesSearch(event, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    event.title,
    event.type,
    event.venueType,
    event.venueName,
    event.city,
    ...event.pills,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function sortEvents(events, sortBy) {
  const sortedEvents = [...events];

  if (sortBy === 'oldest') {
    return sortedEvents.sort((first, second) => new Date(first.eventDate) - new Date(second.eventDate));
  }

  if (sortBy === 'priceHigh') {
    return sortedEvents.sort((first, second) => getEventPrice(second) - getEventPrice(first));
  }

  if (sortBy === 'priceLow') {
    return sortedEvents.sort((first, second) => getEventPrice(first) - getEventPrice(second));
  }

  return sortedEvents.sort((first, second) => new Date(second.eventDate) - new Date(first.eventDate));
}

export default function GalleryPage() {
  const { bookmarkCount, bookmarkedEventIds, isBookmarked, toggleBookmark } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetType = searchParams.get('type') || '';

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedTypes, setSelectedTypes] = useState(() => (presetType ? [presetType] : []));
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedVenueTypes, setSelectedVenueTypes] = useState([]);

  const eventTypes = [...new Set(eventsData.map((event) => event.type))];
  const eventYears = [...new Set(eventsData.map(getEventYear))].sort((first, second) => Number(second) - Number(first));
  const venueTypes = [...new Set(eventsData.map((event) => event.venueType))];

  useEffect(() => {
    setSelectedTypes(presetType ? [presetType] : []);
  }, [presetType]);

  const filteredEvents = sortEvents(
    eventsData.filter((event) => {
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(event.type);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(getEventYear(event));
      const matchesVenueType = selectedVenueTypes.length === 0 || selectedVenueTypes.includes(event.venueType);

      return matchesType && matchesYear && matchesVenueType && matchesSearch(event, query);
    }),
    sortBy,
  );

  const { isOpen, open, close, navigate, currentIndex } = useModal(filteredEvents.length);
  const activeEvent = filteredEvents[currentIndex] || null;

  useEffect(() => {
    if (isOpen && !activeEvent) {
      close();
    }
  }, [activeEvent, close, isOpen]);

  const clearAllFilters = () => {
    setQuery('');
    setSortBy('latest');
    setSelectedTypes([]);
    setSelectedYears([]);
    setSelectedVenueTypes([]);

    if (presetType) {
      setSearchParams({});
    }
  };

  const handleTypeToggle = (type) => {
    if (presetType) {
      setSearchParams({});
    }

    setSelectedTypes((currentTypes) => toggleListValue(currentTypes, type));
  };

  const hasFilters = Boolean(query)
    || selectedTypes.length > 0
    || selectedYears.length > 0
    || selectedVenueTypes.length > 0
    || sortBy !== 'latest';

  return (
    <div className="events-page">
      <section className="events-hero">
        <div>
          <span className="events-eyebrow">Explore Events</span>
          <h1>Browse event setups the way people actually shop.</h1>
          <p>
            Start with a type from the navigation dropdown, then narrow by year, venue style,
            and the kind of setup you need.
          </p>

          <div className="events-quick-links">
            <Link to="/events" className={!presetType ? 'active' : ''}>
              All events
            </Link>
            {featuredEventTypes.map((type) => (
              <Link
                key={type}
                to={`/events?type=${encodeURIComponent(type)}`}
                className={presetType === type ? 'active' : ''}
              >
                {type}
              </Link>
            ))}
          </div>
        </div>

        <Link to="/bookmarks" className="events-bookmark-shortcut">
          <span>Saved boards</span>
          <strong>{bookmarkCount}</strong>
        </Link>
      </section>

      <section className="events-shell">
        <aside className="events-sidebar">
          <div className="events-sidebar-header">
            <div>
              <span className="events-sidebar-label">Smart filters</span>
              <h2>Refine your event search</h2>
            </div>

            {hasFilters ? (
              <button type="button" className="events-clear-btn" onClick={clearAllFilters}>
                Clear all
              </button>
            ) : null}
          </div>

          <label className="events-search-box">
            <span>Search by event, venue, or setup style</span>
            <input
              type="search"
              placeholder="Try wedding, lawn, home, rooftop..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="events-filter-group">
            <h3>Event type</h3>
            {eventTypes.map((type) => (
              <label key={type} className="events-check-row">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>

          <div className="events-filter-group">
            <h3>Year</h3>
            {eventYears.map((year) => (
              <label key={year} className="events-check-row">
                <input
                  type="checkbox"
                  checked={selectedYears.includes(year)}
                  onChange={() => setSelectedYears((years) => toggleListValue(years, year))}
                />
                <span>{year}</span>
              </label>
            ))}
          </div>

          <div className="events-filter-group">
            <h3>Venue style</h3>
            {venueTypes.map((venueType) => (
              <label key={venueType} className="events-check-row">
                <input
                  type="checkbox"
                  checked={selectedVenueTypes.includes(venueType)}
                  onChange={() => setSelectedVenueTypes((types) => toggleListValue(types, venueType))}
                />
                <span>{venueType}</span>
              </label>
            ))}
          </div>
        </aside>

        <div className="events-results">
          <div className="events-results-header">
            <div>
              <span className="events-sidebar-label">Curated catalog</span>
              <h2>{filteredEvents.length} event setups ready to explore</h2>
              <p>Results stay focused on the event styles you have actually selected.</p>
            </div>

            <label className="events-sort-box">
              <span>Sort by month</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {bookmarkedEventIds.length > 0 ? (
            <div className="events-hint-card">
              <strong>{bookmarkedEventIds.length} saved</strong>
              <span>Your bookmarked events stay available from the profile menu and the saved boards page.</span>
            </div>
          ) : null}

          {filteredEvents.length === 0 ? (
            <div className="events-empty-state">
              <h3>No events match this filter set yet.</h3>
              <p>Try widening the year or venue style filters, or clear everything and start fresh.</p>
              <button type="button" className="btn-book" onClick={clearAllFilters}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="events-grid">
              {filteredEvents.map((event, index) => (
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
        </div>
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
