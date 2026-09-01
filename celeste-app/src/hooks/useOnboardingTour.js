import { useCallback, useEffect, useState } from 'react';
import { STATUS, EVENTS, ACTIONS } from 'react-joyride';

/**
 * Drives a single Joyride tour: auto-starts once per browser (per tourId),
 * tracks the current step, and exposes a manual restart handle for a
 * "Take the tour" button.
 *
 * @param {string} tourId - unique key, e.g. "landing" — becomes the
 *   localStorage flag, so each page/tour remembers its own seen state.
 * @param {object} options
 * @param {boolean} options.autoStart - auto-run for first-time visitors (default true)
 * @param {number} options.autoStartDelay - ms to wait before auto-starting,
 *   so the page has time to settle (default 700)
 */
export function useOnboardingTour(tourId, { autoStart = true, autoStartDelay = 700 } = {}) {
  const storageKey = `arc_tour_seen_${tourId}`;
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!autoStart) return undefined;

    let hasSeen = false;
    try {
      hasSeen = Boolean(localStorage.getItem(storageKey));
    } catch {
      // localStorage unavailable (privacy mode etc.) — just don't auto-start.
      return undefined;
    }

    if (hasSeen) return undefined;

    const timer = setTimeout(() => setRun(true), autoStartDelay);
    return () => clearTimeout(timer);
  }, [autoStart, autoStartDelay, storageKey]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore — worst case the tour just auto-plays again next visit
    }
  }, [storageKey]);

  // react-joyride v3 passes (data, controls) to onEvent — we only need
  // `data` here, since we're managing run/stepIndex ourselves (controlled
  // mode) rather than using the `controls` helpers.
  const handleEvent = useCallback((data) => {
    const { status, index, action, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      markSeen();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  }, [markSeen]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  return { run, stepIndex, handleEvent, startTour, stopTour };
}