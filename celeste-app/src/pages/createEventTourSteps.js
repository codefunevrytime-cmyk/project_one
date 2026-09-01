// Tour steps for Create Event page
export const createEventTourSteps = [
  {
    target: '[data-tour="stepNav"]',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Create Your Event',
    content:
      "Plan your event in 4 simple steps. Fill in the basics, add vendors, set your budget, and review everything before submitting.",
  },
  {
    target: '[data-tour="stepDesc"]',
    placement: 'left',
    disableBeacon: true,
    title: 'Step Progress',
    content:
      'Follow the numbered steps at the top. Each step focuses on one part of your event planning.',
  },
  {
    target: '[data-tour="basicsLayout"]',
    placement: 'top',
    disableBeacon: true,
    title: 'Event Basics',
    content:
      'Start with the essentials: event name, type, date, location, and optionally pick a reference event for inspiration.',
  },
  {
    target: '[data-tour="input"]',
    placement: 'left',
    disableBeacon: true,
    title: 'Required Fields',
    content:
      'Fields marked with * are required. Fill them in to proceed to the next step.',
  },
];
