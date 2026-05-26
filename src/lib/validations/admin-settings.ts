import { z } from 'zod';

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

export const businessHoursSchema = z.object({
  openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  isClosed: z.boolean(),
});

// ============================================================================
// SECTION SCHEMAS (7 independent forms)
// ============================================================================

/**
 * General Settings - Business hours, contact info, business profile
 */
export const generalSettingsSchema = z.object({
  businessHours: z.object({
    monday: businessHoursSchema,
    tuesday: businessHoursSchema,
    wednesday: businessHoursSchema,
    thursday: businessHoursSchema,
    friday: businessHoursSchema,
    saturday: businessHoursSchema,
    sunday: businessHoursSchema,
  }),
  contactPhone: z.string().min(1, 'Phone is required'),
  contactEmail: z.string().email('Invalid email'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State must be 2 characters').max(2),
  zip: z.string().min(5, 'ZIP code must be at least 5 characters').max(10),
  businessProfileSettings: z.object({
    businessName: z.string().min(1, 'Business name is required'),
    socialLinks: z.object({
      facebook: z.string().url('Facebook URL must be valid'),
      instagram: z.string().url('Instagram URL must be valid'),
      twitter: z.string().url('X/Twitter URL must be valid'),
    }),
  }),
});

/**
 * Booking Settings - Availability rules, auto-confirm, dashboard preferences
 */
export const bookingSettingsSchema = z.object({
  autoConfirmBookings: z.boolean(),
  photoNotificationType: z.enum(['instant', 'daily_batch']),
  photoNotificationTime: z.string().nullable().optional(),
  dashboardDateRange: z.enum(['today', 'today_tomorrow', 'this_week']),
  stripeCapabilityFlags: z.object({
    billingSubscriptionsEnabled: z.boolean(),
    customerPortalEnabled: z.boolean(),
    savedPaymentMethodsEnabled: z.boolean(),
    oneClickRebookingEnabled: z.boolean(),
    autopayEnabled: z.boolean(),
    taxEnabled: z.boolean(),
    disputesEnabled: z.boolean(),
    radarReviewEnabled: z.boolean(),
    connectEnabled: z.boolean(),
    treasuryEnabled: z.boolean(),
    issuingEnabled: z.boolean(),
    financialConnectionsEnabled: z.boolean(),
    identityEnabled: z.boolean(),
    terminalEnabled: z.boolean(),
    premiumCheckoutReassuranceEnabled: z.boolean(),
    premiumCheckoutCopyEnabled: z.boolean(),
    premiumCheckoutTrustIndicatorsEnabled: z.boolean(),
    premiumCheckoutLoadingExperienceEnabled: z.boolean(),
  }),
  availabilityRules: z.object({
    minNightsPerBooking: z.number().min(1, 'Minimum 1 night'),
    maxNightsPerBooking: z.number().min(1, 'Maximum must be at least 1'),
    advanceBookingWindowDays: z.number().min(1, 'Minimum 1 day'),
    minimumLeadTimeDays: z.number().min(0, 'Minimum 0 days'),
  }),
  smsSettings: z
    .object({
      enabled: z.boolean(),
      fromNumber: z.string().min(3, 'From number is required'),
    })
    .optional(),
  smsBudgetSettings: z
    .object({
      monthlyBudgetLimit: z.number().min(0, 'Budget cannot be negative'),
      currentMonthSpend: z.number().min(0, 'Spend cannot be negative'),
      budgetAlertThreshold: z.number().min(1).max(100),
      pauseWhenExceeded: z.boolean(),
    })
    .optional(),
  packageExpirationSettings: z
    .object({
      autoForfeitUnusedSessions: z.boolean(),
      allowAdminManualExtension: z.boolean(),
      defaultExtensionDays: z.number().int().min(1).max(365),
    })
    .optional(),
  reminderSettings: z
    .object({
      bookingReminder24hEnabled: z.boolean(),
      pickupReminderEnabled: z.boolean(),
      rebookNudgeEnabled: z.boolean(),
      rebookNudgeDaysAfterCheckout: z.number().int().min(1).max(90),
      vaccineReminderEnabled: z.boolean(),
      vaccineReminderDaysBeforeExpiry: z.array(z.number().int().min(1).max(365)),
      assessmentReminderEnabled: z.boolean(),
      assessmentReminderDaysBeforeExpiry: z.array(z.number().int().min(1).max(365)),
    })
    .optional(),
  requiredVaccineSettings: z
    .object({
      requiredVaccines: z.array(z.string().min(1)).min(1),
      blockBookingsOnExpiredVaccines: z.boolean(),
    })
    .optional(),
  holidaySurcharges: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        surchargeType: z.enum(['flat', 'percentage']),
        surchargeAmount: z.number().min(0),
        appliesTo: z.enum(['boarding', 'daycare', 'all']),
        isActive: z.boolean(),
      }),
    )
    .optional(),
});

/**
 * Pricing Settings - Pricing tiers, seasonal pricing, cancellation policy
 */
export const pricingSettingsSchema = z.object({
  pricingSettings: z.object({
    currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
    standardNightlyRate: z.number().min(0, 'Rate cannot be negative'),
    deluxeNightlyRate: z.number().min(0, 'Rate cannot be negative'),
    luxuryNightlyRate: z.number().min(0, 'Rate cannot be negative'),
    taxRatePercent: z.number().min(0, 'Tax cannot be negative').max(100, 'Tax cannot exceed 100%'),
    multiPetDiscountType: z.enum(['percent', 'flat']).default('percent'),
    twoPetDiscountPercent: z.number().min(0, 'Discount cannot be negative'),
    threePlusPetsDiscountPercent: z.number().min(0, 'Discount cannot be negative'),
  }),
  seasonalPricingRules: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'Name is required'),
      startDate: z.string().min(1, 'Start date is required'),
      endDate: z.string().min(1, 'End date is required'),
      priceMultiplier: z.number().min(0.1, 'Multiplier must be at least 0.1'),
      isActive: z.boolean(),
    }),
  ),
  cancellationPolicySettings: z.object({
    fullRefundHours: z.number().int().min(1, 'Must be at least 1 hour'),
    partialRefundHours: z.number().int().min(0, 'Cannot be negative'),
    partialRefundPercent: z.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100%'),
    noShowRefundPercent: z.number().min(0, 'Cannot be negative').max(100, 'Cannot exceed 100%'),
  }),
}).refine(
  (data) => data.cancellationPolicySettings.fullRefundHours > data.cancellationPolicySettings.partialRefundHours,
  {
    path: ['cancellationPolicySettings', 'fullRefundHours'],
    message: 'Full refund window must be greater than partial refund window',
  },
);

/**
 * Blackout Dates Settings - Blocked dates management
 */
export const blackoutDatesSettingsSchema = z.object({
  blackoutDates: z.array(
    z.object({
      id: z.string(),
      date: z.string().min(1, 'Date is required'),
      reason: z.string(),
      blockType: z.enum(['full_day', 'check_in_only', 'check_out_only']),
    }),
  ),
});

/**
 * Services Settings - Service tiers and add-ons
 * Absorbed from ServiceTiersAndAddOnsCard
 */
const serviceTierSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  baseNightlyRate: z.number().min(0, 'Price must be positive'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100),
  imageUrl: z.string().min(1, 'Image URL is required'),
  isActive: z.boolean(),
  displayOrder: z.number().min(0, 'Order must be non-negative'),
});

const addOnSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  price: z.number().min(0, 'Price must be positive'),
  isIncluded: z.boolean().optional().default(false),
  applicableTiers: z.array(z.string()).min(1, 'Select at least one service tier'),
  isActive: z.boolean(),
});

export const servicesSettingsSchema = z.object({
  serviceSettings: z.object({
    serviceTiers: z.array(serviceTierSchema).min(1, 'At least one service tier is required'),
  }),
  addOnsSettings: z.object({
    addOns: z.array(addOnSchema),
  }),
});

/**
 * Website Settings - Website profile, trust copy, SEO
 */
export const websiteSettingsSchema = z.object({
  websiteProfileSettings: z.object({
    siteUrl: z.string().url('Website URL must be valid'),
    siteDescription: z.string().min(1, 'Site description is required'),
    ogImageUrl: z.string().url('OG image URL must be valid'),
    ownerImageUrl: z.string().url('Owner image URL must be valid'),
    logoImageUrl: z.string().url('Logo image URL must be valid'),
    serviceArea: z.array(z.string().min(1)).min(1, 'At least one service area is required'),
  }),
  trustCopySettings: z
    .object({
      pricingDisclosure: z.string().min(1, 'Pricing disclosure is required'),
      cancellationProcessing: z
        .string()
        .min(1, 'Cancellation processing note is required'),
      privacySecurityDisclosure: z
        .string()
        .min(1, 'Privacy and security disclosure is required'),
      trustEvidenceClaim: z.string().min(1, 'Trust evidence claim is required'),
    })
    .refine(
      (val) =>
        val.pricingDisclosure.toLowerCase().includes('before confirmation') &&
        val.pricingDisclosure.toLowerCase().includes('no hidden fees'),
      {
        path: ['pricingDisclosure'],
        message:
          'Pricing disclosure must include "before confirmation" and "No hidden fees" language',
      },
    )
    .refine(
      (val) =>
        val.privacySecurityDisclosure.includes('Stripe') &&
        val.privacySecurityDisclosure.toLowerCase().includes('does not store card numbers'),
      {
        path: ['privacySecurityDisclosure'],
        message:
          'Privacy disclosure must mention Stripe and that card numbers are not stored',
      },
    )
    .refine(
      (val) =>
        val.trustEvidenceClaim.toLowerCase().includes('private suites') &&
        val.trustEvidenceClaim.toLowerCase().includes('owner onsite'),
      {
        path: ['trustEvidenceClaim'],
        message:
          'Trust evidence claim must include "private suites" and "owner onsite"',
      },
    ),
});

/**
 * Testimonials Settings - Customer testimonials management
 * Absorbed from TestimonialsSettingsCard
 */
const testimonialSchema = z.object({
  id: z.string().min(1),
  author: z.string().min(1, 'Author is required'),
  petName: z.string().min(1, 'Pet name is required'),
  rating: z.number().min(1).max(5),
  date: z.string().min(1, 'Date label is required'),
  text: z.string().min(10, 'Testimonial text must be at least 10 characters'),
  serviceLabel: z.string().min(1, 'Service label is required'),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const testimonialsSettingsSchema = z.object({
  testimonialsSettings: z.object({
    testimonials: z.array(testimonialSchema).min(1, 'At least one testimonial is required'),
  }),
});

// ============================================================================
// FULL SETTINGS SCHEMA (for API-side validation)
// ============================================================================

export const fullSettingsBaseSchema = z.object({
  // General
  businessHours: generalSettingsSchema.shape.businessHours,
  contactPhone: generalSettingsSchema.shape.contactPhone,
  contactEmail: generalSettingsSchema.shape.contactEmail,
  address: generalSettingsSchema.shape.address,
  city: generalSettingsSchema.shape.city,
  state: generalSettingsSchema.shape.state,
  zip: generalSettingsSchema.shape.zip,
  businessProfileSettings: generalSettingsSchema.shape.businessProfileSettings,
  
  // Booking
  autoConfirmBookings: bookingSettingsSchema.shape.autoConfirmBookings,
  photoNotificationType: bookingSettingsSchema.shape.photoNotificationType,
  photoNotificationTime: bookingSettingsSchema.shape.photoNotificationTime,
  dashboardDateRange: bookingSettingsSchema.shape.dashboardDateRange,
  stripeCapabilityFlags: bookingSettingsSchema.shape.stripeCapabilityFlags,
  availabilityRules: bookingSettingsSchema.shape.availabilityRules,
  smsSettings: bookingSettingsSchema.shape.smsSettings,
  smsBudgetSettings: bookingSettingsSchema.shape.smsBudgetSettings,
  packageExpirationSettings: bookingSettingsSchema.shape.packageExpirationSettings,
  reminderSettings: bookingSettingsSchema.shape.reminderSettings,
  requiredVaccineSettings: bookingSettingsSchema.shape.requiredVaccineSettings,
  holidaySurcharges: bookingSettingsSchema.shape.holidaySurcharges,
  
  // Pricing
  pricingSettings: pricingSettingsSchema.shape.pricingSettings,
  seasonalPricingRules: pricingSettingsSchema.shape.seasonalPricingRules,
  cancellationPolicySettings: pricingSettingsSchema.shape.cancellationPolicySettings,
  
  // Blackout Dates
  blackoutDates: blackoutDatesSettingsSchema.shape.blackoutDates,

  // Services
  serviceSettings: servicesSettingsSchema.shape.serviceSettings,
  addOnsSettings: servicesSettingsSchema.shape.addOnsSettings,
  
  // Website
  websiteProfileSettings: websiteSettingsSchema.shape.websiteProfileSettings,
  trustCopySettings: websiteSettingsSchema.shape.trustCopySettings,

  // Testimonials
  testimonialsSettings: testimonialsSettingsSchema.shape.testimonialsSettings,
});

export const fullSettingsSchema = fullSettingsBaseSchema.refine(
  (data) => data.cancellationPolicySettings.fullRefundHours > data.cancellationPolicySettings.partialRefundHours,
  {
    path: ['cancellationPolicySettings', 'fullRefundHours'],
    message: 'Full refund window must be greater than partial refund window',
  },
);

export const fullSettingsPartialSchema = fullSettingsBaseSchema.partial();

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;
export type BookingSettingsFormValues = z.infer<typeof bookingSettingsSchema>;
export type PricingSettingsFormValues = z.infer<typeof pricingSettingsSchema>;
export type BlackoutDatesSettingsFormValues = z.infer<typeof blackoutDatesSettingsSchema>;
export type ServicesSettingsFormValues = z.infer<typeof servicesSettingsSchema>;
export type WebsiteSettingsFormValues = z.infer<typeof websiteSettingsSchema>;
export type TestimonialsSettingsFormValues = z.infer<typeof testimonialsSettingsSchema>;
export type FullSettingsFormValues = z.infer<typeof fullSettingsSchema>;
