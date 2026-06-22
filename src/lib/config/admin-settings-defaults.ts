import type {
  GeneralSettingsFormValues,
  BookingSettingsFormValues,
  PricingSettingsFormValues,
  BlackoutDatesSettingsFormValues,
  ServicesSettingsFormValues,
  PricingAndServicesFormValues,
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
  contactPhone: '(315) 765-7297',
  contactEmail: 'info@zainesstayandplay.com',
  address: '6353 Court Street Road',
  city: 'East Syracuse',
  state: 'NY',
  zip: '13057',
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
  smsSettings: {
    enabled: false,
    fromNumber: '',
  },
  smsBudgetSettings: {
    monthlyBudgetLimit: 50,
    currentMonthSpend: 0,
    budgetAlertThreshold: 80,
    pauseWhenExceeded: true,
  },
  packageExpirationSettings: {
    autoForfeitUnusedSessions: true,
    allowAdminManualExtension: true,
    defaultExtensionDays: 14,
  },
  reminderSettings: {
    bookingReminder24hEnabled: true,
    pickupReminderEnabled: true,
    rebookNudgeEnabled: true,
    rebookNudgeDaysAfterCheckout: 7,
    vaccineReminderEnabled: true,
    vaccineReminderDaysBeforeExpiry: [30, 7, 1],
    assessmentReminderEnabled: true,
    assessmentReminderDaysBeforeExpiry: [30, 7],
  },
  requiredVaccineSettings: {
    requiredVaccines: ['Rabies', 'DHPP', 'Bordetella'],
    blockBookingsOnExpiredVaccines: true,
  },
  holidaySurcharges: [],
};

export const pricingSettingsDefaults: PricingSettingsFormValues = {
  pricingSettings: {
    currency: 'USD',
    standardNightlyRate: 65,
    deluxeNightlyRate: 85,
    luxuryNightlyRate: 120,
    taxRatePercent: 10,
    multiPetDiscountType: 'percent' as const,
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
    serviceTiers: [
      {
        id: 'standard-suite',
        name: 'Standard Suite',
        description: 'Comfortable and cozy suite with basic amenities',
        baseNightlyRate: 65,
        capacity: 3,
        imageUrl: '/images/suites/standard-suite-default.webp',
        isActive: true,
        displayOrder: 1,
      },
      {
        id: 'deluxe-suite',
        name: 'Deluxe Suite',
        description: 'Premium suite with enhanced comfort and features',
        baseNightlyRate: 85,
        capacity: 2,
        imageUrl: '/images/suites/deluxe-suite-default.webp',
        isActive: true,
        displayOrder: 2,
      },
      {
        id: 'luxury-suite',
        name: 'Luxury Suite',
        description: 'Exclusive luxury experience with top-tier amenities',
        baseNightlyRate: 120,
        capacity: 1,
        imageUrl: '/images/suites/luxury-suite-default.webp',
        isActive: true,
        displayOrder: 3,
      },
    ],
  },
  addOnsSettings: {
    addOns: [
      {
        id: 'premium-treats',
        name: 'Premium Treats Package',
        description: 'Special premium treats and snacks throughout stay',
        price: 0,
        isIncluded: true,
        applicableTiers: ['standard-suite', 'deluxe-suite', 'luxury-suite'],
        isActive: true,
      },
      {
        id: 'extra-playtime',
        name: 'Extra Playtime Session',
        description: 'Additional supervised playtime session',
        price: 0,
        isIncluded: true,
        applicableTiers: ['standard-suite', 'deluxe-suite', 'luxury-suite'],
        isActive: true,
      },
      {
        id: 'training-session',
        name: 'Basic Obedience Training (By Request)',
        description: 'Available by request; pricing depends on length of stay',
        price: 0,
        isIncluded: true,
        applicableTiers: ['deluxe-suite', 'luxury-suite'],
        isActive: true,
      },
    ],
  },
};

export const pricingAndServicesSettingsDefaults: PricingAndServicesFormValues = {
  ...pricingSettingsDefaults,
  ...servicesSettingsDefaults,
};

export const websiteSettingsDefaults: WebsiteSettingsFormValues = {
  websiteProfileSettings: {
    siteUrl: 'https://zainesstayandplay.com',
    siteDescription:
      'Private, small-capacity dog boarding in Syracuse with owner-on-site care, limited suite availability, and safety-first updates.',
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
      'Limited private suites, owner onsite, camera-monitored safety, no harsh chemicals, and same-family dogs can stay together when approved.',
  },
};

export const testimonialsSettingsDefaults: TestimonialsSettingsFormValues = {
  testimonialsSettings: {
    testimonials: [
      {
        id: 'testimonial-1',
        author: 'Sarah M.',
        petName: 'Max',
        rating: 5,
        date: '2 weeks ago',
        text: 'Max had an amazing stay. The owner sent us photos every day and he looked genuinely happy and relaxed.',
        serviceLabel: 'Deluxe Suite',
        isActive: true,
        displayOrder: 0,
      },
      {
        id: 'testimonial-2',
        author: 'James T.',
        petName: 'Luna',
        rating: 5,
        date: '1 month ago',
        text: 'Luna settled in quickly and came home calm and happy. We will absolutely be back.',
        serviceLabel: 'Standard Suite',
        isActive: true,
        displayOrder: 1,
      },
      {
        id: 'testimonial-3',
        author: 'Emily R.',
        petName: 'Charlie',
        rating: 5,
        date: '1 month ago',
        text: 'The quiet environment and clear communication made all the difference for Charlie.',
        serviceLabel: 'Deluxe Suite',
        isActive: true,
        displayOrder: 2,
      },
    ],
  },
};

// ============================================================================
// COMBINED DEFAULTS (for full settings form)
// ============================================================================

export const loyaltyProgramSettingsDefaults = {
  loyaltyProgramSettings: {
    enabled: false,
    pointsPerNight: 10,
    pointsPerAddon: 5,
    pointsPerReferral: 50,
    pointsPerReview: 25,
    tierThresholds: {
      goodDog: 500,
      topDog: 1500,
      vip: 3000,
    },
    redemptionRate: 100,
    minRedemptionPoints: 100,
    maxRedemptionPercent: 50,
    pointExpiryDays: 365,
  },
};

export const googleReviewsSettingsDefaults = {
  googleReviewsSettings: {
    enabled: false,
    placeId: '',
    apiKey: '',
    maxReviewsToShow: 6,
    minRatingToShow: 4,
    fallbackRating: 5.0,
    fallbackReviewCount: 47,
  },
};

export const fullSettingsDefaults = {
  ...generalSettingsDefaults,
  ...bookingSettingsDefaults,
  ...pricingSettingsDefaults,
  ...blackoutDatesSettingsDefaults,
  ...servicesSettingsDefaults,
  ...websiteSettingsDefaults,
  ...testimonialsSettingsDefaults,
  ...loyaltyProgramSettingsDefaults,
  ...googleReviewsSettingsDefaults,
};
