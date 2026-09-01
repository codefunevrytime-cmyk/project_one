// Tour steps for Explore/Events page
export const exploreTourSteps = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Explore Events',
    content:
      "Browse real events here — weddings, corporate events, birthdays and more. Apply filters, search, and save what you like!",
  },
  {
    target: '[data-tour="searchBox"]',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Search Bar',
    content:
      'Search any event by name, venue, or type. You can also open search with Ctrl+K.',
  },
  {
    target: '[data-tour="filterToggleBtn"]',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Filters',
    content:
      'Filter events by type, venue, year, price, and scale. On mobile, tap the button — on desktop, use the sidebar.',
  },
  {
    target: '[data-tour="sortSelect"]',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Sort Events',
    content:
      'Choose to view events in newest or oldest order from here.',
  },
  {
    target: '[data-tour="chips"]',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Active Filters',
    content:
      'Your applied filters show here. Click a chip to remove it, or use "Clear all" to reset everything.',
  },
  {
    target: '[data-tour="grid"]',
    placement: 'top',
    disableBeacon: true,
    title: 'Events Grid',
    content:
      'All events appear here. Click any card to see full details. Use the bookmark icon to save your favorites.',
  },
];
