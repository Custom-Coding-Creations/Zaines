import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

type SlotType = 'dropoff' | 'pickup';

function isSlotType(value: string | null): value is SlotType {
  return value === 'dropoff' || value === 'pickup';
}

function dateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const typeParam = searchParams.get('type');

  if (!dateParam || !isSlotType(typeParam)) {
    return NextResponse.json(
      { error: 'date and type query params are required' },
      { status: 400 },
    );
  }

  const targetDate = new Date(dateParam);
  if (Number.isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const dayOfWeek = targetDate.getDay();
  const configs = await prisma.timeSlotConfig.findMany({
    where: {
      dayOfWeek,
      isActive: true,
      OR: [{ serviceType: typeParam }, { serviceType: 'both' }],
    },
    orderBy: [{ slotStart: 'asc' }],
  });

  const { start, end } = dateRange(targetDate);

  const bookings = await prisma.booking.findMany({
    where:
      typeParam === 'dropoff'
        ? {
            checkInDate: { gte: start, lt: end },
            status: { in: ['pending', 'confirmed', 'checked_in'] },
            dropoffTimeSlot: { not: null },
          }
        : {
            checkOutDate: { gte: start, lt: end },
            status: { in: ['pending', 'confirmed', 'checked_in'] },
            pickupTimeSlot: { not: null },
          },
    select: {
      dropoffTimeSlot: true,
      pickupTimeSlot: true,
    },
  });

  const usage = new Map<string, number>();
  for (const booking of bookings) {
    const slot =
      typeParam === 'dropoff'
        ? booking.dropoffTimeSlot ?? undefined
        : booking.pickupTimeSlot ?? undefined;
    if (!slot) continue;
    usage.set(slot, (usage.get(slot) ?? 0) + 1);
  }

  const slots = configs.map((config) => {
    const label = `${config.slotStart} - ${config.slotEnd}`;
    const used = usage.get(config.slotStart) ?? 0;
    const remainingCapacity = Math.max(0, config.maxCapacity - used);
    return {
      id: config.id,
      value: config.slotStart,
      label,
      maxCapacity: config.maxCapacity,
      used,
      remainingCapacity,
      available: remainingCapacity > 0,
    };
  });

  return NextResponse.json({ success: true, data: slots });
}
