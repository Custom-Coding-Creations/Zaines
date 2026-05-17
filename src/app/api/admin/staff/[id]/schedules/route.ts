import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { staffScheduleSchema } from '@/lib/validations/staff';
import type { ApiResponse } from '@/types/admin';

const deleteScheduleSchema = z.object({
  scheduleId: z.string().min(1),
});

const updateScheduleSchema = z.object({
  scheduleId: z.string().min(1),
  date: z.string().datetime(),
  shiftStart: z.string().regex(/^\d{2}:\d{2}$/),
  shiftEnd: z.string().regex(/^\d{2}:\d{2}$/),
  breakMinutes: z.number().int().min(0).max(240).default(0),
  notes: z.string().max(1000).optional(),
});

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

async function hasOverlappingSchedule(
  staffMemberId: string,
  date: Date,
  shiftStart: string,
  shiftEnd: string,
  excludeScheduleId?: string,
) {
  const overlap = await prisma.staffSchedule.findFirst({
    where: {
      staffMemberId,
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      shiftStart: {
        lt: shiftEnd,
      },
      shiftEnd: {
        gt: shiftStart,
      },
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
    select: { id: true },
  });

  return Boolean(overlap);
}

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const { id } = await params;
  const schedules = await prisma.staffSchedule.findMany({
    where: { staffMemberId: id },
    orderBy: [{ date: 'asc' }, { shiftStart: 'asc' }],
  });

  return NextResponse.json({ success: true, data: schedules } as ApiResponse<typeof schedules>);
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
  const body = (await request.json()) as unknown;
  const parsed = staffScheduleSchema.safeParse({ ...(body as object), staffMemberId: id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  if (
    await hasOverlappingSchedule(
      id,
      new Date(parsed.data.date),
      parsed.data.shiftStart,
      parsed.data.shiftEnd,
    )
  ) {
    return NextResponse.json(
      { error: 'Shift overlaps with an existing schedule for this staff member' },
      { status: 409 },
    );
  }

  const created = await prisma.staffSchedule.create({
    data: {
      staffMemberId: id,
      date: new Date(parsed.data.date),
      shiftStart: parsed.data.shiftStart,
      shiftEnd: parsed.data.shiftEnd,
      breakMinutes: parsed.data.breakMinutes,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json(
    { success: true, data: created } as ApiResponse<typeof created>,
    { status: 201 },
  );
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
  const parsed = updateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  if (parsed.data.shiftStart >= parsed.data.shiftEnd) {
    return NextResponse.json(
      { error: 'Validation failed', details: [{ path: ['shiftEnd'], message: 'Shift end must be after shift start' }] },
      { status: 400 },
    );
  }

  const existing = await prisma.staffSchedule.findUnique({
    where: { id: parsed.data.scheduleId },
    select: { id: true, staffMemberId: true },
  });

  if (!existing || existing.staffMemberId !== id) {
    return NextResponse.json({ error: 'Schedule not found for this staff member' }, { status: 404 });
  }

  if (
    await hasOverlappingSchedule(
      id,
      new Date(parsed.data.date),
      parsed.data.shiftStart,
      parsed.data.shiftEnd,
      parsed.data.scheduleId,
    )
  ) {
    return NextResponse.json(
      { error: 'Shift overlaps with an existing schedule for this staff member' },
      { status: 409 },
    );
  }

  const updated = await prisma.staffSchedule.update({
    where: { id: parsed.data.scheduleId },
    data: {
      date: new Date(parsed.data.date),
      shiftStart: parsed.data.shiftStart,
      shiftEnd: parsed.data.shiftEnd,
      breakMinutes: parsed.data.breakMinutes,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ success: true, data: updated } as ApiResponse<typeof updated>);
}

export async function DELETE(
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
  const parsed = deleteScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const schedule = await prisma.staffSchedule.findUnique({
    where: { id: parsed.data.scheduleId },
    select: { id: true, staffMemberId: true },
  });

  if (!schedule || schedule.staffMemberId !== id) {
    return NextResponse.json({ error: 'Schedule not found for this staff member' }, { status: 404 });
  }

  await prisma.staffSchedule.delete({
    where: { id: parsed.data.scheduleId },
  });

  return NextResponse.json({ success: true, data: { id: parsed.data.scheduleId } } as ApiResponse<{ id: string }>);
}