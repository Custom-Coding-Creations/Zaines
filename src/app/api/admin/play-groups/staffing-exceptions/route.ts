import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { parseTimeSlotRange, shiftCoversRange, timeRangesOverlap } from '@/lib/play-groups/time-slot';
import type { ApiResponse } from '@/types/admin';

type StaffingIssueType =
  | 'unassigned'
  | 'invalid_time_slot'
  | 'staff_without_shift_coverage'
  | 'staff_overlap_conflict';

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

  const groupSlots = new Map(groups.map((group) => [group.id, parseTimeSlotRange(group.timeSlot)]));

  const overlapGroupIds = new Set<string>();
  const byStaff = new Map<string, typeof groups>();
  for (const group of groups) {
    if (!group.staffMemberId) continue;
    const current = byStaff.get(group.staffMemberId) ?? [];
    current.push(group);
    byStaff.set(group.staffMemberId, current);
  }

  for (const staffGroups of byStaff.values()) {
    const sorted = [...staffGroups].sort((left, right) => {
      const leftSlot = groupSlots.get(left.id) ?? null;
      const rightSlot = groupSlots.get(right.id) ?? null;
      if (!leftSlot || !rightSlot) return 0;
      return leftSlot.start - rightSlot.start;
    });

    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      const previousSlot = groupSlots.get(previous.id) ?? null;
      const currentSlot = groupSlots.get(current.id) ?? null;
      if (timeRangesOverlap(previousSlot, currentSlot)) {
        overlapGroupIds.add(previous.id);
        overlapGroupIds.add(current.id);
      }
    }
  }

  const items = groups
    .map((group) => {
      const issues: StaffingIssueType[] = [];
      const slot = groupSlots.get(group.id) ?? null;

      if (!group.staffMemberId) {
        issues.push('unassigned');
      }

      if (!slot) {
        issues.push('invalid_time_slot');
      }

      if (group.staffMember && slot) {
        const scheduledForSlot = group.staffMember.schedules.some((schedule) =>
          shiftCoversRange(slot, schedule.shiftStart, schedule.shiftEnd),
        );

        if (!scheduledForSlot) {
          issues.push('staff_without_shift_coverage');
        }
      }

      if (overlapGroupIds.has(group.id)) {
        issues.push('staff_overlap_conflict');
      }

      if (issues.length === 0) return null;

      return {
        groupId: group.id,
        groupName: group.name,
        date: group.date.toISOString(),
        timeSlot: group.timeSlot,
        staffMemberId: group.staffMemberId,
        staffName: group.staffMember?.user.name ?? group.staffMember?.user.email ?? null,
        issues,
        canAutoFix: !issues.includes('invalid_time_slot'),
        recommendedAction: issues.includes('invalid_time_slot')
          ? 'Correct time slot format before auto-assignment'
          : 'Run auto-assign recommendation for this group',
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const summary = {
    total: items.length,
    unassigned: items.filter((item) => item.issues.includes('unassigned')).length,
    invalidTimeSlot: items.filter((item) => item.issues.includes('invalid_time_slot')).length,
    withoutShiftCoverage: items.filter((item) => item.issues.includes('staff_without_shift_coverage')).length,
    overlapConflicts: items.filter((item) => item.issues.includes('staff_overlap_conflict')).length,
  };

  return NextResponse.json({ success: true, data: { items, summary } } as ApiResponse<{ items: typeof items; summary: typeof summary }>);
}
