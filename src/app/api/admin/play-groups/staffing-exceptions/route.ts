import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { collectStaffingExceptions } from '@/lib/play-groups/staffing-exceptions';
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

export async function GET(request: NextRequest) {
  const authResult = await authorize();
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
}
