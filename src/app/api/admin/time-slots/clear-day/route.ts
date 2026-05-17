import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { bulkDeleteDaySchema } from '@/lib/validations/reminder';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = (await request.json()) as unknown;
    const parsed = bulkDeleteDaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await prisma.timeSlotConfig.deleteMany({
      where: { dayOfWeek: parsed.data.dayOfWeek },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('Failed to bulk delete time slots', error);
    return NextResponse.json(
      { error: 'Time slots service unavailable', code: 'ADMIN_TIME_SLOTS_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
