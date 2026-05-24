/**
 * Paw Points Loyalty Engine
 *
 * Core logic for awarding, redeeming, and managing loyalty points.
 * All operations are gated by the feature flag and admin settings.
 */

import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { getAdminSettings } from '@/lib/api/admin-settings';
import { getFeatureFlag } from '@/lib/feature-flags';
import type { LoyaltyProgramSettings } from '@/types/admin';
import type { LoyaltyTransaction } from '@prisma/client';

export type { LoyaltyTransaction };

async function isLoyaltyEnabled(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  if (!getFeatureFlag('loyalty-program')) return false;
  const settings = await getAdminSettings();
  return settings.loyaltyProgramSettings.enabled;
}

export async function getPointsBalance(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });
  return user?.loyaltyPoints ?? 0;
}

export async function getTierForPoints(
  points: number,
  settings: LoyaltyProgramSettings,
): Promise<string> {
  const { tierThresholds } = settings;
  if (points >= tierThresholds.vip) return 'vip';
  if (points >= tierThresholds.topDog) return 'top_dog';
  if (points >= tierThresholds.goodDog) return 'good_dog';
  return 'pup';
}

export async function updateUserTier(userId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const settings = await getAdminSettings();

  // Sum all earned (positive) transactions to get lifetime points
  const result = await prisma.loyaltyTransaction.aggregate({
    where: { userId, points: { gt: 0 } },
    _sum: { points: true },
  });
  const lifetimePoints = result._sum.points ?? 0;
  const tier = await getTierForPoints(lifetimePoints, settings.loyaltyProgramSettings);

  await prisma.user.update({
    where: { id: userId },
    data: { loyaltyTier: tier },
  });
}

export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  bookingId?: string,
  description?: string,
): Promise<void> {
  if (!(await isLoyaltyEnabled())) return;
  if (points <= 0) return;

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        type: 'earn',
        points,
        reason,
        bookingId: bookingId ?? null,
        description: description ?? null,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    }),
  ]);

  await updateUserTier(userId);
}

export async function redeemPoints(
  userId: string,
  points: number,
  bookingId?: string,
): Promise<{ success: boolean; newBalance: number }> {
  if (!(await isLoyaltyEnabled())) {
    return { success: false, newBalance: 0 };
  }

  const settings = await getAdminSettings();
  const { minRedemptionPoints } = settings.loyaltyProgramSettings;

  if (points < minRedemptionPoints) {
    const balance = await getPointsBalance(userId);
    return { success: false, newBalance: balance };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });

  if (!user || user.loyaltyPoints < points) {
    return { success: false, newBalance: user?.loyaltyPoints ?? 0 };
  }

  const [, updated] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        userId,
        type: 'redeem',
        points: -points,
        reason: 'redemption',
        bookingId: bookingId ?? null,
        description: `Redeemed ${points} points for discount`,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { decrement: points } },
    }),
  ]);

  return { success: true, newBalance: updated.loyaltyPoints };
}

export async function getLoyaltyTransactions(
  userId: string,
  limit = 20,
): Promise<LoyaltyTransaction[]> {
  if (!isDatabaseConfigured()) return [];
  return prisma.loyaltyTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function awardBookingCompletionPoints(bookingId: string): Promise<void> {
  if (!(await isLoyaltyEnabled())) return;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { bookingAddOns: true },
  });

  if (!booking || booking.status !== 'completed') return;

  const settings = await getAdminSettings();
  const { pointsPerNight, pointsPerAddon } = settings.loyaltyProgramSettings;

  const nightPoints = booking.totalNights * pointsPerNight;
  const addonPoints = booking.bookingAddOns.reduce(
    (sum, a) => sum + a.quantity * pointsPerAddon,
    0,
  );
  const totalPoints = nightPoints + addonPoints;

  if (totalPoints <= 0) return;

  await awardPoints(
    booking.userId,
    totalPoints,
    'booking_completion',
    bookingId,
    `Earned ${totalPoints} points for booking #${booking.bookingNumber}`,
  );
}
