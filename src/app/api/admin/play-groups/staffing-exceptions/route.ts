import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { collectStaffingExceptions } from '@/lib/play-groups/staffing-exceptions';
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
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          summary: {
            total: 0,
            unassigned: 0,
            invalidTimeSlot: 0,
            withoutShiftCoverage: 0,
            overlapConflicts: 0,
          },
        },
      } as ApiResponse<unknown>);
    }

    const dateParam = request.nextUrl.searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 });
    }
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const groups = await prisma.playGroup.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        id: true,
        name: true,
        date: true,
        timeSlot: true,
        staffMemberId: true,
        staffMember: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
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
          },
        },
      },
      orderBy: [{ timeSlot: 'asc' }, { name: 'asc' }],
    });

    const { items, summary } = collectStaffingExceptions(groups);

    return NextResponse.json({ success: true, data: { items, summary } } as ApiResponse<{ items: typeof items; summary: typeof summary }>);
  } catch (error) {
    console.error('Failed to load staffing exceptions', error);
    return NextResponse.json(
      {
        error: 'Staffing exceptions service unavailable',
        code: 'ADMIN_STAFFING_EXCEPTIONS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
