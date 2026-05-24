import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { awardBookingCompletionPoints } from '@/lib/loyalty/paw-points';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as { id: string; role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const bookingId = (body as { bookingId?: unknown } | null)?.bookingId;

  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.status !== 'checked_in') {
    return NextResponse.json(
      { error: `Cannot check out booking with status: ${booking.status}` },
      { status: 409 },
    );
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'completed' },
  });

  // Award loyalty points for completed stay (fire-and-forget, non-blocking)
  awardBookingCompletionPoints(bookingId).catch((err) =>
    console.error('[check-out] loyalty award failed:', err),
  );

  return NextResponse.json({ booking: updated });
}
