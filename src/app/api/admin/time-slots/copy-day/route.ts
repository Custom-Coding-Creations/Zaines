import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { copyDaySchema } from '@/lib/validations/reminder';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = (await request.json()) as unknown;
    const parsed = copyDaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { sourceDayOfWeek, targetDays } = parsed.data;

    // Get all slots for the source day
    const sourceSlots = await prisma.timeSlotConfig.findMany({
      where: { dayOfWeek: sourceDayOfWeek },
    });

    if (sourceSlots.length === 0) {
      return NextResponse.json(
        { error: 'No slots found for the source day' },
        { status: 400 },
      );
    }

    // Get existing slots for all target days to skip duplicates
    const existingTargetSlots = await prisma.timeSlotConfig.findMany({
      where: { dayOfWeek: { in: targetDays } },
      select: { dayOfWeek: true, slotStart: true, slotEnd: true, serviceType: true },
    });

    const existingKeys = new Set(
      existingTargetSlots.map(
        (e) => `${e.dayOfWeek}:${e.slotStart}:${e.slotEnd}:${e.serviceType}`,
      ),
    );

    const newSlots = targetDays.flatMap((targetDay) =>
      sourceSlots
        .filter(
          (s) =>
            !existingKeys.has(`${targetDay}:${s.slotStart}:${s.slotEnd}:${s.serviceType}`),
        )
        .map((s) => ({
          dayOfWeek: targetDay,
          slotStart: s.slotStart,
          slotEnd: s.slotEnd,
          maxCapacity: s.maxCapacity,
          serviceType: s.serviceType,
          isActive: s.isActive,
        })),
    );

    if (newSlots.length === 0) {
      return NextResponse.json({ success: true, created: 0, message: 'All slots already exist' });
    }

    const result = await prisma.timeSlotConfig.createMany({ data: newSlots });
    return NextResponse.json(
      { success: true, created: result.count },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to copy day slots', error);
    return NextResponse.json(
      { error: 'Time slots service unavailable', code: 'ADMIN_TIME_SLOTS_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
