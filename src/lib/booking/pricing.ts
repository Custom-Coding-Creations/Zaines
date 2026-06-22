import { PRICING_TRUST_DISCLOSURE } from "@/config/trust-copy";
import type { HolidaySurchargeRule, PricingSettings, ServiceTier } from "@/types/admin";

export const BOOKING_PRICING_CURRENCY = "USD";
export const BOOKING_PRICING_MODEL_LABEL = "Pre-confirmation estimate";
export const BOOKING_PRICING_DISCLOSURE = PRICING_TRUST_DISCLOSURE;

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  currency: "USD",
  standardNightlyRate: 65,
  deluxeNightlyRate: 85,
  luxuryNightlyRate: 120,
  taxRatePercent: 10,
  multiPetDiscountType: 'percent',
  twoPetDiscountPercent: 15,
  threePlusPetsDiscountPercent: 20,
};

/**
 * Get the nightly rate for a service tier
 * Falls back to default pricing if tier not found in service tiers
 */
export function getNightlyRate(
  suiteType: string,
  serviceTiers?: ServiceTier[],
  pricingSettings: PricingSettings = DEFAULT_PRICING_SETTINGS,
): number {
  if (serviceTiers && serviceTiers.length > 0) {
    const lower = suiteType.toLowerCase();
    const tier = serviceTiers.find(
      (t) =>
        t.id === suiteType ||
        t.id.split('-')[0] === lower ||
        t.name.toLowerCase() === lower ||
        t.name.toLowerCase().startsWith(lower + ' '),
    );
    if (tier) {
      return tier.baseNightlyRate;
    }
  }

  // Fallback to legacy pricing settings
  const prices: Record<string, number> = {
    standard: pricingSettings.standardNightlyRate,
    deluxe: pricingSettings.deluxeNightlyRate,
    luxury: pricingSettings.luxuryNightlyRate,
  };

  return prices[suiteType] || 65;
}

export function calculateBookingPrice(
  checkIn: string,
  checkOut: string,
  suiteType: string,
  petCount: number,
  pricingSettings: PricingSettings = DEFAULT_PRICING_SETTINGS,
  serviceTiers?: ServiceTier[],
  holidaySurcharges: HolidaySurchargeRule[] = [],
): {
  subtotal: number;
  tax: number;
  total: number;
  holidaySurchargeTotal: number;
  appliedHolidaySurcharges: Array<{
    id: string;
    name: string;
    amount: number;
    surchargeType: 'flat' | 'percentage';
  }>;
} {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const nightlyRate = getNightlyRate(suiteType, serviceTiers, pricingSettings);
  let subtotal = nightlyRate * Math.max(1, nights);

  if (petCount > 1) {
    const additionalPets = petCount - 1;
    const discountValue =
      petCount === 2
        ? pricingSettings.twoPetDiscountPercent
        : pricingSettings.threePlusPetsDiscountPercent;
    const discountType = pricingSettings.multiPetDiscountType ?? 'percent';
    const additionalRate =
      discountType === 'flat'
        ? Math.max(0, nightlyRate - discountValue)
        : nightlyRate * (1 - discountValue / 100);
    subtotal += additionalRate * nights * additionalPets;
  }

  const appliedHolidaySurcharges = holidaySurcharges
    .filter((rule) => {
      if (!rule.isActive) {
        return false;
      }

      if (!['boarding', 'all'].includes(rule.appliesTo)) {
        return false;
      }

      const ruleStart = new Date(rule.startDate);
      const ruleEnd = new Date(rule.endDate);
      return ruleStart < checkOutDate && ruleEnd >= checkInDate;
    })
    .map((rule) => {
      const amount =
        rule.surchargeType === 'percentage'
          ? subtotal * (rule.surchargeAmount / 100)
          : rule.surchargeAmount;

      return {
        id: rule.id,
        name: rule.name,
        amount: Math.round(amount * 100) / 100,
        surchargeType: rule.surchargeType,
      };
    });

  const holidaySurchargeTotal = appliedHolidaySurcharges.reduce(
    (totalAmount, surcharge) => totalAmount + surcharge.amount,
    0,
  );
  subtotal += holidaySurchargeTotal;

  const tax = subtotal * (pricingSettings.taxRatePercent / 100);
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    holidaySurchargeTotal: Math.round(holidaySurchargeTotal * 100) / 100,
    appliedHolidaySurcharges,
  };
}
