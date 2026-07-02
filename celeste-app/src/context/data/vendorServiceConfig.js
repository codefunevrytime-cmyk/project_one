/* ─────────────────────────────────────────────────────────────────────────
   ADDITIONS NEEDED IN: src/context/data/vendorServiceConfig.js
   ─────────────────────────────────────────────────────────────────────────
   I don't have this file's current contents, so I can't safely edit it
   directly — merge the fields below into your existing entries instead of
   replacing the file. Everything is additive; nothing you already have
   (serviceId, path, title, filters, cardIcon, etc.) needs to change.

   Three new pieces, one per file I touched:

   1. VendorListingPage.jsx now reads `serviceConfig.staticData` and
      `serviceConfig.demoPortfolio` instead of hardcoding photography.
   2. VendorProfilePage.jsx already reads `serviceConfig.pricingTiers` and
      `serviceConfig.servicesOffered` (untouched) — just adding
      `demoPortfolio` as a fallback source of portfolio images for
      static/demo vendors that don't ship their own `portfolio` array.
   3. CreateEventPage.jsx now reads `serviceConfig.pricingModel` and
      `serviceConfig.extraFields` to build the vendor picker step. If a
      service entry doesn't define these yet, CreateEventPage falls back to
      hardcoded defaults for 'photography' and 'custom-invitations' only —
      so existing behavior is unaffected, but any NEW service you add must
      define these two fields or its booking step will render with no
      extra fields at all (not broken, just minimal).
   ───────────────────────────────────────────────────────────────────────── */

export const VENDOR_SERVICE_CONFIGS = [
  {
    id: 'photography',
    serviceId: 1,
    includeUnassigned: true, // existing vendors with no service_id default here
    path: '/services/photography',
    title: 'Photography',
    singular: 'Photographer',
    plural: 'photographers',
    breadcrumb: 'Vendors / Photography',
    cardIcon: '📷',
    bookmarkType: 'Photography',
    defaultSpecialty: 'Wedding Photography',
    searchPlaceholder: 'Search photographers…',
    emptyTitle: 'No photographers match your filters',
    priceUnit: '/ day',

    // Static/demo vendors shown alongside real DB vendors on the listing
    // page. Previously this was gated by `serviceConfig.id === 'photography'`
    // inside VendorListingPage itself — now every service supplies its own.
    staticData: [], // <- point this at your existing PHOTOGRAPHERS array

    // Fallback portfolio images for demo vendors that don't define their
    // own `portfolio` array. Replace the placeholders below with real URLs,
    // or better: give each PHOTOGRAPHERS entry its own `portfolio: [...]`.
    demoPortfolio: [
      // "https://images.unsplash.com/...","..."
    ],

    filters: {
      mediaLabel: 'Media type',
      mediaOptions: ['Photo', 'Video', 'Photo + Video'],
      typeLabel: 'Coverage type',
      typeOptions: ['Wedding', 'Pre-Wedding', 'Engagement', 'Corporate'],
    },

    // NEW — drives CreateEventPage's VendorBlock generically.
    pricingModel: 'perDay', // total = vendor.price_per_day * days
    extraFields: [
      { key: 'days', type: 'counter', label: 'Number of days', min: 1 },
      {
        key: 'coverage_types', type: 'multiselect', label: 'Coverage types',
        options: ['Candid', 'Traditional', 'Pre-Wedding', 'Drone Coverage', 'Cinematic Film', 'Reels / Shorts', 'Photo Booth', 'Live Screening'],
      },
    ],
  },

  {
    id: 'custom-invitations',
    serviceId: 5,
    includeUnassigned: false,
    path: '/services/custom-invitations',
    title: 'Custom Invitations',
    singular: 'Invitation Studio',
    plural: 'invitation studios',
    breadcrumb: 'Vendors / Invitations',
    cardIcon: '✉️',
    bookmarkType: 'Custom Invitations',
    defaultSpecialty: 'Wedding Stationery',
    searchPlaceholder: 'Search invitation studios…',
    emptyTitle: 'No invitation studios match your filters',
    priceUnit: '/ package',

    staticData: [],
    demoPortfolio: [],

    filters: {
      mediaLabel: 'Format',
      mediaOptions: ['Printed', 'Digital', 'Both'],
      typeLabel: 'Style',
      typeOptions: ['Traditional', 'Modern', 'Minimal', 'Luxury'],
    },

    // NEW
    pricingModel: 'flat', // total = vendor.price_per_day (flat package rate)
    extraFields: [
      {
        key: 'coverage_types', type: 'multiselect', label: 'Invitation types',
        options: ['Digital Invite', 'Printed Cards', 'Luxury Box', 'Save The Date', 'Wedding Website', 'Foil Print', 'Handmade'],
      },
      { key: 'quantity', type: 'number', label: 'Quantity', placeholder: 'e.g. 200' },
    ],
  },

  /* ── TEMPLATE for service #3+ ──────────────────────────────────────────
     Copy this block, fill in the real values, push it into the array
     above. Nothing in VendorListingPage.jsx, VendorProfilePage.jsx, or
     CreateEventPage.jsx needs to change for this to just work — that's
     the whole point of the refactor.

  {
    id: 'catering',
    serviceId: 7,
    includeUnassigned: false,
    path: '/services/catering',
    title: 'Catering',
    singular: 'Caterer',
    plural: 'caterers',
    breadcrumb: 'Vendors / Catering',
    cardIcon: '🍽️',
    bookmarkType: 'Catering',
    defaultSpecialty: 'Multi-cuisine Catering',
    searchPlaceholder: 'Search caterers…',
    emptyTitle: 'No caterers match your filters',
    priceUnit: '/ plate',
    staticData: [],
    demoPortfolio: [],
    filters: {
      mediaLabel: 'Cuisine',
      mediaOptions: ['North Indian', 'South Indian', 'Continental', 'Multi-cuisine'],
      typeLabel: 'Service style',
      typeOptions: ['Buffet', 'Live Counters', 'Plated', 'Cocktail'],
    },
    pricingModel: 'perGuest', // add this case to computeVendorTotal() in
                              // CreateEventPage.jsx if you introduce a new
                              // pricing shape (e.g. price_per_day * guests)
    extraFields: [
      { key: 'guest_count', type: 'number', label: 'Expected guests', placeholder: 'e.g. 200' },
      {
        key: 'coverage_types', type: 'multiselect', label: 'Meal types',
        options: ['Breakfast', 'Lunch', 'Hi-Tea', 'Dinner', 'Dessert Station'],
      },
    ],
  },
  ────────────────────────────────────────────────────────────────────── */
];

export const DEFAULT_VENDOR_SERVICE = VENDOR_SERVICE_CONFIGS[0];

export function getVendorServiceConfig(idOrServiceId) {
  return (
    VENDOR_SERVICE_CONFIGS.find(c => c.id === idOrServiceId) ||
    VENDOR_SERVICE_CONFIGS.find(c => String(c.serviceId) === String(idOrServiceId)) ||
    DEFAULT_VENDOR_SERVICE
  );
}