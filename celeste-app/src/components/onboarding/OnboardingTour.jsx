import { Joyride, ACTIONS } from 'react-joyride';
import TourTooltip from './TourTooltip';
import { useOnboardingTour } from '../../hooks/useOnboardingTour';
import './tour.css';

/**
 * Drop this into any page and pass that page's own steps array.
 * First-time visitors get it auto-played once; everyone else gets a small
 * "Take the tour" pill (bottom-left) to replay it on demand.
 *
 * <OnboardingTour tourId="landing" steps={landingTourSteps} />
 *
 * Reuse pattern for another page:
 *   1. Write a `<page>TourSteps.js` file with a `target` CSS selector +
 *      `title` + `content` per stop — reuse existing classNames/ids where
 *      you can, only add `data-tour="..."` attributes where nothing
 *      stable already exists to target.
 *   2. Render <OnboardingTour tourId="<uniqueKey>" steps={...} /> once,
 *      anywhere in that page's component tree.
 */
export default function OnboardingTour({ tourId, steps, showRestartButton = true }) {
  const { run, stepIndex, handleEvent, startTour } = useOnboardingTour(tourId);

  const handleStartTour = (e) => {
    e.preventDefault();
    e.stopPropagation();
    startTour();
  };

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        continuous
        showSkipButton
        disableOverlayClose
        scrollToFirstStep
        locale={{ last: 'Finish' }}
        options={{
          zIndex: 10000,
          arrowColor: '#d4a853',
          overlayColor: 'rgba(10, 8, 4, 0.72)',
          spotlightRadius: 0,
          spotlightPadding: 0,
          disableScrolling: false,
          disableSpotlight: true,
          floaterProps: {
            offset: 10,
          },
        }}
      />

      {showRestartButton && !run && (
        <button type="button" className="tour-restart-pill" onClick={handleStartTour}>
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path
              d="M13.5 8A5.5 0 112.9 5.5M2.5 2.5v3.4h3.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Take the tour
        </button>
      )}
    </>
  );
}

// Re-exported so a page can trigger a step transition manually if it ever
// needs to (e.g. closing a dropdown before advancing) without importing
// react-joyride directly.
export { ACTIONS };