import { describe, expect, it } from 'vitest';
import { calculateBookingPrice } from '@/lib/booking/pricing';

describe('calculateBookingPrice holiday surcharges', () => {
  it('applies active holiday surcharge rules that overlap the booking stay', () => {
    const pricing = calculateBookingPrice(
      '2026-12-24',
      '2026-12-26',
      'standard',
      1,
      {
        currency: 'USD',
        standardNightlyRate: 100,
        deluxeNightlyRate: 150,
        luxuryNightlyRate: 200,
        taxRatePercent: 10,
        twoPetDiscountPercent: 15,
        threePlusPetsDiscountPercent: 20,
      },
      undefined,
      [
        {
          id: 'holiday-1',
          name: 'Christmas Peak',
          startDate: '2026-12-24T00:00:00.000Z',
          endDate: '2026-12-26T23:59:59.999Z',
          surchargeType: 'flat',
          surchargeAmount: 25,
          appliesTo: 'boarding',
          isActive: true,
        },
        {
          id: 'holiday-2',
          name: 'Seasonal Premium',
          startDate: '2026-12-20T00:00:00.000Z',
          endDate: '2026-12-31T23:59:59.999Z',
          surchargeType: 'percentage',
          surchargeAmount: 10,
          appliesTo: 'all',
          isActive: true,
        },
      ],
    );

    expect(pricing.appliedHolidaySurcharges).toHaveLength(2);
    expect(pricing.holidaySurchargeTotal).toBe(45);
    expect(pricing.subtotal).toBe(245);
    expect(pricing.tax).toBe(24.5);
    expect(pricing.total).toBe(269.5);
  });
});
