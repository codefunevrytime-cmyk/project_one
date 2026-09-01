// Step targets below reuse selectors that already exist in Navbar.jsx and
// LandingPage.jsx (.nav-events-wrap, .nav-services-wrap, #gallery,
// #testimonials, #contact) — no markup changes were needed to wire this up.
export const landingTourSteps = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to Arc.',
    content:
      "A 30-second look at how everything here fits together — browsing events, seeing what we offer, and getting in touch. Skip anytime.",
  },
  {
    target: '.nav-events-wrap',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Explore Events',
    content:
      'Browse real events by type — weddings, corporate, birthdays and more — or jump straight into events you have already saved.',
  },
  {
    target: '.nav-services-wrap',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Everything we offer',
    content:
      'Planning, guest experience, venue and logistics — every service lives here, grouped by what stage of the event it covers.',
  },
  {
    target: '#gallery',
    placement: 'top',
    disableBeacon: true,
    title: 'Visual stories',
    content: 'Real work from real events. Open any photo for the full story and how to book something similar.',
  },
  {
    target: '#testimonials',
    placement: 'top',
    disableBeacon: true,
    title: 'Client stories',
    content: "Hear it from people who've actually worked with us before you commit to anything.",
  },
  {
    target: '#contact',
    placement: 'top',
    disableBeacon: true,
    title: "Let's talk",
    content:
      "Ready to start? Send a message here, or sign up first to track your event from one dashboard.",
  },
];
