export const landingTourSteps = [
  {
    target: 'body',
    placement: 'center',
    icon: "✦",
    title: 'Welcome to Arc.',
    content: "A 30-second look at how everything here fits together — browsing events, seeing what we offer, and getting in touch. Skip anytime.",
  },
  {
    target: '.nav-events-wrap',
    mobileTarget: '[data-tour="mobile-explore-trigger"]',
    // On mobile: open the hamburger menu so the accordion button becomes visible
    beforeShow: () => window.dispatchEvent(new CustomEvent('arc-tour-open-mobile-menu')),
    beforeShowDelay: 380,
    placement: 'bottom',
    mobileContent: 'Tap "Explore Events" to browse by type — weddings, corporate, birthdays and more — or jump to events you\'ve already saved.',
    icon: "📅",
    title: 'Explore Events',
    content: 'Browse real events by type — weddings, corporate, birthdays and more — or jump straight into events you have already saved.',
  },
  {
    target: '.nav-services-wrap',
    mobileTarget: '[data-tour="mobile-services-trigger"]',
    // Menu already open from previous step — just a tiny delay to re-measure
    beforeShow: () => window.dispatchEvent(new CustomEvent('arc-tour-open-mobile-menu')),
    beforeShowDelay: 80,
    // Close the menu when leaving this step so the rest of the tour isn't obscured
    afterLeave: () => window.dispatchEvent(new CustomEvent('arc-tour-close-mobile-menu')),
    placement: 'bottom',
    mobileContent: 'Services lives right below — planning, guest experience, venue and logistics, grouped by what stage of the event it covers.',
    icon: "✨",
    title: 'Everything we offer',
    content: 'Planning, guest experience, venue and logistics — every service lives here, grouped by what stage of the event it covers.',
  },
  {
    target: '#gallery .gallery-grid',
    anchorTarget: '#gallery .section-title',
    placement: 'top-right',
    icon: "🖼",
    title: 'Visual stories',
    content: 'Real work from real events. Open any photo for the full story and how to book something similar.',
  },
  {
    target: '#testimonials .marquee-stack',
    anchorTarget: '#testimonials .section-label',
    placement: 'top-right',
    icon: "💬",
    title: 'Client stories',
    content: "Hear it from people who've actually worked with us before you commit to anything.",
  },
  {
    target: '#contact .contact-form',
    anchorTarget: '#contact .section-label',
    placement: 'top-right',
    icon: "✉",
    title: "Let's talk",
    content: "Ready to start? Send a message here, or sign up first to track your event from one dashboard.",
  },
];