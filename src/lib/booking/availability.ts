import type { ServiceTier } from "@/types/admin";
import { getCanonicalCapacityMap } from "@/lib/site/service-tiers";

export type TierCapacityMap = {
  standard: number;
  deluxe: number;
  luxury: number;
};

export function getCheckInDayEnd(checkInDate: Date): Date {
  const checkInDayEnd = new Date(checkInDate);
  // Treat checkout on check-in day as non-overlapping for date-based stays.
  checkInDayEnd.setUTCHours(23, 59, 59, 999);
  return checkInDayEnd;
}

export function buildBookingDateOverlapWhere(checkInDate: Date, checkOutDate: Date) {
  const checkInDayEnd = getCheckInDayEnd(checkInDate);

  return {
    OR: [
      {
        checkInDate: {
          gte: checkInDate,
          lt: checkOutDate,
        },
      },
      {
        checkOutDate: {
          gt: checkInDayEnd,
          lte: checkOutDate,
        },
      },
      {
        AND: [
          {
            checkInDate: {
              lte: checkInDate,
            },
          },
          {
            checkOutDate: {
              gte: checkOutDate,
            },
          },
        ],
      },
    ],
  };
}

export function getConfiguredTierCapacities(serviceTiers: ServiceTier[]): TierCapacityMap {
  const configuredCapacities = getCanonicalCapacityMap(serviceTiers);

  return {
    standard: Math.max(0, configuredCapacities.standard ?? 0),
    deluxe: Math.max(0, configuredCapacities.deluxe ?? 0),
    luxury: Math.max(0, configuredCapacities.luxury ?? 0),
  };
}

export function getTotalCapacity(capacity: TierCapacityMap): number {
  return capacity.standard + capacity.deluxe + capacity.luxury;
}

export function getTotalConfiguredCapacity(serviceTiers: ServiceTier[]): number {
  return getTotalCapacity(getConfiguredTierCapacities(serviceTiers));
}
