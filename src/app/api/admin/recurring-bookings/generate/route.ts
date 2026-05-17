import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminSettings } from '@/lib/api/admin-settings';
import { calculateBookingPrice } from '@/lib/booking/pricing';
import { ensureDefaultSuites } from '@/lib/booking/default-suites';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function suiteTierToBookingSuiteType(
  tier: string | null | undefined,
): 'standard' | 'deluxe' | 'luxury' {
  const normalized = (tier ?? '').toLowerCase();
  if (normalized.includes('luxury')) return 'luxury';
  if (normalized.includes('deluxe')) return 'deluxe';
  return 'standard';
}

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session };
}

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { daysAhead?: number };
  const requestedDaysAhead = Math.floor(body.daysAhead ?? 21);
  const daysAhead = Number.isFinite(requestedDaysAhead)
    ? Math.min(Math.max(requestedDaysAhead, 1), 60)
    : 21;

  await ensureDefaultSuites();
  const settings = await getAdminSettings();

  const today = startOfDay(new Date());
  const generationEnd = addDays(today, daysAhead);

  const recurringSchedules = await prisma.recurringBooking.findMany({
    where: {
      isActive: true,
      startDate: { lte: generationEnd },
      OR: [{ endDate: null }, { endDate: { gte: today } }],
    },
    include: {
      suite: {
        select: {
          id: true,
          tier: true,
        },
      },
    },
  });

  const fallbackSuite = await prisma.suite.findFirst({
    where: { isActive: true },
    select: { id: true, tier: true },
    orderBy: { createdAt: 'asc' },
  });

  let generated = 0;
  let skipped = 0;

  for (const schedule of recurringSchedules) {
    const windowStart =
      schedule.startDate > today ? startOfDay(schedule.startDate) : today;
    const windowEnd = schedule.endDate
      ? (schedule.endDate < generationEnd ? schedule.endDate : generationEnd)
      : generationEnd;

    const pets = await prisma.pet.findMany({
      where: { userId: schedule.userId },
      select: { id: true },
    });

    if (pets.length === 0) {
      skipped += 1;
      continue;
    }

    const suite = schedule.suite ?? fallbackSuite;
    if (!suite) {
      skipped += 1;
      continue;
    }

    for (
      let cursor = startOfDay(windowStart);
      cursor <= windowEnd;
      cursor = addDays(cursor, 1)
    ) {
      if (!schedule.daysOfWeek.includes(cursor.getDay())) {
        continue;
      }

      const bookingStart = startOfDay(cursor);
      const bookingEnd = addDays(bookingStart, 1);

      const existing = await prisma.booking.findFirst({
        where: {
          recurringBookingId: schedule.id,
          checkInDate: {
            gte: bookingStart,
            lt: endOfDay(bookingStart),
          },
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const bookingCount = await prisma.booking.count({
        where: {
          checkInDate: {
            gte: bookingStart,
            lt: endOfDay(bookingStart),
          },
        },
      });

      const bookingNumber = `RB-${toDateKey(bookingStart)}-${String(bookingCount + 1).padStart(4, '0')}`;
      const suiteType = suiteTierToBookingSuiteType(suite.tier);
      const pricing = calculateBookingPrice(
        bookingStart.toISOString(),
        bookingEnd.toISOString(),
        suiteType,
        pets.length,
        settings.pricingSettings,
      );

      await prisma.booking.create({
        data: {
          userId: schedule.userId,
          suiteId: suite.id,
          packageId: null,
          recurringBookingId: schedule.id,
          bookingNumber,
          checkInDate: bookingStart,
          checkOutDate: bookingEnd,
          totalNights: 1,
          subtotal: pricing.subtotal,
          tax: pricing.tax,
          total: pricing.total,
          status: 'confirmed',
          specialRequests: schedule.specialRequests ?? undefined,
          bookingPets: {
            create: pets.map((pet) => ({
              petId: pet.id,
            })),
          },
        },
      });

      generated += 1;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      generated,
      skipped,
      schedulesProcessed: recurringSchedules.length,
      daysAhead,
    },
  });
}
