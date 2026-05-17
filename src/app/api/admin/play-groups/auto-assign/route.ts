import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { appendPlayGroupAuditEvent } from '@/lib/api/play-group-audit';
import { scoreStaffRecommendation } from '@/lib/play-groups/staff-recommendation';
import type { ApiResponse } from '@/types/admin';

const autoAssignSchema = z.object({
  date: z.string().datetime().optional(),
});

type Slot = { start: number; end: number };

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

function parseTimeSlot(timeSlot: string): Slot | null {
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

function scheduleCoversSlot(slot: Slot | null, shiftStart: string, shiftEnd: string) {
  if (!slot) return false;

  const shiftStartMinutes = normalizeMinutes(shiftStart);
  const shiftEndMinutes = normalizeMinutes(shiftEnd);
  if (shiftStartMinutes === null || shiftEndMinutes === null || shiftEndMinutes <= shiftStartMinutes) {
    return false;
  }

  return shiftStartMinutes <= slot.start && shiftEndMinutes >= slot.end;
}

function slotsOverlap(left: Slot | null, right: Slot | null) {
  if (!left || !right) return false;
  return left.start < right.end && right.start < left.end;
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

  const unassignedGroups = groups.filter((group) => !group.staffMemberId);
  const newlyAssignedByStaff = new Map<string, Slot[]>();

  const assignments: Array<{ groupId: string; staffMemberId: string; score: number }> = [];
  const skipped: Array<{ groupId: string; reason: string }> = [];

  for (const group of unassignedGroups) {
    const groupSlot = parseTimeSlot(group.timeSlot);
    if (!groupSlot) {
      skipped.push({ groupId: group.id, reason: 'Invalid group time slot format' });
      continue;
    }

    const ranked = staffMembers
      .map((staffMember) => {
        const scheduledForSlot = staffMember.schedules.some((schedule) =>
          scheduleCoversSlot(groupSlot, schedule.shiftStart, schedule.shiftEnd),
        );

        const hasExistingConflict = staffMember.playGroups.some((assignedGroup) =>
          slotsOverlap(groupSlot, parseTimeSlot(assignedGroup.timeSlot)),
        );

        const newAssignments = newlyAssignedByStaff.get(staffMember.id) ?? [];
        const hasNewConflict = newAssignments.some((slot) => slotsOverlap(groupSlot, slot));

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
    attempted: unassignedGroups.length,
    assigned: assignments.length,
    skipped,
    assignments,
  };

  return NextResponse.json({ success: true, data: response } as ApiResponse<typeof response>);
}
