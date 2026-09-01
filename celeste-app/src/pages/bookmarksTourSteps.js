// Tour steps for Saved Bookmarks page
export const bookmarksTourSteps = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Your Saved Collection',
    content:
      "All your bookmarked events and vendors are organized here. Compare options, revisit favorites, and manage your saved items.",
  },
  {
    target: 'header',
    placement: 'auto',
    disableBeacon: true,
    title: 'Collection Overview',
    content:
      'See at a glance how many items you have saved. The badges show total saved, events, and vendors separately.',
  },
  {
    target: 'main',
    placement: 'auto',
    disableBeacon: true,
    title: 'Organized Sections',
    content:
      'Your saved items are split into Events and Vendors sections. Each section shows a count and lets you browse similar items.',
  },
  {
    target: '.SavedCard',
    placement: 'auto',
    disableBeacon: true,
    title: 'Saved Cards',
    content:
      'Each card shows a saved item with key details. Click "Open" to view the full page, or use the bookmark icon to remove it from your collection.',
  },
];
