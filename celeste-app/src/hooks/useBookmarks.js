import { useState, useCallback, useEffect, useRef } from "react";

const BOOKMARKS_KEY = "arc_saved_bookmarks";

function readBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const timerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const showToast = (msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message: msg });
    timerRef.current = setTimeout(() =>
      setToast(t => ({ ...t, visible: false })), 2200);
  };

  const toggle = useCallback((item) => {
    setBookmarks(prev => {
      const next = { ...prev };
      if (next[item.id]) { delete next[item.id]; showToast("Bookmark removed"); }
      else { next[item.id] = item; showToast("Bookmark added"); }
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setBookmarks(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  return {
    bookmarks,
    bookmarkList: Object.values(bookmarks),
    count: Object.keys(bookmarks).length,
    toggle,
    remove,
    toast,
  };
}
