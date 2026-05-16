import type {
  GeneralSettingsFormValues,
  BookingSettingsFormValues,
  PricingSettingsFormValues,
  BlackoutDatesSettingsFormValues,
  ServicesSettingsFormValues,
  WebsiteSettingsFormValues,
  TestimonialsSettingsFormValues,
} from '@/lib/validations/admin-settings';

// ============================================================================
// SECTION DEFAULTS (organized by the 7 settings sections)
// ============================================================================

export const generalSettingsDefaults: GeneralSettingsFormValues = {
  businessHours: {
    monday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
    tuesday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
    wednesday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
    thursday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
    friday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
    saturday: { openTime: '08:00', closeTime: '18:00', isClosed: false },
    sunday: { openTime: '08:00', closeTime: '18:00', isClosed: false },
  },
  contactPhone: '(315) 657-1332',
  contactEmail: 'jgibbs@zainesstayandplay.com',
  address: '123 Pet Paradise Lane',
  city: 'Syracuse',
  state: 'NY',
  zip: '13202',
  businessProfileSettings: {
    businessName: "Zaine's Stay & Play",
    socialLinks: {
      facebook: 'https://www.facebook.com/people/Zaines-Stay-Play/61550036005682/',
      instagram: 'https://instagram.com/zainesstayandplay',
      twitter: 'https://twitter.com/zainesstayandplay',
    },
  },
};

export const bookingSettingsDefaults: BookingSettingsFormValues = {
  autoConfirmBookings: true,
  photoNotificationType: 'instant',
  photoNotificationTime: null,
  dashboardDateRange: 'today',
  stripeCapabilityFlags: {
    billingSubscriptionsEnabled: false,
    customerPortalEnabled: false,
    savedPaymentMethodsEnabled: false,
    oneClickRebookingEnabled: false,
    autopayEnabled: false,
    taxEnabled: false,
    disputesEnabled: false,
    radarReviewEnabled: false,
    connectEnabled: false,
    treasuryEnabled: false,
    issuingEnabled: false,
    financialConnectionsEnabled: false,
    identityEnabled: false,
    terminalEnabled: false,
    premiumCheckoutReassuranceEnabled: false,
    premiumCheckoutCopyEnabled: false,
    premiumCheckoutTrustIndicatorsEnabled: false,
    premiumCheckoutLoadingExperienceEnabled: false,
  },
  availabilityRules: {
    minNightsPerBooking: 1,
    maxNightsPerBooking: 365,
    advanceBookingWindowDays: 365,
    minimumLeadTimeDays: 0,
  },
};

export const pricingSettingsDefaults: PricingSettingsFormValues = {
  pricingSettings: {
    currency: 'USD',
    standardNightlyRate: 65,
    deluxeNightlyRate: 85,
    luxuryNightlyRate: 120,
    taxRatePercent: 10,
    twoPetDiscountPercent: 15,
    threePlusPetsDiscountPercent: 20,
  },
  seasonalPricingRules: [],
  cancellationPolicySettings: {
    fullRefundHours: 48,
    partialRefundHours: 24,
    partialRefundPercent: 50,
    noShowRefundPercent: 0,
  },
};

export const blackoutDatesSettingsDefaults: BlackoutDatesSettingsFormValues = {
  blackoutDates: [],
};

export const servicesSettingsDefaults: ServicesSettingsFormValues = {
  serviceSettings: {
    serviceTiers: [],
  },
  addOnsSettings: {
    addOns: [],
  },
};

export const websiteSettingsDefaults: WebsiteSettingsFormValues = {
  websiteProfileSettings: {
    siteUrl: 'https://zainesstayandplay.com',
    siteDescription:
      'Private, small-capacity dog boarding in Syracuse with owner-on-site care, three suites, and safety-first updates.',
    ogImageUrl: 'https://zainesstayandplay.com/og-default.svg',
    ownerImageUrl: 'https://zainesstayandplay.com/images/owner-placeholder.svg',
    logoImageUrl: 'https://zainesstayandplay.com/logo.svg',
    serviceArea: [
      'Syracuse',
      'Liverpool',
      'Cicero',
      'Baldwinsville',
      'Fayetteville',
      'Manlius',
      'Clay',
      'North Syracuse',
    ],
  },
  trustCopySettings: {
    pricingDisclosure:
      'Premium but fair pricing includes clear subtotal, applicable tax, selected care items, and total shown before confirmation. No hidden fees, no surprise add-ons, or other undisclosed charges are introduced at checkout.',
    cancellationProcessing:
      'Refunds are returned to the original payment method when payment processing is available.',
    privacySecurityDisclosure:
      "Payment details are processed by Stripe; Zaine's Stay & Play does not store card numbers on our servers. We use access controls and secure transmission for booking, account, pet health, and message data.",
    trustEvidenceClaim:
      'Only 3 private suites, owner onsite, camera-monitored safety, no harsh chemicals, and same-family dogs can stay together when approved.',
  },
};

export const testimonialsSettingsDefaults: TestimonialsSettingsFormValues = {
  testimonialsSettings: {
    testimonials: [],
  },
};

// ============================================================================
// COMBINED DEFAULTS (for full settings form)
// ============================================================================

export const fullSettingsDefaults = {
  ...generalSettingsDefaults,
  ...bookingSettingsDefaults,
  ...pricingSettingsDefaults,
  ...blackoutDatesSettingsDefaults,
  ...servicesSettingsDefaults,
  ...websiteSettingsDefaults,
  ...testimonialsSettingsDefaults,
};
