import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { appendPlayGroupAuditEvent } from '@/lib/api/play-group-audit';
import { scoreStaffRecommendation } from '@/lib/play-groups/staff-recommendation';
import { parseTimeSlotRange, shiftCoversRange, timeRangesOverlap, type TimeSlotRange } from '@/lib/play-groups/time-slot';
import type { ApiResponse } from '@/types/admin';

const autoAssignSchema = z.object({
  date: z.string().datetime().optional(),
  repairConflicts: z.boolean().optional(),
});

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

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsed = autoAssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const targetDate = parsed.data.date ? new Date(parsed.data.date) : new Date();
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);
  const repairConflicts = parsed.data.repairConflicts === true;

  const [groups, staffMembers] = await Promise.all([
    prisma.playGroup.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        id: true,
        name: true,
        timeSlot: true,
        energyLevel: true,
        staffMemberId: true,
      },
      orderBy: [{ timeSlot: 'asc' }, { name: 'asc' }],
    }),
    prisma.staffMember.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        role: true,
        certifications: true,
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
    }),
  ]);

  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const groupSlots = new Map(groups.map((group) => [group.id, parseTimeSlotRange(group.timeSlot)]));
  const staffById = new Map(staffMembers.map((staffMember) => [staffMember.id, staffMember]));

  const groupsNeedingRepair = new Set<string>();
  for (const group of groups) {
    if (!group.staffMemberId) {
      if (repairConflicts) groupsNeedingRepair.add(group.id);
      continue;
    }

    if (!repairConflicts) continue;

    const staffMember = staffById.get(group.staffMemberId);
    const groupSlot = groupSlots.get(group.id) ?? null;
    if (!staffMember || !groupSlot) {
      groupsNeedingRepair.add(group.id);
      continue;
    }

    const scheduledForSlot = staffMember.schedules.some((schedule) =>
      shiftCoversRange(groupSlot, schedule.shiftStart, schedule.shiftEnd),
    );
    if (!scheduledForSlot) {
      groupsNeedingRepair.add(group.id);
      continue;
    }
  }

  if (repairConflicts) {
    for (const staffMember of staffMembers) {
      const assignedGroups = staffMember.playGroups
        .map((playGroup) => groupsById.get(playGroup.id))
        .filter((group): group is NonNullable<typeof group> => Boolean(group))
        .sort((left, right) => {
          const leftSlot = parseTimeSlotRange(left.timeSlot);
          const rightSlot = parseTimeSlotRange(right.timeSlot);
          if (!leftSlot || !rightSlot) return 0;
          return leftSlot.start - rightSlot.start;
        });

      let previousKept: { id: string; slot: TimeSlotRange | null } | null = null;
      for (const group of assignedGroups) {
        const slot = parseTimeSlotRange(group.timeSlot);
        if (!slot) {
          groupsNeedingRepair.add(group.id);
          continue;
        }

        if (previousKept && timeRangesOverlap(previousKept.slot, slot)) {
          groupsNeedingRepair.add(group.id);
          continue;
        }

        if (!groupsNeedingRepair.has(group.id)) {
          previousKept = { id: group.id, slot };
        }
      }
    }
  }

  const targetGroups = repairConflicts
    ? groups.filter((group) => groupsNeedingRepair.has(group.id))
    : groups.filter((group) => !group.staffMemberId);
  const newlyAssignedByStaff = new Map<string, TimeSlotRange[]>();

  const assignments: Array<{ groupId: string; staffMemberId: string; score: number }> = [];
  const skipped: Array<{ groupId: string; reason: string }> = [];

  const targetGroupIds = new Set(targetGroups.map((group) => group.id));

  for (const group of targetGroups) {
    const groupSlot = parseTimeSlotRange(group.timeSlot);
    if (!groupSlot) {
      skipped.push({ groupId: group.id, reason: 'Invalid group time slot format' });
      continue;
    }

    const ranked = staffMembers
      .map((staffMember) => {
        const scheduledForSlot = staffMember.schedules.some((schedule) =>
          shiftCoversRange(groupSlot, schedule.shiftStart, schedule.shiftEnd),
        );

        const hasExistingConflict = staffMember.playGroups.some((assignedGroup) =>
          !targetGroupIds.has(assignedGroup.id) &&
          timeRangesOverlap(groupSlot, parseTimeSlotRange(assignedGroup.timeSlot)),
        );

        const newAssignments = newlyAssignedByStaff.get(staffMember.id) ?? [];
        const hasNewConflict = newAssignments.some((slot) => timeRangesOverlap(groupSlot, slot));

        const recommendation = scoreStaffRecommendation(
          {
            staffMemberId: staffMember.id,
            role: staffMember.role,
            certifications: staffMember.certifications,
            scheduledForSlot,
            groupsAssignedToday: staffMember.playGroups.length + newAssignments.length,
            hasTimeConflict: hasExistingConflict || hasNewConflict,
          },
          {
            groupEnergyLevel: group.energyLevel as 'calm' | 'moderate' | 'high',
          },
        );

        return {
          staffMemberId: staffMember.id,
          score: recommendation.score,
          scheduledForSlot,
        };
      })
      .sort((left, right) => right.score - left.score);

    const selected = ranked[0];
    if (!selected || !selected.scheduledForSlot || selected.score < 40) {
      skipped.push({ groupId: group.id, reason: 'No suitable staff recommendation available' });
      continue;
    }

    assignments.push({
      groupId: group.id,
      staffMemberId: selected.staffMemberId,
      score: selected.score,
    });

    const current = newlyAssignedByStaff.get(selected.staffMemberId) ?? [];
    current.push(groupSlot);
    newlyAssignedByStaff.set(selected.staffMemberId, current);
  }

  if (assignments.length > 0) {
    await prisma.$transaction(
      assignments.map((assignment) =>
        prisma.playGroup.update({
          where: { id: assignment.groupId },
          data: { staffMemberId: assignment.staffMemberId },
        }),
      ),
    );

    const actorUserId = authResult.session.user.id;
    const actorName =
      (authResult.session.user as { name?: string | null; email?: string | null }).name ||
      (authResult.session.user as { name?: string | null; email?: string | null }).email ||
      'Staff';

    await Promise.all(
      assignments.map((assignment) =>
        appendPlayGroupAuditEvent({
          actorUserId,
          actorName,
          eventType: 'STAFF_AUTO_ASSIGNED',
          playGroupId: assignment.groupId,
          staffMemberId: assignment.staffMemberId,
          metadata: {
            recommendationScore: assignment.score,
            source: 'bulk_auto_assign',
          },
        }),
      ),
    );
  }

  const response = {
    targetDate: dayStart.toISOString(),
    attempted: targetGroups.length,
    assigned: assignments.length,
    skipped,
    assignments,
    repairConflicts,
  };

  return NextResponse.json({ success: true, data: response } as ApiResponse<typeof response>);
}
