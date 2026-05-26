import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

/**
 * POST /api/admin/bookings/[id]/confirm - Manually confirm a pending booking
 */
export async function POST(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const params = await Promise.resolve(context.params);
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'confirmed') {
      return NextResponse.json({ success: true, data: booking });
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Only pending bookings can be manually confirmed. Current status: ${booking.status}`,
        },
        { status: 409 },
      );
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    });

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (error) {
    console.error('Error confirming booking:', error);
    return NextResponse.json(
      {
        error: 'Failed to confirm booking',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}