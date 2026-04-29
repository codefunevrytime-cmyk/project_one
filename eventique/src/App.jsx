import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { ExplorePage } from "./pages/ExplorePage";
import { BookmarksPanel } from "./components/BookmarksPanel";
import { useBookmarks } from "./hooks/useBookmarks";
import "./App.css";

export default function App() {
  const { bookmarks, toggle, remove } = useBookmarks();
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const handleSelectType = (type) => {
    setSelectedType(type);
  };

  const handleClearType = () => {
    setSelectedType(null);
  };

  return (
    <div className="app">
      <Navbar
        bookmarkCount={bookmarks.size}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onSelectType={handleSelectType}
      />

      <ExplorePage
        bookmarks={bookmarks}
        onBookmarkToggle={toggle}
        selectedType={selectedType}
        onClearType={handleClearType}
      />

      <BookmarksPanel
        bookmarks={bookmarks}
        onRemove={remove}
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
      />
    </div>
  );
}
