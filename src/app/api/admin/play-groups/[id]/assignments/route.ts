import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { playGroupAssignmentSchema } from '@/lib/validations/play-group';
import type { ApiResponse } from '@/types/admin';

const removeAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
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
  const parsed = playGroupAssignmentSchema.safeParse({ ...(body as object), playGroupId: id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const group = await prisma.playGroup.findUnique({
    where: { id },
    include: {
      assignments: {
        select: {
          id: true,
          petId: true,
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Play group not found' }, { status: 404 });
  }

  if (group.assignments.some((assignment) => assignment.petId === parsed.data.petId)) {
    return NextResponse.json({ error: 'Pet is already assigned to this play group' }, { status: 409 });
  }

  if (group.assignments.length >= group.maxCapacity) {
    return NextResponse.json({ error: 'Play group is at full capacity' }, { status: 409 });
  }

  const created = await prisma.playGroupAssignment.create({
    data: {
      playGroupId: id,
      petId: parsed.data.petId,
      bookingId: parsed.data.bookingId,
      behaviorNotes: parsed.data.behaviorNotes,
    },
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
  });

  return NextResponse.json(
    { success: true, data: created } as ApiResponse<typeof created>,
    { status: 201 },
  );
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
  const parsed = removeAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const assignment = await prisma.playGroupAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
    select: { id: true, playGroupId: true },
  });

  if (!assignment || assignment.playGroupId !== id) {
    return NextResponse.json({ error: 'Assignment not found for this play group' }, { status: 404 });
  }

  await prisma.playGroupAssignment.delete({
    where: { id: parsed.data.assignmentId },
  });

  return NextResponse.json({ success: true, data: { id: parsed.data.assignmentId } } as ApiResponse<{ id: string }>);
}