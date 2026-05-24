import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/prisma';
import {
  getPointsBalance,
  getLoyaltyTransactions,
  redeemPoints,
} from '@/lib/loyalty/paw-points';
import { getAdminSettings } from '@/lib/api/admin-settings';
import { getFeatureFlag } from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = getFeatureFlag('loyalty-program', session.user.id);
  if (!enabled) {
    return NextResponse.json({ error: 'Loyalty program not enabled' }, { status: 404 });
  }

  const [balance, transactions, settings, user] = await Promise.all([
    getPointsBalance(session.user.id),
    getLoyaltyTransactions(session.user.id, 20),
    getAdminSettings(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { loyaltyTier: true },
    }),
  ]);

  return NextResponse.json({
    balance,
    tier: user?.loyaltyTier ?? 'pup',
    transactions,
    settings: settings.loyaltyProgramSettings,
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = getFeatureFlag('loyalty-program', session.user.id);
  if (!enabled) {
    return NextResponse.json({ error: 'Loyalty program not enabled' }, { status: 404 });
  }

  let body: { points?: number; bookingId?: string };
  try {
    body = await request.json() as { points?: number; bookingId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { points, bookingId } = body;
  if (typeof points !== 'number' || points <= 0) {
    return NextResponse.json({ error: 'Invalid points value' }, { status: 400 });
  }

  const result = await redeemPoints(session.user.id, points, bookingId);
  if (!result.success) {
    return NextResponse.json({ error: 'Insufficient points or below minimum redemption' }, { status: 400 });
  }

  return NextResponse.json(result);
}
