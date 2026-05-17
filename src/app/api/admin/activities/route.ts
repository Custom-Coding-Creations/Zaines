import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';

const ACTIVITY_TYPES = [
  'feeding',
  'walk',
  'play',
  'bathroom',
  'medication',
  'grooming',
] as const;

type ActivityType = (typeof ACTIVITY_TYPES)[number];

function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ activities: [] });
  }

  const params = request.nextUrl.searchParams;
  const bookingId = params.get('bookingId')?.trim();
  const petId = params.get('petId')?.trim();
  const type = params.get('type')?.trim();
  const since = params.get('since')?.trim();
  const limit = Math.min(Number(params.get('limit') ?? '50') || 50, 200);

  if (type && !isActivityType(type)) {
    return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
  }

  const sinceDate = since ? new Date(since) : null;
  if (since && (!sinceDate || Number.isNaN(sinceDate.getTime()))) {
    return NextResponse.json({ error: 'Invalid since timestamp' }, { status: 400 });
  }

  const activities = await prisma.activity.findMany({
    where: {
      ...(bookingId ? { bookingId } : { booking: { status: 'checked_in' } }),
      ...(petId ? { petId } : {}),
      ...(type ? { type } : {}),
      ...(sinceDate ? { performedAt: { gte: sinceDate } } : {}),
    },
    include: {
      pet: { select: { id: true, name: true, breed: true } },
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          status: true,
        },
      },
    },
    orderBy: { performedAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ activities });
}

export async function POST(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const session = authResult.session;

  const body = await request.json().catch(() => null);
  const bookingId = (body as { bookingId?: unknown } | null)?.bookingId;
  const petId = (body as { petId?: unknown } | null)?.petId;
  const type = (body as { type?: unknown } | null)?.type;
  const description = (body as { description?: unknown } | null)?.description;
  const notes = (body as { notes?: unknown } | null)?.notes;

  if (!bookingId || typeof bookingId !== 'string') {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }
  if (!petId || typeof petId !== 'string') {
    return NextResponse.json({ error: 'petId is required' }, { status: 400 });
  }
  if (!type || typeof type !== 'string' || !isActivityType(type)) {
    return NextResponse.json({ error: 'Valid activity type is required' }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      bookingPets: {
        select: { petId: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status !== 'checked_in') {
    return NextResponse.json(
      { error: `Cannot add activity for booking with status: ${booking.status}` },
      { status: 409 },
    );
  }

  const petIsOnBooking = booking.bookingPets.some((bp) => bp.petId === petId);
  if (!petIsOnBooking) {
    return NextResponse.json(
      { error: 'Pet is not assigned to this booking' },
      { status: 409 },
    );
  }

  const performedBy = session.user!.name ?? session.user!.email ?? session.user!.id;

  const activity = await prisma.activity.create({
    data: {
      bookingId,
      petId,
      type,
      description: typeof description === 'string' ? description.trim() || null : null,
      notes: typeof notes === 'string' ? notes.trim() || null : null,
      performedBy,
    },
    include: {
      pet: { select: { id: true, name: true, breed: true } },
      booking: { select: { id: true, bookingNumber: true, status: true } },
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
