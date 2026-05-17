import { prisma, isDatabaseConfigured } from '@/lib/prisma';

export type PackageRedemptionPreview = {
  customerPackageId: string;
  packageId: string;
  packageName: string;
  packageType: string;
  creditAmount: number;
  sessionsRemainingBefore: number;
  sessionsRemainingAfter: number;
};

export function applyPackageCreditToPricing(pricing: {
  subtotal: number;
  tax: number;
  total: number;
}, creditAmount: number) {
  const safeCredit = Math.max(0, Math.round(creditAmount * 100) / 100);
  const taxRate = pricing.subtotal > 0 ? pricing.tax / pricing.subtotal : 0;
  const subtotal = Math.max(0, Math.round((pricing.subtotal - safeCredit) * 100) / 100);
  const tax = Math.max(0, Math.round(subtotal * taxRate * 100) / 100);
  const total = Math.max(0, Math.round((subtotal + tax) * 100) / 100);

  return {
    subtotal,
    tax,
    total,
    packageCredit: safeCredit,
  };
}

export async function getEligiblePackageRedemption(
  userId: string | undefined,
  bookingSubtotal: number,
): Promise<PackageRedemptionPreview | null> {
  if (!userId || !isDatabaseConfigured()) {
    return null;
  }

  const customerPackage = await prisma.customerPackage.findFirst({
    where: {
      userId,
      status: 'active',
      sessionsRemaining: { gt: 0 },
      expiresAt: { gt: new Date() },
      package: {
        isActive: true,
        type: { in: ['boarding_bundle', 'monthly_unlimited'] },
      },
    },
    include: {
      package: true,
    },
    orderBy: [{ expiresAt: 'asc' }, { purchaseDate: 'asc' }],
  });

  if (!customerPackage) {
    return null;
  }

  const creditAmount =
    customerPackage.package.type === 'monthly_unlimited'
      ? bookingSubtotal
      : customerPackage.package.totalSessions > 0
        ? customerPackage.package.price / customerPackage.package.totalSessions
        : 0;

  return {
    customerPackageId: customerPackage.id,
    packageId: customerPackage.packageId,
    packageName: customerPackage.package.name,
    packageType: customerPackage.package.type,
    creditAmount: Math.max(0, Math.min(bookingSubtotal, Math.round(creditAmount * 100) / 100)),
    sessionsRemainingBefore: customerPackage.sessionsRemaining,
    sessionsRemainingAfter: Math.max(0, customerPackage.sessionsRemaining - 1),
  };
}
