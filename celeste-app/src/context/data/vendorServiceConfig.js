export const VENDOR_SERVICE_CONFIGS = [
  {
    id: 'photography',
    serviceId: 1,
    path: '/services/photography',
    navName: 'Photography direction',
    title: 'Photography & Videography',
    singular: 'Photographer',
    plural: 'photographers',
    breadcrumb: 'Services -> Photography',
    bookmarkType: 'Photography',
    emptyTitle: 'No photographers match your filters',
    searchPlaceholder: 'Search photographers...',
    defaultSpecialty: 'Photography',
    cardIcon: 'Photo',
    priceUnit: '/ day',
    includeUnassigned: true,
    filters: {
      typeLabel: 'Event Type',
      typeOptions: ['Bridal', 'Mehndi', 'Sangeet', 'Reception', 'Pre-Wedding'],
      mediaLabel: 'Media Type',
      mediaOptions: ['Photo', 'Video'],
    },
    admin: {
      specialtyLabel: 'Specialty',
      specialtyPlaceholder: 'e.g. Wedding Photography',
      priceLabel: 'Price per Day (Rs)',
      pricePlaceholder: 'e.g. 25000',
      portfolioTitle: 'Upload Work Image',
      tagsPlaceholder: 'e.g. Award Winning, Featured, Premium',
    },
  },
  {
    id: 'custom-invitations',
    serviceId: 5,
    path: '/services/custom-invitations',
    navName: 'Custom invitations',
    title: 'Custom Invitations',
    singular: 'Invitation Vendor',
    plural: 'invitation vendors',
    breadcrumb: 'Services -> Custom Invitations',
    bookmarkType: 'Custom Invitations',
    emptyTitle: 'No invitation vendors match your filters',
    searchPlaceholder: 'Search invitation vendors...',
    defaultSpecialty: 'Custom Invitations',
    cardIcon: 'Design',
    priceUnit: '/ order',
    includeUnassigned: false,
    filters: {
      typeLabel: 'Invitation Type',
      typeOptions: ['Digital Invite', 'Printed Cards', 'Luxury Box', 'Save The Date', 'Wedding Website'],
      mediaLabel: 'Finish',
      mediaOptions: ['Digital', 'Print', 'Foil', 'Acrylic', 'Handmade'],
    },
    admin: {
      specialtyLabel: 'Invite Type / Style',
      specialtyPlaceholder: 'e.g. Digital Invite, Printed Cards, Foil',
      priceLabel: 'Starting Price (Rs)',
      pricePlaceholder: 'e.g. 15000',
      portfolioTitle: 'Upload Invitation Design',
      tagsPlaceholder: 'e.g. Foil, Floral, Minimal',
    },
  },
];

export const DEFAULT_VENDOR_SERVICE = VENDOR_SERVICE_CONFIGS[0];

export function getVendorServiceConfig(id) {
  const key = String(id || '');
  return VENDOR_SERVICE_CONFIGS.find(service => service.id === key || String(service.serviceId) === key) || DEFAULT_VENDOR_SERVICE;
}
