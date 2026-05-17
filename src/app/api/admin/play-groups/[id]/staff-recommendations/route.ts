import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import {
  scoreStaffRecommendation,
  type StaffRecommendation,
} from '@/lib/play-groups/staff-recommendation';
import type { ApiResponse } from '@/types/admin';

const assignRecommendationSchema = z.object({
  staffMemberId: z.string().min(1).optional(),
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

function normalizeMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function parsePlayGroupTimeSlot(timeSlot: string): { start: number; end: number } | null {
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

async function buildRecommendations(playGroupId: string) {
  const playGroup = await prisma.playGroup.findUnique({
    where: { id: playGroupId },
    select: {
      id: true,
      date: true,
      timeSlot: true,
      energyLevel: true,
    },
  });

  if (!playGroup) {
    return { error: NextResponse.json({ error: 'Play group not found' }, { status: 404 }) };
  }

  const dayStart = startOfDay(playGroup.date);
  const dayEnd = endOfDay(playGroup.date);
  const parsedSlot = parsePlayGroupTimeSlot(playGroup.timeSlot);

  const staffMembers = await prisma.staffMember.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
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
          id: true,
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
        select: { id: true, timeSlot: true },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });

  const recommendations = staffMembers
    .map((staffMember) => {
      const scheduledForSlot = staffMember.schedules.some((schedule) =>
        scheduleCoversSlot(parsedSlot, schedule.shiftStart, schedule.shiftEnd),
      );

      const hasTimeConflict = staffMember.playGroups.some(
        (assignedGroup) =>
          assignedGroup.id !== playGroup.id &&
          slotsOverlap(parsedSlot, parsePlayGroupTimeSlot(assignedGroup.timeSlot)),
      );

      const recommendation: StaffRecommendation = scoreStaffRecommendation(
        {
          staffMemberId: staffMember.id,
          role: staffMember.role,
          certifications: staffMember.certifications,
          scheduledForSlot,
          groupsAssignedToday: staffMember.playGroups.length,
          hasTimeConflict,
        },
        {
          groupEnergyLevel: playGroup.energyLevel as 'calm' | 'moderate' | 'high',
        },
      );

      return {
        ...recommendation,
        staffMember: {
          id: staffMember.id,
          role: staffMember.role,
          certifications: staffMember.certifications,
          user: staffMember.user,
        },
      };
    })
    .sort((left, right) => right.score - left.score);

  return {
    playGroup,
    recommendations,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: { recommendations: [] } } as ApiResponse<unknown>);
  }

  const { id } = await params;
  const result = await buildRecommendations(id);
  if ('error' in result) return result.error;

  return NextResponse.json({ success: true, data: result } as ApiResponse<typeof result>);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsedBody = assignRecommendationSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const result = await buildRecommendations(id);
  if ('error' in result) return result.error;

  const selected = parsedBody.data.staffMemberId
    ? result.recommendations.find(
        (recommendation) => recommendation.staffMember.id === parsedBody.data.staffMemberId,
      )
    : result.recommendations[0];

  if (!selected) {
    return NextResponse.json(
      { error: 'Selected staff member is not available in recommendations' },
      { status: 404 },
    );
  }

  if (selected.reasons.includes('Conflicts with another assigned play group in this time slot')) {
    return NextResponse.json(
      { error: 'Selected staff member has a conflicting play group assignment in this time slot' },
      { status: 409 },
    );
  }

  if (selected.score < 40) {
    return NextResponse.json(
      { error: 'No suitable staff recommendation available for auto-assignment' },
      { status: 409 },
    );
  }

  const updated = await prisma.playGroup.update({
    where: { id },
    data: {
      staffMemberId: selected.staffMember.id,
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

  return NextResponse.json({
    success: true,
    data: {
      playGroup: updated,
      selectedRecommendation: selected,
    },
  } as ApiResponse<{ playGroup: typeof updated; selectedRecommendation: typeof selected }>);
}