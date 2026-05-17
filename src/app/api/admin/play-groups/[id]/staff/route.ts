import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { parseTimeSlotRange, shiftCoversRange, timeRangesOverlap } from '@/lib/play-groups/time-slot';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { appendPlayGroupAuditEvent } from '@/lib/api/play-group-audit';
import type { ApiResponse } from '@/types/admin';

const updateStaffSchema = z.object({
  staffMemberId: z.string().min(1).nullable().optional(),
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as unknown;
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const group = await prisma.playGroup.findUnique({
    where: { id },
    select: {
      id: true,
      date: true,
      timeSlot: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Play group not found' }, { status: 404 });
  }

  const requestedStaffId = parsed.data.staffMemberId ?? null;
  const actorUserId = authResult.session.user.id;
  const actorName =
    (authResult.session.user as { name?: string | null; email?: string | null }).name ||
    (authResult.session.user as { name?: string | null; email?: string | null }).email ||
    'Staff';

  if (requestedStaffId) {
    const dayStart = startOfDay(group.date);
    const dayEnd = endOfDay(group.date);
    const targetSlot = parseTimeSlotRange(group.timeSlot);
    if (!targetSlot) {
      return NextResponse.json({ error: 'Invalid play group time slot format' }, { status: 400 });
    }

    const staff = await prisma.staffMember.findUnique({
      where: { id: requestedStaffId },
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

    const hasConflict = staff.playGroups.some((assignedGroup) =>
      assignedGroup.id !== group.id &&
      timeRangesOverlap(targetSlot, parseTimeSlotRange(assignedGroup.timeSlot)),
    );

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Assigned staff member has a conflicting play group in this time slot' },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.playGroup.update({
    where: { id: group.id },
    data: {
      staffMemberId: requestedStaffId,
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
    },
  });

  await appendPlayGroupAuditEvent({
    actorUserId,
    actorName,
    eventType: requestedStaffId ? 'STAFF_ASSIGNED' : 'STAFF_UNASSIGNED',
    playGroupId: group.id,
    staffMemberId: requestedStaffId,
    metadata: {
      source: 'manual_reassignment',
    },
  });

  return NextResponse.json({ success: true, data: updated } as ApiResponse<typeof updated>);
}
