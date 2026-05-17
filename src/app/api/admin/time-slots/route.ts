import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { timeSlotConfigSchema } from '@/lib/validations/reminder';

export async function GET() {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const slots = await prisma.timeSlotConfig.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { slotStart: 'asc' }],
    });

    return NextResponse.json({ success: true, data: slots });
  } catch (error) {
    console.error('Failed to load time slots', error);
    return NextResponse.json({ error: 'Failed to load time slots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = (await request.json()) as unknown;
    const parsed = timeSlotConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const created = await prisma.timeSlotConfig.create({
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Failed to create time slot', error);
    return NextResponse.json({ error: 'Failed to create time slot' }, { status: 500 });
  }
}
