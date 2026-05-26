/**
 * Admin Settings API - Server-side helpers for admin settings management
 * Handles reading/writing settings stored in the Settings table
 */

import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import type {
  AdminSettings,
  BusinessHours,
  AvailabilityRules,
  PricingSettings,
  CancellationPolicySettings,
  BusinessProfileSettings,
  WebsiteProfileSettings,
  TrustCopySettings,
  ServiceTiersSettings,
  AddOnsSettings,
  TestimonialsSettings,
  StripeCapabilityFlags,
  LoyaltyProgramSettings,
  GoogleReviewsSettings,
} from '@/types/admin';
import { fullSettingsDefaults } from '@/lib/config/admin-settings-defaults';

type SettingsModel = {
  findMany: (args: {
    where: { key: { in: string[] } };
  }) => Promise<Array<{ key: string; value: string }>>;
  findUnique: (args: { where: { key: string } }) => Promise<{ value: string } | null>;
  upsert: (args: {
    where: { key: string };
    update: { value: string };
    create: { key: string; value: string };
  }) => Promise<unknown>;
};

function getSettingsModel(): SettingsModel | null {
  const settingsModel = (prisma as unknown as { settings?: SettingsModel }).settings;
  if (!settingsModel) return null;
  if (typeof settingsModel.findMany !== 'function') return null;
  if (typeof settingsModel.findUnique !== 'function') return null;
  if (typeof settingsModel.upsert !== 'function') return null;
  return settingsModel;
}

const SETTINGS_KEYS: Record<string, string> = {
  AUTO_CONFIRM_BOOKINGS: 'admin.auto_confirm_bookings',
  PHOTO_NOTIFICATION_TYPE: 'admin.photo_notification_type',
  PHOTO_NOTIFICATION_TIME: 'admin.photo_notification_time',
  DASHBOARD_DATE_RANGE: 'admin.dashboard_date_range',
  STRIPE_CAPABILITY_FLAGS: 'admin.stripe_capability_flags', // JSON object
  // Phase 1: Business Hours & Contact Info
  BUSINESS_HOURS: 'admin.business_hours', // JSON string
  CONTACT_PHONE: 'admin.contact_phone',
  CONTACT_EMAIL: 'admin.contact_email',
  ADDRESS: 'admin.address',
  CITY: 'admin.city',
  STATE: 'admin.state',
  ZIP: 'admin.zip',
  // Phase 3: Availability & Scheduling Rules
  AVAILABILITY_RULES: 'admin.availability_rules', // JSON string
  // Phase 4: Blackout Dates & Seasonal Pricing
  BLACKOUT_DATES: 'admin.blackout_dates', // JSON array
  SEASONAL_PRICING_RULES: 'admin.seasonal_pricing_rules', // JSON array
  // Phase 5: Pricing & Fees Configuration
  PRICING_SETTINGS: 'admin.pricing_settings', // JSON object
  // Phase 6: Cancellation Policy Configuration
  CANCELLATION_POLICY_SETTINGS: 'admin.cancellation_policy_settings', // JSON object
  // Phase 7: Business Profile & Social Links
  BUSINESS_PROFILE_SETTINGS: 'admin.business_profile_settings', // JSON object
  // Phase 8: Website Profile & Service Area
  WEBSITE_PROFILE_SETTINGS: 'admin.website_profile_settings', // JSON object
  // Phase 9: Trust Copy Settings
  TRUST_COPY_SETTINGS: 'admin.trust_copy_settings', // JSON object
  // Phase 10: Service Tiers & Add-Ons Configuration
  SERVICE_TIERS_SETTINGS: 'admin.service_tiers_settings', // JSON object
  ADD_ONS_SETTINGS: 'admin.add_ons_settings', // JSON object
  // Phase 11: Testimonials Configuration
  TESTIMONIALS_SETTINGS: 'admin.testimonials_settings', // JSON object
  SMS_SETTINGS: 'admin.sms_settings', // JSON object
  SMS_BUDGET_SETTINGS: 'admin.sms_budget_settings', // JSON object
  PACKAGE_EXPIRATION_SETTINGS: 'admin.package_expiration_settings', // JSON object
  REMINDER_SETTINGS: 'admin.reminder_settings', // JSON object
  REQUIRED_VACCINE_SETTINGS: 'admin.required_vaccine_settings', // JSON object
  HOLIDAY_SURCHARGES: 'admin.holiday_surcharges', // JSON array
  LOYALTY_PROGRAM_SETTINGS: 'admin.loyalty_program_settings', // JSON object
  GOOGLE_REVIEWS_SETTINGS: 'admin.google_reviews_settings', // JSON object
};

const LEGACY_COPY_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /doggy daycare/gi, replacement: 'private dog boarding' },
  { pattern: /book a playday/gi, replacement: 'check availability' },
  { pattern: /only\s+3\s+private\s+suites/gi, replacement: 'limited private suites' },
  { pattern: /only\s+3\s+suites/gi, replacement: 'limited suites' },
  { pattern: /three-suite/gi, replacement: 'limited-suite' },
  { pattern: /three\s+suites/gi, replacement: 'limited suite availability' },
];

function normalizeLegacyCopyString(value: string): string {
  return LEGACY_COPY_REPLACEMENTS.reduce(
    (acc, { pattern, replacement }) => acc.replace(pattern, replacement),
    value,
  );
}

function normalizeLegacyCopy<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeLegacyCopyString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeLegacyCopy(item)) as T;
  }

  if (value && typeof value === 'object') {
    const normalizedEntries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      normalizeLegacyCopy(item),
    ]);
    return Object.fromEntries(normalizedEntries) as T;
  }

  return value;
}

/**
 * Get all admin settings with defaults
 */
export async function getAdminSettings(): Promise<AdminSettings> {
  if (!isDatabaseConfigured()) {
    return getDefaultSettings();
  }

  const settingsModel = getSettingsModel();
  if (!settingsModel) {
    return getDefaultSettings();
  }

  try {
    const settings = await settingsModel.findMany({
      where: {
        key: {
          in: Object.values(SETTINGS_KEYS),
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    // Parse business hours from JSON
    let businessHours: BusinessHours;
    try {
      const hoursJson = settingsMap.get(SETTINGS_KEYS.BUSINESS_HOURS);
      businessHours = hoursJson ? JSON.parse(hoursJson) : getDefaultBusinessHours();
    } catch {
      businessHours = getDefaultBusinessHours();
    }

    const settingsPayload: AdminSettings = {
      autoConfirmBookings:
        settingsMap.get(SETTINGS_KEYS.AUTO_CONFIRM_BOOKINGS) === 'true',
      photoNotificationType: (settingsMap.get(SETTINGS_KEYS.PHOTO_NOTIFICATION_TYPE) ||
        'instant') as 'instant' | 'daily_batch',
      photoNotificationTime: settingsMap.get(SETTINGS_KEYS.PHOTO_NOTIFICATION_TIME),
      dashboardDateRange: (settingsMap.get(SETTINGS_KEYS.DASHBOARD_DATE_RANGE) ||
        'today') as 'today' | 'today_tomorrow' | 'this_week',
      stripeCapabilityFlags: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.STRIPE_CAPABILITY_FLAGS);
          return json
            ? {
                ...getDefaultStripeCapabilityFlags(),
                ...(JSON.parse(json) as Partial<StripeCapabilityFlags>),
              }
            : getDefaultStripeCapabilityFlags();
        } catch {
          return getDefaultStripeCapabilityFlags();
        }
      })(),
      // Phase 1: Business Hours & Contact Info
      businessHours,
      contactPhone: settingsMap.get(SETTINGS_KEYS.CONTACT_PHONE) || '(315) 765-7297',
      contactEmail: settingsMap.get(SETTINGS_KEYS.CONTACT_EMAIL) || 'jgibbs@zainesstayandplay.com',
      address: settingsMap.get(SETTINGS_KEYS.ADDRESS) || '6353 Court Street Road',
      city: settingsMap.get(SETTINGS_KEYS.CITY) || 'East Syracuse',
      state: settingsMap.get(SETTINGS_KEYS.STATE) || 'NY',
      zip: settingsMap.get(SETTINGS_KEYS.ZIP) || '13057',
      // Phase 3: Availability & Scheduling Rules
      availabilityRules: (() => {
        try {
          const rulesJson = settingsMap.get(SETTINGS_KEYS.AVAILABILITY_RULES);
          return rulesJson ? JSON.parse(rulesJson) : getDefaultAvailabilityRules();
        } catch {
          return getDefaultAvailabilityRules();
        }
      })(),
      smsSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.SMS_SETTINGS);
          return json
            ? {
                ...getDefaultSettings().smsSettings,
                ...(JSON.parse(json) as Partial<AdminSettings['smsSettings']>),
              }
            : getDefaultSettings().smsSettings;
        } catch {
          return getDefaultSettings().smsSettings;
        }
      })(),
      smsBudgetSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.SMS_BUDGET_SETTINGS);
          return json
            ? {
                ...getDefaultSettings().smsBudgetSettings,
                ...(JSON.parse(json) as Partial<AdminSettings['smsBudgetSettings']>),
              }
            : getDefaultSettings().smsBudgetSettings;
        } catch {
          return getDefaultSettings().smsBudgetSettings;
        }
      })(),
      packageExpirationSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.PACKAGE_EXPIRATION_SETTINGS);
          return json
            ? {
                ...getDefaultSettings().packageExpirationSettings,
                ...(JSON.parse(json) as Partial<AdminSettings['packageExpirationSettings']>),
              }
            : getDefaultSettings().packageExpirationSettings;
        } catch {
          return getDefaultSettings().packageExpirationSettings;
        }
      })(),
      reminderSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.REMINDER_SETTINGS);
          return json
            ? {
                ...getDefaultSettings().reminderSettings,
                ...(JSON.parse(json) as Partial<AdminSettings['reminderSettings']>),
              }
            : getDefaultSettings().reminderSettings;
        } catch {
          return getDefaultSettings().reminderSettings;
        }
      })(),
      requiredVaccineSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.REQUIRED_VACCINE_SETTINGS);
          return json
            ? {
                ...getDefaultSettings().requiredVaccineSettings,
                ...(JSON.parse(json) as Partial<AdminSettings['requiredVaccineSettings']>),
              }
            : getDefaultSettings().requiredVaccineSettings;
        } catch {
          return getDefaultSettings().requiredVaccineSettings;
        }
      })(),
      holidaySurcharges: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.HOLIDAY_SURCHARGES);
          return json ? JSON.parse(json) : getDefaultSettings().holidaySurcharges;
        } catch {
          return getDefaultSettings().holidaySurcharges;
        }
      })(),
      // Phase 4: Blackout Dates & Seasonal Pricing
      blackoutDates: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.BLACKOUT_DATES);
          return json ? JSON.parse(json) : [];
        } catch {
          return [];
        }
      })(),
      seasonalPricingRules: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.SEASONAL_PRICING_RULES);
          return json ? JSON.parse(json) : [];
        } catch {
          return [];
        }
      })(),
      // Phase 5: Pricing & Fees Configuration
      pricingSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.PRICING_SETTINGS);
          return json ? JSON.parse(json) : getDefaultPricingSettings();
        } catch {
          return getDefaultPricingSettings();
        }
      })(),
      // Phase 6: Cancellation Policy Configuration
      cancellationPolicySettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.CANCELLATION_POLICY_SETTINGS);
          return json ? JSON.parse(json) : getDefaultCancellationPolicySettings();
        } catch {
          return getDefaultCancellationPolicySettings();
        }
      })(),
      // Phase 7: Business Profile & Social Links
      businessProfileSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.BUSINESS_PROFILE_SETTINGS);
          return json ? JSON.parse(json) : getDefaultBusinessProfileSettings();
        } catch {
          return getDefaultBusinessProfileSettings();
        }
      })(),
      // Phase 8: Website Profile & Service Area
      websiteProfileSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.WEBSITE_PROFILE_SETTINGS);
          return json ? JSON.parse(json) : getDefaultWebsiteProfileSettings();
        } catch {
          return getDefaultWebsiteProfileSettings();
        }
      })(),
      // Phase 9: Trust Copy Settings
      trustCopySettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.TRUST_COPY_SETTINGS);
          return json ? JSON.parse(json) : getDefaultTrustCopySettings();
        } catch {
          return getDefaultTrustCopySettings();
        }
      })(),
      // Phase 10: Service Tiers & Add-Ons Configuration
      serviceSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.SERVICE_TIERS_SETTINGS);
          if (!json) return getDefaultServiceTiersSettings();
          const parsed = JSON.parse(json) as ServiceTiersSettings;
          return {
            serviceTiers: (parsed.serviceTiers || []).map((tier) => ({
              ...tier,
              capacity:
                typeof tier.capacity === 'number' && Number.isFinite(tier.capacity)
                  ? Math.max(1, Math.floor(tier.capacity))
                  : tier.id.includes('standard')
                    ? 3
                    : tier.id.includes('deluxe')
                      ? 2
                      : 1,
              imageUrl: tier.imageUrl || '/images/suites/standard-suite-default.webp',
            })),
          };
        } catch {
          return getDefaultServiceTiersSettings();
        }
      })(),
      addOnsSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.ADD_ONS_SETTINGS);
          return json ? JSON.parse(json) : getDefaultAddOnsSettings();
        } catch {
          return getDefaultAddOnsSettings();
        }
      })(),
      // Phase 11: Testimonials Configuration
      testimonialsSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.TESTIMONIALS_SETTINGS);
          return json ? JSON.parse(json) : getDefaultTestimonialsSettings();
        } catch {
          return getDefaultTestimonialsSettings();
        }
      })(),
      // Loyalty Program
      loyaltyProgramSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.LOYALTY_PROGRAM_SETTINGS);
          return json
            ? { ...getDefaultLoyaltyProgramSettings(), ...(JSON.parse(json) as Partial<LoyaltyProgramSettings>) }
            : getDefaultLoyaltyProgramSettings();
        } catch {
          return getDefaultLoyaltyProgramSettings();
        }
      })(),
      // Phase 12: Google Reviews Integration
      googleReviewsSettings: (() => {
        try {
          const json = settingsMap.get(SETTINGS_KEYS.GOOGLE_REVIEWS_SETTINGS);
          return json
            ? { ...getDefaultGoogleReviewsSettings(), ...(JSON.parse(json) as Partial<GoogleReviewsSettings>) }
            : getDefaultGoogleReviewsSettings();
        } catch {
          return getDefaultGoogleReviewsSettings();
        }
      })(),
    };

    return normalizeLegacyCopy(settingsPayload);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return getDefaultSettings();
  }
}

/**
 * Get a single setting value
 */
export async function getAdminSetting(key: keyof typeof SETTINGS_KEYS): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  const settingsModel = getSettingsModel();
  if (!settingsModel) return null;

  try {
    const setting = await settingsModel.findUnique({
      where: { key: SETTINGS_KEYS[key] },
    });

    return setting?.value ?? null;
  } catch (error) {
    console.error('Error fetching setting:', error);
    return null;
  }
}

/**
 * Update admin settings
 */
export async function updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
  if (!isDatabaseConfigured()) {
    return getDefaultSettings();
  }

  const settingsModel = getSettingsModel();
  if (!settingsModel) {
    return getDefaultSettings();
  }

  try {
    const updatePromises: Promise<unknown>[] = [];

    if (updates.autoConfirmBookings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.AUTO_CONFIRM_BOOKINGS },
          update: { value: String(updates.autoConfirmBookings) },
          create: {
            key: SETTINGS_KEYS.AUTO_CONFIRM_BOOKINGS,
            value: String(updates.autoConfirmBookings),
          },
        }),
      );
    }

    if (updates.photoNotificationType !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.PHOTO_NOTIFICATION_TYPE },
          update: { value: updates.photoNotificationType },
          create: {
            key: SETTINGS_KEYS.PHOTO_NOTIFICATION_TYPE,
            value: updates.photoNotificationType,
          },
        }),
      );
    }

    if (updates.photoNotificationTime !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.PHOTO_NOTIFICATION_TIME },
          update: { value: updates.photoNotificationTime },
          create: {
            key: SETTINGS_KEYS.PHOTO_NOTIFICATION_TIME,
            value: updates.photoNotificationTime,
          },
        }),
      );
    }

    if (updates.dashboardDateRange !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.DASHBOARD_DATE_RANGE },
          update: { value: updates.dashboardDateRange },
          create: {
            key: SETTINGS_KEYS.DASHBOARD_DATE_RANGE,
            value: updates.dashboardDateRange,
          },
        }),
      );
    }

    if (updates.stripeCapabilityFlags !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.STRIPE_CAPABILITY_FLAGS },
          update: { value: JSON.stringify(updates.stripeCapabilityFlags) },
          create: {
            key: SETTINGS_KEYS.STRIPE_CAPABILITY_FLAGS,
            value: JSON.stringify(updates.stripeCapabilityFlags),
          },
        }),
      );
    }

    // Phase 1: Business Hours & Contact Info
    if (updates.businessHours !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.BUSINESS_HOURS },
          update: { value: JSON.stringify(updates.businessHours) },
          create: {
            key: SETTINGS_KEYS.BUSINESS_HOURS,
            value: JSON.stringify(updates.businessHours),
          },
        }),
      );
    }

    if (updates.contactPhone !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.CONTACT_PHONE },
          update: { value: updates.contactPhone },
          create: {
            key: SETTINGS_KEYS.CONTACT_PHONE,
            value: updates.contactPhone,
          },
        }),
      );
    }

    if (updates.contactEmail !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.CONTACT_EMAIL },
          update: { value: updates.contactEmail },
          create: {
            key: SETTINGS_KEYS.CONTACT_EMAIL,
            value: updates.contactEmail,
          },
        }),
      );
    }

    if (updates.address !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.ADDRESS },
          update: { value: updates.address },
          create: {
            key: SETTINGS_KEYS.ADDRESS,
            value: updates.address,
          },
        }),
      );
    }

    if (updates.city !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.CITY },
          update: { value: updates.city },
          create: {
            key: SETTINGS_KEYS.CITY,
            value: updates.city,
          },
        }),
      );
    }

    if (updates.state !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.STATE },
          update: { value: updates.state },
          create: {
            key: SETTINGS_KEYS.STATE,
            value: updates.state,
          },
        }),
      );
    }

    if (updates.zip !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.ZIP },
          update: { value: updates.zip },
          create: {
            key: SETTINGS_KEYS.ZIP,
            value: updates.zip,
          },
        }),
      );
    }

    // Phase 3: Availability & Scheduling Rules
    if (updates.availabilityRules !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.AVAILABILITY_RULES },
          update: { value: JSON.stringify(updates.availabilityRules) },
          create: {
            key: SETTINGS_KEYS.AVAILABILITY_RULES,
            value: JSON.stringify(updates.availabilityRules),
          },
        }),
      );
    }

    if (updates.smsSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.SMS_SETTINGS },
          update: { value: JSON.stringify(updates.smsSettings) },
          create: {
            key: SETTINGS_KEYS.SMS_SETTINGS,
            value: JSON.stringify(updates.smsSettings),
          },
        }),
      );
    }

    if (updates.smsBudgetSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.SMS_BUDGET_SETTINGS },
          update: { value: JSON.stringify(updates.smsBudgetSettings) },
          create: {
            key: SETTINGS_KEYS.SMS_BUDGET_SETTINGS,
            value: JSON.stringify(updates.smsBudgetSettings),
          },
        }),
      );
    }

    if (updates.packageExpirationSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.PACKAGE_EXPIRATION_SETTINGS },
          update: { value: JSON.stringify(updates.packageExpirationSettings) },
          create: {
            key: SETTINGS_KEYS.PACKAGE_EXPIRATION_SETTINGS,
            value: JSON.stringify(updates.packageExpirationSettings),
          },
        }),
      );
    }

    if (updates.reminderSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.REMINDER_SETTINGS },
          update: { value: JSON.stringify(updates.reminderSettings) },
          create: {
            key: SETTINGS_KEYS.REMINDER_SETTINGS,
            value: JSON.stringify(updates.reminderSettings),
          },
        }),
      );
    }

    if (updates.requiredVaccineSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.REQUIRED_VACCINE_SETTINGS },
          update: { value: JSON.stringify(updates.requiredVaccineSettings) },
          create: {
            key: SETTINGS_KEYS.REQUIRED_VACCINE_SETTINGS,
            value: JSON.stringify(updates.requiredVaccineSettings),
          },
        }),
      );
    }

    if (updates.holidaySurcharges !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.HOLIDAY_SURCHARGES },
          update: { value: JSON.stringify(updates.holidaySurcharges) },
          create: {
            key: SETTINGS_KEYS.HOLIDAY_SURCHARGES,
            value: JSON.stringify(updates.holidaySurcharges),
          },
        }),
      );
    }

    // Phase 4: Blackout Dates & Seasonal Pricing
    if (updates.blackoutDates !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.BLACKOUT_DATES },
          update: { value: JSON.stringify(updates.blackoutDates) },
          create: {
            key: SETTINGS_KEYS.BLACKOUT_DATES,
            value: JSON.stringify(updates.blackoutDates),
          },
        }),
      );
    }

    if (updates.seasonalPricingRules !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.SEASONAL_PRICING_RULES },
          update: { value: JSON.stringify(updates.seasonalPricingRules) },
          create: {
            key: SETTINGS_KEYS.SEASONAL_PRICING_RULES,
            value: JSON.stringify(updates.seasonalPricingRules),
          },
        }),
      );
    }

    // Phase 5: Pricing & Fees Configuration
    if (updates.pricingSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.PRICING_SETTINGS },
          update: { value: JSON.stringify(updates.pricingSettings) },
          create: {
            key: SETTINGS_KEYS.PRICING_SETTINGS,
            value: JSON.stringify(updates.pricingSettings),
          },
        }),
      );
    }

    // Phase 6: Cancellation Policy Configuration
    if (updates.cancellationPolicySettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.CANCELLATION_POLICY_SETTINGS },
          update: { value: JSON.stringify(updates.cancellationPolicySettings) },
          create: {
            key: SETTINGS_KEYS.CANCELLATION_POLICY_SETTINGS,
            value: JSON.stringify(updates.cancellationPolicySettings),
          },
        }),
      );
    }

    // Phase 7: Business Profile & Social Links
    if (updates.businessProfileSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.BUSINESS_PROFILE_SETTINGS },
          update: { value: JSON.stringify(updates.businessProfileSettings) },
          create: {
            key: SETTINGS_KEYS.BUSINESS_PROFILE_SETTINGS,
            value: JSON.stringify(updates.businessProfileSettings),
          },
        }),
      );
    }

    // Phase 8: Website Profile & Service Area
    if (updates.websiteProfileSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.WEBSITE_PROFILE_SETTINGS },
          update: { value: JSON.stringify(updates.websiteProfileSettings) },
          create: {
            key: SETTINGS_KEYS.WEBSITE_PROFILE_SETTINGS,
            value: JSON.stringify(updates.websiteProfileSettings),
          },
        }),
      );
    }

    // Phase 9: Trust Copy Settings
    if (updates.trustCopySettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.TRUST_COPY_SETTINGS },
          update: { value: JSON.stringify(updates.trustCopySettings) },
          create: {
            key: SETTINGS_KEYS.TRUST_COPY_SETTINGS,
            value: JSON.stringify(updates.trustCopySettings),
          },
        }),
      );
    }

    // Phase 10: Service Tiers & Add-Ons Configuration
    if (updates.serviceSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.SERVICE_TIERS_SETTINGS },
          update: { value: JSON.stringify(updates.serviceSettings) },
          create: {
            key: SETTINGS_KEYS.SERVICE_TIERS_SETTINGS,
            value: JSON.stringify(updates.serviceSettings),
          },
        }),
      );
    }

    if (updates.addOnsSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.ADD_ONS_SETTINGS },
          update: { value: JSON.stringify(updates.addOnsSettings) },
          create: {
            key: SETTINGS_KEYS.ADD_ONS_SETTINGS,
            value: JSON.stringify(updates.addOnsSettings),
          },
        }),
      );
    }

    // Phase 11: Testimonials Configuration
    if (updates.testimonialsSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.TESTIMONIALS_SETTINGS },
          update: { value: JSON.stringify(updates.testimonialsSettings) },
          create: {
            key: SETTINGS_KEYS.TESTIMONIALS_SETTINGS,
            value: JSON.stringify(updates.testimonialsSettings),
          },
        }),
      );
    }

    // Loyalty Program
    if (updates.loyaltyProgramSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.LOYALTY_PROGRAM_SETTINGS },
          update: { value: JSON.stringify(updates.loyaltyProgramSettings) },
          create: {
            key: SETTINGS_KEYS.LOYALTY_PROGRAM_SETTINGS,
            value: JSON.stringify(updates.loyaltyProgramSettings),
          },
        }),
      );
    }

    // Phase 12: Google Reviews Integration
    if (updates.googleReviewsSettings !== undefined) {
      updatePromises.push(
        settingsModel.upsert({
          where: { key: SETTINGS_KEYS.GOOGLE_REVIEWS_SETTINGS },
          update: { value: JSON.stringify(updates.googleReviewsSettings) },
          create: {
            key: SETTINGS_KEYS.GOOGLE_REVIEWS_SETTINGS,
            value: JSON.stringify(updates.googleReviewsSettings),
          },
        }),
      );
    }

    await Promise.all(updatePromises);

    // Return updated settings
    return getAdminSettings();
  } catch (error) {
    console.error('Error updating admin settings:', error);
    return getAdminSettings();
  }
}

function getDefaultStripeCapabilityFlags(): StripeCapabilityFlags {
  return getDefaultSettings().stripeCapabilityFlags;
}

function getDefaultBusinessHours(): BusinessHours {
  return getDefaultSettings().businessHours;
}

function getDefaultAvailabilityRules(): AvailabilityRules {
  return getDefaultSettings().availabilityRules;
}

function getDefaultPricingSettings(): PricingSettings {
  return getDefaultSettings().pricingSettings;
}

function getDefaultCancellationPolicySettings(): CancellationPolicySettings {
  return getDefaultSettings().cancellationPolicySettings;
}

function getDefaultBusinessProfileSettings(): BusinessProfileSettings {
  return getDefaultSettings().businessProfileSettings;
}

function getDefaultWebsiteProfileSettings(): WebsiteProfileSettings {
  return getDefaultSettings().websiteProfileSettings;
}

function getDefaultTrustCopySettings(): TrustCopySettings {
  return getDefaultSettings().trustCopySettings;
}

function getDefaultServiceTiersSettings(): ServiceTiersSettings {
  return getDefaultSettings().serviceSettings;
}

function getDefaultAddOnsSettings(): AddOnsSettings {
  return getDefaultSettings().addOnsSettings;
}

function getDefaultTestimonialsSettings(): TestimonialsSettings {
  return getDefaultSettings().testimonialsSettings;
}

function getDefaultLoyaltyProgramSettings(): LoyaltyProgramSettings {
  return getDefaultSettings().loyaltyProgramSettings;
}

function getDefaultGoogleReviewsSettings(): GoogleReviewsSettings {
  return getDefaultSettings().googleReviewsSettings;
}

/**
 * Save loyalty program settings
 */
export async function saveLoyaltyProgramSettings(settings: LoyaltyProgramSettings): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const settingsModel = getSettingsModel();
  if (!settingsModel) return;

  await settingsModel.upsert({
    where: { key: SETTINGS_KEYS.LOYALTY_PROGRAM_SETTINGS },
    update: { value: JSON.stringify(settings) },
    create: { key: SETTINGS_KEYS.LOYALTY_PROGRAM_SETTINGS, value: JSON.stringify(settings) },
  });
}

/**
 * Save Google Reviews settings
 */
export async function saveGoogleReviewsSettings(settings: GoogleReviewsSettings): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const settingsModel = getSettingsModel();
  if (!settingsModel) return;

  await settingsModel.upsert({
    where: { key: SETTINGS_KEYS.GOOGLE_REVIEWS_SETTINGS },
    update: { value: JSON.stringify(settings) },
    create: { key: SETTINGS_KEYS.GOOGLE_REVIEWS_SETTINGS, value: JSON.stringify(settings) },
  });
}

/**
 * Get default admin settings from centralized defaults
 */
export function getDefaultSettings(): AdminSettings {
  return structuredClone(fullSettingsDefaults) as AdminSettings;
}
