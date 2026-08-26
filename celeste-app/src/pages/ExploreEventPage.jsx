import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ExplorePage } from "./ExplorePage";
import { BookmarksPanel } from "../components/BookmarksPanel";

export default function ExploreEventPage({ bookmarks, onBookmarkToggle }) {
  const location = useLocation();
  const [selectedType, setSelectedType] = useState(
    location.state?.selectedType || new URLSearchParams(location.search).get("type") || null
  );
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  useEffect(() => {
    const typeFromUrl = location.state?.selectedType || new URLSearchParams(location.search).get("type") || null;
    const timer = window.setTimeout(() => setSelectedType(typeFromUrl), 0);
    return () => window.clearTimeout(timer);
  }, [location.search, location.state]);

  return (
    <>
      <ExplorePage
        bookmarks={bookmarks}
        onBookmarkToggle={onBookmarkToggle}
        selectedType={selectedType}
        onClearType={() => setSelectedType(null)}
      />
      <BookmarksPanel
        bookmarks={bookmarks}
        onRemove={onBookmarkToggle}
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
      />
    </>
  );
}
