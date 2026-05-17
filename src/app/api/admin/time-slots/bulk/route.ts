import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { bulkTimeSlotConfigSchema } from '@/lib/validations/reminder';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = (await request.json()) as unknown;
    const parsed = bulkTimeSlotConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { slots, skipDuplicates } = parsed.data;

    if (skipDuplicates) {
      // Find existing slots that would be duplicates
      const existing = await prisma.timeSlotConfig.findMany({
        where: {
          dayOfWeek: { in: [...new Set(slots.map((s) => s.dayOfWeek))] },
        },
        select: { dayOfWeek: true, slotStart: true, slotEnd: true, serviceType: true },
      });

      const existingKeys = new Set(
        existing.map((e) => `${e.dayOfWeek}:${e.slotStart}:${e.slotEnd}:${e.serviceType}`),
      );

      const newSlots = slots.filter(
        (s) => !existingKeys.has(`${s.dayOfWeek}:${s.slotStart}:${s.slotEnd}:${s.serviceType}`),
      );

      if (newSlots.length === 0) {
        return NextResponse.json({ success: true, created: 0, skipped: slots.length });
      }

      const result = await prisma.timeSlotConfig.createMany({ data: newSlots });
      return NextResponse.json(
        { success: true, created: result.count, skipped: slots.length - result.count },
        { status: 201 },
      );
    }

    const result = await prisma.timeSlotConfig.createMany({ data: slots });
    return NextResponse.json(
      { success: true, created: result.count, skipped: 0 },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to bulk create time slots', error);
    return NextResponse.json(
      { error: 'Time slots service unavailable', code: 'ADMIN_TIME_SLOTS_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
