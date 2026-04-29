import { useState, useCallback } from "react";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(new Set());

  const toggle = useCallback((id) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { bookmarks, toggle, remove };
}
