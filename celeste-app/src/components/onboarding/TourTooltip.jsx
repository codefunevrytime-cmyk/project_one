/**
 * Custom tooltip renderer passed to <Joyride tooltipComponent={TourTooltip} />.
 * Joyride calls this with all the render props below — see:
 * https://docs.react-joyride.com/custom-components
 */
export default function TourTooltip({
  index,
  size,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}) {
  return (
    <div className="tour-card tour-card-transition" {...tooltipProps}>
      <button type="button" className="tour-card-close" {...closeProps} aria-label="Close tour">
        <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <div className="tour-card-progress">
        {Array.from({ length: size }).map((_, i) => (
          <span
            key={i}
            className={
              i === index ? 'tour-dot tour-dot-active' : i < index ? 'tour-dot tour-dot-done' : 'tour-dot'
            }
          />
        ))}
      </div>

      {step.title && <h3 className="tour-card-title">{step.title}</h3>}
      <div className="tour-card-body">{step.content}</div>

      <div className="tour-card-footer">
        <button type="button" className="tour-link" {...skipProps}>
          Skip tour
        </button>

        <div className="tour-card-actions">
          {index > 0 && (
            <button type="button" className="tour-btn tour-btn-ghost" {...backProps}>
              Back
            </button>
          )}
          <button type="button" className="tour-btn tour-btn-gold" {...primaryProps}>
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
