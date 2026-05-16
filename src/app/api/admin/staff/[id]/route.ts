import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { staffMemberSchema } from '@/lib/validations/staff';
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  const staff = await prisma.staffMember.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      schedules: {
        orderBy: { date: 'asc' },
      },
      reportCards: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      incidentReports: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      assessments: {
        orderBy: { assessmentDate: 'desc' },
        take: 10,
      },
      playGroups: {
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  });

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: staff } as ApiResponse<typeof staff>);
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

  const parsed = staffMemberSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  const updated = await prisma.staffMember.update({
    where: { id },
    data: {
      userId: payload.userId,
      role: payload.role,
      phone: payload.phone,
      hireDate: payload.hireDate ? new Date(payload.hireDate) : undefined,
      certifications: payload.certifications,
      emergencyContact: payload.emergencyContact,
      notes: payload.notes,
      isActive: payload.isActive,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, data: updated } as ApiResponse<typeof updated>);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  const updated = await prisma.staffMember.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, data: updated } as ApiResponse<typeof updated>);
}
