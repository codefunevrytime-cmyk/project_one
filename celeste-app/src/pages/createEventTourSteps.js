export const createEventTourSteps = [
  {
    target: '[data-tour="stepNav"]',
    placement: "bottom",
    icon: "✦",
    title: "Your planning roadmap",
    content: "Four focused steps — Basics, Vendors, Budget, and Review. Work through them at your own pace; you can always go back and adjust.",
    tip: "Completed steps stay editable. Click any finished step pill to revisit it.",
  },
  {
    target: '[data-tour="basicsLayout"]',
    placement: "top",
    icon: "📋",
    title: "Event essentials",
    content: "Name your event, choose its type, pick a date, set the location, and select your expected guest capacity. The calendar shows studio-wide availability at a glance.",
    tip: "Tap Share location to drop a pin on the map instead of typing an address.",
  },
  {
    target: '[data-tour="input"]',
    placement: "right",
    icon: "✎",
    title: "Required fields",
    content: "Fields marked with a gold asterisk (*) must be filled before you can move to the next step. Everything else is optional — add it if it helps your vendors.",
  },
  {
    target: '[data-tour="stepDesc"]',
    placement: "right",
    icon: "🖼",
    title: "Reference & inspiration",
    content: "Pick a reference event from our curated gallery, or upload your own inspiration photo. This gives your vendors an instant visual brief so everyone starts on the same page.",
    tip: "Once you've picked a reference, its style and estimated price flow directly into the Budget step.",
  },
];
