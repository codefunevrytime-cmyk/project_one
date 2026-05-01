import { useState, useEffect, useCallback } from 'react';

/**
 * useModal Hook
 * Handles modal open/close state and keyboard navigation (Escape, Arrow keys).
 * 
 * @param {number} itemCount — total items navigable inside the modal (for prev/next)
 * 
 * Returns: isOpen, open, close, navigate, currentIndex.
 * Used by: LandingPage (gallery modal), GalleryPage (event modal)
 */

export function useModal(itemCount) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  /**
   * Open the modal at a specific item index.
   * Also locks body scroll to prevent background scrolling.
   */
  const open = useCallback((index) => {
    setCurrentIndex(index);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  /**
   * Close the modal and restore body scroll.
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentIndex(-1);
    document.body.style.overflow = '';
  }, []);

  /**
   * Navigate relative to current item (+1 next, -1 prev).
   * Wraps around using modulo arithmetic.
   */
  const navigate = useCallback((dir) => {
    if (currentIndex < 0 || itemCount === 0) return;
    setCurrentIndex((prev) => (prev + dir + itemCount) % itemCount);
  }, [currentIndex, itemCount]);

  /**
   * Keyboard controls:
   * Escape → close modal
   * ArrowRight → next item
   * ArrowLeft → previous item
   */
  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close, navigate]);

  return { isOpen, open, close, navigate, currentIndex };
}

