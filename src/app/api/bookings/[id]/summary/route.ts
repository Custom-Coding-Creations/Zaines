import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';

/**
 * GET /api/bookings/[id]/summary
 *
 * Returns a minimal summary of a past booking for the "Rebook this stay"
 * shortcut. The client uses this to pre-fill the booking wizard with the
 * same suite type and pets without needing dates.
 *
 * Only the booking owner may access this endpoint.
 */
export async function GET(
  _req: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await Promise.resolve(context.params);

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      userId: true,
      suite: { select: { tier: true } },
      bookingPets: { select: { petId: true } },
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    suiteType: booking.suite?.tier ?? null,
    petIds: booking.bookingPets.map((bp) => bp.petId),
  });
}
