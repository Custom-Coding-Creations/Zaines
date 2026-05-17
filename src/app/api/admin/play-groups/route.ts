import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { playGroupSchema } from '@/lib/validations/play-group';
import type { ApiResponse } from '@/types/admin';

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

function startOfDay(source: Date) {
  const value = new Date(source);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(source: Date) {
  const value = new Date(source);
  value.setHours(23, 59, 59, 999);
  return value;
}

function normalizeMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function parseTimeSlot(timeSlot: string): { start: number; end: number } | null {
  const cleaned = timeSlot.replace(/\s+/g, '');
  const separator = cleaned.includes('-') ? '-' : cleaned.includes('to') ? 'to' : null;
  if (!separator) return null;

  const [startRaw, endRaw] = cleaned.split(separator);
  if (!startRaw || !endRaw) return null;

  const start = normalizeMinutes(startRaw);
  const end = normalizeMinutes(endRaw);
  if (start === null || end === null || end <= start) return null;

  return { start, end };
}

function scheduleCoversSlot(
  slot: { start: number; end: number } | null,
  shiftStart: string,
  shiftEnd: string,
) {
  if (!slot) return false;

  const shiftStartMinutes = normalizeMinutes(shiftStart);
  const shiftEndMinutes = normalizeMinutes(shiftEnd);
  if (shiftStartMinutes === null || shiftEndMinutes === null || shiftEndMinutes <= shiftStartMinutes) {
    return false;
  }

  return shiftStartMinutes <= slot.start && shiftEndMinutes >= slot.end;
}

function slotsOverlap(
  left: { start: number; end: number } | null,
  right: { start: number; end: number } | null,
) {
  if (!left || !right) return false;
  return left.start < right.end && right.start < left.end;
}

export async function GET(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const dateParam = request.nextUrl.searchParams.get('date');
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const playGroups = await prisma.playGroup.findMany({
    where: {
      date: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
    },
    include: {
      staffMember: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      assignments: {
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              breed: true,
              weight: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
    orderBy: [{ timeSlot: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ success: true, data: playGroups } as ApiResponse<typeof playGroups>);
}

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json()) as unknown;
  const parsed = playGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  if (parsed.data.staffMemberId) {
    const targetDate = new Date(parsed.data.date);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    const targetSlot = parseTimeSlot(parsed.data.timeSlot);
    if (!targetSlot) {
      return NextResponse.json({ error: 'Invalid play group time slot format' }, { status: 400 });
    }

    const staff = await prisma.staffMember.findUnique({
      where: { id: parsed.data.staffMemberId },
      select: {
        id: true,
        isActive: true,
        schedules: {
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: {
            shiftStart: true,
            shiftEnd: true,
          },
        },
        playGroups: {
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: {
            id: true,
            timeSlot: true,
          },
        },
      },
    });

    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: 'Assigned staff member is unavailable' }, { status: 400 });
    }

    const scheduledForSlot = staff.schedules.some((schedule) =>
      scheduleCoversSlot(targetSlot, schedule.shiftStart, schedule.shiftEnd),
    );
    if (!scheduledForSlot) {
      return NextResponse.json(
        { error: 'Assigned staff member is not scheduled for this play group time slot' },
        { status: 409 },
      );
    }

    const hasConflict = staff.playGroups.some((group) =>
      slotsOverlap(targetSlot, parseTimeSlot(group.timeSlot)),
    );
    if (hasConflict) {
      return NextResponse.json(
        { error: 'Assigned staff member has a conflicting play group in this time slot' },
        { status: 409 },
      );
    }
  }

  const created = await prisma.playGroup.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
    },
    include: {
      staffMember: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      assignments: true,
    },
  });

  return NextResponse.json(
    { success: true, data: created } as ApiResponse<typeof created>,
    { status: 201 },
  );
}