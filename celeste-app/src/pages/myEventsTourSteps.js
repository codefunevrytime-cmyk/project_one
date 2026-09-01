// Tour steps for My Events page
export const myEventsTourSteps = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Your Event Dashboard',
    content:
      "Track all your events in one place. See status updates, make payments, and manage your upcoming and past events.",
  },
  {
    target: '.me-header',
    placement: 'auto',
    disableBeacon: true,
    title: 'Header Actions',
    content:
      'Use the back button to navigate, see your events title, and quickly create a new event with the "+ New event" button.',
  },
  {
    target: '.me-tabs',
    placement: 'auto',
    disableBeacon: true,
    title: 'Event Tabs',
    content:
      'Switch between Upcoming, Past, and Cancelled events. The badge shows how many events are in each category.',
  },
  {
    target: '.me-main',
    placement: 'auto',
    disableBeacon: true,
    title: 'Event Cards',
    content:
      'Each card shows an event with its status, timeline, and key details. Expand to see full information and take actions.',
  },
  {
    target: '.EventCard',
    placement: 'auto',
    disableBeacon: true,
    title: 'Event Status',
    content:
      'The status indicator shows where your event is in the process — from submitted to confirmed. Click to expand for details.',
  },
];
