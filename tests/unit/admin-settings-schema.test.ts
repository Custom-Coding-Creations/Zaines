/**
 * Unit tests for admin settings Zod schemas
 * Validates all 7 section schemas and their validation rules
 */

import { describe, it, expect } from 'vitest';
import {
  generalSettingsSchema,
  bookingSettingsSchema,
  pricingSettingsSchema,
  blackoutDatesSettingsSchema,
  servicesSettingsSchema,
  websiteSettingsSchema,
  testimonialsSettingsSchema,
  fullSettingsSchema,
} from '@/lib/validations/admin-settings';

describe('Admin Settings Schemas', () => {
  describe('generalSettingsSchema', () => {
    it('validates valid general settings', () => {
      const validData = {
        businessHours: {
          monday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          tuesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          wednesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          thursday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          friday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          saturday: { openTime: '10:00', closeTime: '16:00', isClosed: false },
          sunday: { openTime: '10:00', closeTime: '16:00', isClosed: true },
        },
        contactPhone: '(315) 555-1234',
        contactEmail: 'test@example.com',
        address: '123 Main St',
        city: 'Syracuse',
        state: 'NY',
        zip: '13202',
        businessProfileSettings: {
          businessName: 'Test Business',
          socialLinks: {
            facebook: 'https://facebook.com/test',
            instagram: 'https://instagram.com/test',
            twitter: 'https://twitter.com/test',
          },
        },
      };

      const result = generalSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        businessHours: {
          monday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          tuesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          wednesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          thursday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          friday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          saturday: { openTime: '10:00', closeTime: '16:00', isClosed: false },
          sunday: { openTime: '10:00', closeTime: '16:00', isClosed: true },
        },
        contactPhone: '(315) 555-1234',
        contactEmail: 'invalid-email', // Invalid
        address: '123 Main St',
        city: 'Syracuse',
        state: 'NY',
        zip: '13202',
        businessProfileSettings: {
          businessName: 'Test Business',
          socialLinks: {
            facebook: 'https://facebook.com/test',
            instagram: 'https://instagram.com/test',
            twitter: 'https://twitter.com/test',
          },
        },
      };

      const result = generalSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects invalid URL in social links', () => {
      const invalidData = {
        businessHours: {
          monday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          tuesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          wednesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          thursday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          friday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          saturday: { openTime: '10:00', closeTime: '16:00', isClosed: false },
          sunday: { openTime: '10:00', closeTime: '16:00', isClosed: true },
        },
        contactPhone: '(315) 555-1234',
        contactEmail: 'test@example.com',
        address: '123 Main St',
        city: 'Syracuse',
        state: 'NY',
        zip: '13202',
        businessProfileSettings: {
          businessName: 'Test Business',
          socialLinks: {
            facebook: 'not-a-url', // Invalid
            instagram: 'https://instagram.com/test',
            twitter: 'https://twitter.com/test',
          },
        },
      };

      const result = generalSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('bookingSettingsSchema', () => {
    it('validates valid booking settings', () => {
      const validData = {
        autoConfirmBookings: true,
        photoNotificationType: 'instant' as const,
        photoNotificationTime: null,
        dashboardDateRange: 'today' as const,
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

      const result = bookingSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid photo notification type', () => {
      const invalidData = {
        autoConfirmBookings: true,
        photoNotificationType: 'invalid' as any, // Invalid
        photoNotificationTime: null,
        dashboardDateRange: 'today' as const,
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

      const result = bookingSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('pricingSettingsSchema', () => {
    it('validates valid pricing settings', () => {
      const validData = {
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

      const result = pricingSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('enforces fullRefundHours > partialRefundHours constraint', () => {
      const invalidData = {
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
          fullRefundHours: 24, // Invalid: should be > 48
          partialRefundHours: 48,
          partialRefundPercent: 50,
          noShowRefundPercent: 0,
        },
      };

      const result = pricingSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('Full refund window must be greater')
        )).toBe(true);
      }
    });

    it('rejects negative pricing values', () => {
      const invalidData = {
        pricingSettings: {
          currency: 'USD',
          standardNightlyRate: -65, // Invalid
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

      const result = pricingSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('blackoutDatesSettingsSchema', () => {
    it('validates valid blackout dates', () => {
      const validData = {
        blackoutDates: [
          {
            id: 'blackout-1',
            date: '2026-12-24',
            reason: 'Christmas Holiday',
            blockType: 'full_day' as const,
          },
        ],
      };

      const result = blackoutDatesSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('allows empty blackout dates array', () => {
      const validData = {
        blackoutDates: [],
      };

      const result = blackoutDatesSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('servicesSettingsSchema', () => {
    it('validates valid services settings', () => {
      const validData = {
        serviceSettings: {
          serviceTiers: [
            {
              id: 'tier-1',
              name: 'Standard Suite',
              description: 'Comfortable suite',
              baseNightlyRate: 65,
              capacity: 2,
              imageUrl: '/images/standard.jpg',
              isActive: true,
              displayOrder: 0,
            },
          ],
        },
        addOnsSettings: {
          addOns: [
            {
              id: 'addon-1',
              name: 'Extra Playtime',
              description: '30 minutes of playtime',
              price: 15,
              applicableTiers: ['Standard Suite'],
              isActive: true,
            },
          ],
        },
      };

      const result = servicesSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('requires at least one service tier', () => {
      const invalidData = {
        serviceSettings: {
          serviceTiers: [], // Invalid
        },
        addOnsSettings: {
          addOns: [],
        },
      };

      const result = servicesSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('requires at least one applicable tier for add-ons', () => {
      const invalidData = {
        serviceSettings: {
          serviceTiers: [
            {
              id: 'tier-1',
              name: 'Standard Suite',
              description: 'Comfortable suite',
              baseNightlyRate: 65,
              capacity: 2,
              imageUrl: '/images/standard.jpg',
              isActive: true,
              displayOrder: 0,
            },
          ],
        },
        addOnsSettings: {
          addOns: [
            {
              id: 'addon-1',
              name: 'Extra Playtime',
              description: '30 minutes of playtime',
              price: 15,
              applicableTiers: [], // Invalid
              isActive: true,
            },
          ],
        },
      };

      const result = servicesSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('websiteSettingsSchema', () => {
    it('validates valid website settings', () => {
      const validData = {
        websiteProfileSettings: {
          siteUrl: 'https://example.com',
          siteDescription: 'Test description with required keywords',
          ogImageUrl: 'https://example.com/og.jpg',
          ownerImageUrl: 'https://example.com/owner.jpg',
          logoImageUrl: 'https://example.com/logo.svg',
          serviceArea: ['Syracuse', 'Liverpool'],
        },
        trustCopySettings: {
          pricingDisclosure: 'Price shown before confirmation with no hidden fees',
          cancellationProcessing: 'Refunds returned to payment method',
          privacySecurityDisclosure: 'Stripe processes payments and does not store card numbers',
          trustEvidenceClaim: 'Only 3 private suites with owner onsite daily',
        },
      };

      const result = websiteSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('enforces pricing disclosure keywords', () => {
      const invalidData = {
        websiteProfileSettings: {
          siteUrl: 'https://example.com',
          siteDescription: 'Test description',
          ogImageUrl: 'https://example.com/og.jpg',
          ownerImageUrl: 'https://example.com/owner.jpg',
          logoImageUrl: 'https://example.com/logo.svg',
          serviceArea: ['Syracuse'],
        },
        trustCopySettings: {
          pricingDisclosure: 'Some generic text', // Missing required keywords
          cancellationProcessing: 'Refunds returned to payment method',
          privacySecurityDisclosure: 'Stripe processes payments and does not store card numbers',
          trustEvidenceClaim: 'Only 3 private suites with owner onsite daily',
        },
      };

      const result = websiteSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('enforces privacy disclosure keywords', () => {
      const invalidData = {
        websiteProfileSettings: {
          siteUrl: 'https://example.com',
          siteDescription: 'Test description',
          ogImageUrl: 'https://example.com/og.jpg',
          ownerImageUrl: 'https://example.com/owner.jpg',
          logoImageUrl: 'https://example.com/logo.svg',
          serviceArea: ['Syracuse'],
        },
        trustCopySettings: {
          pricingDisclosure: 'Price shown before confirmation with no hidden fees',
          cancellationProcessing: 'Refunds returned to payment method',
          privacySecurityDisclosure: 'Generic privacy text', // Missing Stripe and card storage keywords
          trustEvidenceClaim: 'Only 3 private suites with owner onsite daily',
        },
      };

      const result = websiteSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('testimonialsSettingsSchema', () => {
    it('validates valid testimonials settings', () => {
      const validData = {
        testimonialsSettings: {
          testimonials: [
            {
              id: 'testimonial-1',
              author: 'Sarah M.',
              petName: 'Max',
              rating: 5,
              date: '2 weeks ago',
              text: 'Amazing experience with great care!',
              serviceLabel: 'Standard Suite',
              isActive: true,
              displayOrder: 0,
            },
          ],
        },
      };

      const result = testimonialsSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('requires at least one testimonial', () => {
      const invalidData = {
        testimonialsSettings: {
          testimonials: [], // Invalid
        },
      };

      const result = testimonialsSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('enforces minimum text length', () => {
      const invalidData = {
        testimonialsSettings: {
          testimonials: [
            {
              id: 'testimonial-1',
              author: 'Sarah M.',
              petName: 'Max',
              rating: 5,
              date: '2 weeks ago',
              text: 'Short', // Too short
              serviceLabel: 'Standard Suite',
              isActive: true,
              displayOrder: 0,
            },
          ],
        },
      };

      const result = testimonialsSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('enforces rating range 1-5', () => {
      const invalidData = {
        testimonialsSettings: {
          testimonials: [
            {
              id: 'testimonial-1',
              author: 'Sarah M.',
              petName: 'Max',
              rating: 6, // Invalid: must be 1-5
              date: '2 weeks ago',
              text: 'Amazing experience!',
              serviceLabel: 'Standard Suite',
              isActive: true,
              displayOrder: 0,
            },
          ],
        },
      };

      const result = testimonialsSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('fullSettingsSchema', () => {
    it('validates complete settings with all required fields', () => {
      // Instead of testing partial with refinements, test complete object
      const validData = {
        // General
        businessHours: {
          monday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          tuesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          wednesday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          thursday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          friday: { openTime: '09:00', closeTime: '17:00', isClosed: false },
          saturday: { openTime: '10:00', closeTime: '16:00', isClosed: false },
          sunday: { openTime: '10:00', closeTime: '16:00', isClosed: true },
        },
        contactPhone: '(315) 555-1234',
        contactEmail: 'test@example.com',
        address: '123 Main St',
        city: 'Syracuse',
        state: 'NY',
        zip: '13202',
        businessProfileSettings: {
          businessName: 'Test Business',
          socialLinks: {
            facebook: 'https://facebook.com/test',
            instagram: 'https://instagram.com/test',
            twitter: 'https://twitter.com/test',
          },
        },
        // Booking
        autoConfirmBookings: true,
        photoNotificationType: 'instant' as const,
        photoNotificationTime: null,
        dashboardDateRange: 'today' as const,
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
        // Pricing - with valid refund hours
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
        // Blackout Dates
        blackoutDates: [],
        // Website
        websiteProfileSettings: {
          siteUrl: 'https://example.com',
          siteDescription: 'Test description',
          ogImageUrl: 'https://example.com/og.jpg',
          ownerImageUrl: 'https://example.com/owner.jpg',
          logoImageUrl: 'https://example.com/logo.svg',
          serviceArea: ['Syracuse'],
        },
        trustCopySettings: {
          pricingDisclosure: 'Price shown before confirmation with no hidden fees',
          cancellationProcessing: 'Refunds returned to payment method',
          privacySecurityDisclosure: 'Stripe processes payments and does not store card numbers',
          trustEvidenceClaim: 'Only 3 private suites with owner onsite daily',
        },
      };

      const result = fullSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
