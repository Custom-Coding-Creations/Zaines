import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { parseTimeSlotRange, shiftCoversRange, timeRangesOverlap } from '@/lib/play-groups/time-slot';
import { playGroupSchema } from '@/lib/validations/play-group';
import type { ApiResponse } from '@/types/admin';

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

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
    }

    const dateParam = request.nextUrl.searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 });
    }

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
  } catch (error) {
    console.error('Failed to load play groups', error);
    return NextResponse.json({ error: 'Failed to load play groups' }, { status: 500 });
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
      const targetSlot = parseTimeSlotRange(parsed.data.timeSlot);
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
        shiftCoversRange(targetSlot, schedule.shiftStart, schedule.shiftEnd),
      );
      if (!scheduledForSlot) {
        return NextResponse.json(
          { error: 'Assigned staff member is not scheduled for this play group time slot' },
          { status: 409 },
        );
      }

      const hasConflict = staff.playGroups.some((group) =>
        timeRangesOverlap(targetSlot, parseTimeSlotRange(group.timeSlot)),
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
  } catch (error) {
    console.error('Failed to create play group', error);
    return NextResponse.json({ error: 'Failed to create play group' }, { status: 500 });
  }
}