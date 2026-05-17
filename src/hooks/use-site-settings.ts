/**
 * useSiteSettings Hook
 * Replaces static siteConfig with dynamic, real-time settings
 * Use this instead of importing siteConfig directly
 */

'use client';

import { useSettings } from '@/providers/settings-provider';
import type { AdminSettings } from '@/types/admin';

function sanitizeDogModePhrase(value: string): string {
  return value
    .replace(/dog\s*mode\s*™?/gi, 'enrichment')
    .replace(/calm\s*mode\s*™?/gi, 'calming experience')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeSettingsStrings<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeDogModePhrase(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSettingsStrings(item)) as T;
  }

  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = sanitizeSettingsStrings(item);
    }
    return next as T;
  }

  return value;
}

interface SiteContactInfo {
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface SiteSettingsHookReturn {
  contactInfo: SiteContactInfo;
  businessHours: AdminSettings['businessHours'];
  businessName: string;
  socialLinks: AdminSettings['businessProfileSettings']['socialLinks'];
  websiteProfile: AdminSettings['websiteProfileSettings'];
  trustCopy: AdminSettings['trustCopySettings'];
  availabilityRules: AdminSettings['availabilityRules'];
  pricingSettings: AdminSettings['pricingSettings'];
  serviceSettings: AdminSettings['serviceSettings'];
  addOnsSettings: AdminSettings['addOnsSettings'];
  testimonialsSettings: AdminSettings['testimonialsSettings'];
  isLoading: boolean;
}

/**
 * Hook to get current site settings from the database
 * Automatically updates across all components when settings change
 */
export function useSiteSettings(): SiteSettingsHookReturn {
  const { settings, isLoading } = useSettings();
  const sanitizedSettings = sanitizeSettingsStrings(settings);

  return {
    contactInfo: {
      phone: sanitizedSettings?.contactPhone || '(315) 657-1332',
      email: sanitizedSettings?.contactEmail || 'jgibbs@zainesstayandplay.com',
      address: sanitizedSettings?.address || '123 Pet Paradise Lane',
      city: sanitizedSettings?.city || 'Syracuse',
      state: sanitizedSettings?.state || 'NY',
      zip: sanitizedSettings?.zip || '13202',
    },
    businessHours: sanitizedSettings?.businessHours || {
      monday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
      tuesday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
      wednesday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
      thursday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
      friday: { openTime: '06:00', closeTime: '20:00', isClosed: false },
      saturday: { openTime: '08:00', closeTime: '18:00', isClosed: false },
      sunday: { openTime: '08:00', closeTime: '18:00', isClosed: false },
    },
    businessName: sanitizedSettings?.businessProfileSettings.businessName || "Zaine's Stay & Play",
    socialLinks: sanitizedSettings?.businessProfileSettings.socialLinks || {
      facebook:
        'https://www.facebook.com/people/Zaines-Stay-Play/61550036005682/',
      instagram: 'https://instagram.com/zainesstayandplay',
      twitter: 'https://twitter.com/zainesstayandplay',
    },
    websiteProfile: sanitizedSettings?.websiteProfileSettings || {
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
    trustCopy: sanitizedSettings?.trustCopySettings || {
      pricingDisclosure:
        'Premium but fair pricing includes clear subtotal, applicable tax, selected care items, and total shown before confirmation. No hidden fees, no surprise add-ons, or other undisclosed charges are introduced at checkout.',
      cancellationProcessing:
        'Refunds are returned to the original payment method when payment processing is available.',
      privacySecurityDisclosure:
        "Payment details are processed by Stripe; Zaine's Stay & Play does not store card numbers on our servers. We use access controls and secure transmission for booking, account, pet health, and message data.",
      trustEvidenceClaim:
        'Only 3 private suites, owner onsite, camera-monitored safety, no harsh chemicals, and same-family dogs can stay together when approved.',
    },
    availabilityRules: sanitizedSettings?.availabilityRules || {
      minNightsPerBooking: 1,
      maxNightsPerBooking: 365,
      advanceBookingWindowDays: 365,
      minimumLeadTimeDays: 0,
    },
    pricingSettings: sanitizedSettings?.pricingSettings || {
      currency: 'USD',
      standardNightlyRate: 65,
      deluxeNightlyRate: 85,
      luxuryNightlyRate: 120,
      taxRatePercent: 10,
      twoPetDiscountPercent: 15,
      threePlusPetsDiscountPercent: 20,
    },
    serviceSettings: sanitizedSettings?.serviceSettings || {
      serviceTiers: [
        {
          id: 'standard-suite',
          name: 'Standard Suite',
          description: 'Comfortable and cozy suite with basic amenities',
          baseNightlyRate: 65,
          imageUrl: '/images/suites/standard-placeholder.svg',
          isActive: true,
          displayOrder: 1,
        },
        {
          id: 'deluxe-suite',
          name: 'Deluxe Suite',
          description: 'Premium suite with enhanced comfort and features',
          baseNightlyRate: 85,
          imageUrl: '/images/suites/deluxe-placeholder.svg',
          isActive: true,
          displayOrder: 2,
        },
        {
          id: 'luxury-suite',
          name: 'Luxury Suite',
          description: 'Exclusive luxury experience with top-tier amenities',
          baseNightlyRate: 120,
          imageUrl: '/images/suites/luxury-placeholder.svg',
          isActive: true,
          displayOrder: 3,
        },
      ],
    },
    addOnsSettings: sanitizedSettings?.addOnsSettings || {
      addOns: [
        {
          id: 'premium-treats',
          name: 'Premium Treats Package',
          description: 'Special premium treats and snacks throughout stay',
          price: 15,
          applicableTiers: ['standard-suite', 'deluxe-suite', 'luxury-suite'],
          isActive: true,
        },
        {
          id: 'extra-playtime',
          name: 'Extra Playtime Session',
          description: 'Additional supervised playtime session',
          price: 25,
          applicableTiers: ['standard-suite', 'deluxe-suite', 'luxury-suite'],
          isActive: true,
        },
        {
          id: 'training-session',
          name: 'Training Session',
          description: 'Professional training session during stay',
          price: 50,
          applicableTiers: ['deluxe-suite', 'luxury-suite'],
          isActive: true,
        },
      ],
    },
    testimonialsSettings: sanitizedSettings?.testimonialsSettings || {
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
      ],
    },
    isLoading,
  };
}

/**
 * Get the full address string formatted
 */
export function useFormattedAddress(): string {
  const { contactInfo } = useSiteSettings();
  return `${contactInfo.address}, ${contactInfo.city}, ${contactInfo.state} ${contactInfo.zip}`;
}
