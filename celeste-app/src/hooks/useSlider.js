import { useState, useEffect, useCallback } from 'react';

/**
 * useSlider Hook
 * Reusable auto-advancing carousel/slider logic.
 * 
 * @param {number} count — total number of slides
 * @param {number} intervalMs — auto-advance interval in milliseconds
 * 
 * Returns: current index, goTo function, and auto-advance cleanup.
 * Used by: LandingPage (hero slider, testimonials)
 */

export function useSlider(count, intervalMs = 4000) {
  const [current, setCurrent] = useState(0);

  /**
   * Jump directly to a specific slide index.
   */
  const goTo = useCallback((n) => {
    setCurrent(n);
  }, []);

  /**
   * Auto-advance: increment current index every intervalMs.
   * Cleans up on unmount or when count/interval changes.
   */
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs]);

  return { current, goTo };
}

