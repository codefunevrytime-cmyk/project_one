import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ExplorePage } from "./ExplorePage";
import { useBookmarks } from "../hooks/useBookmarks";
import { BookmarksPanel } from "../components/BookmarksPanel";

export default function ExploreEventPage() {
  const location = useLocation();
  const [selectedType, setSelectedType] = useState(
    location.state?.selectedType || null
  );
  const { bookmarks, toggle, remove } = useBookmarks();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  return (
    <>
      <ExplorePage
        bookmarks={bookmarks}
        onBookmarkToggle={toggle}
        selectedType={selectedType}
        onClearType={() => setSelectedType(null)}
      />
      <BookmarksPanel
        bookmarks={bookmarks}
        onRemove={remove}
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
      />
    </>
  );
}