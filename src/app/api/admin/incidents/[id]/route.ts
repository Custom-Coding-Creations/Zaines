import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { incidentReportSchema } from '@/lib/validations/incident-report';
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

  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      pet: {
        select: {
          id: true,
          name: true,
          breed: true,
        },
      },
      reportedByStaff: {
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

  if (!incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: incident } as ApiResponse<typeof incident>);
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
  const parsed = incidentReportSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  const updated = await prisma.incidentReport.update({
    where: { id },
    data: {
      bookingId: payload.bookingId,
      petId: payload.petId,
      reportedByStaffId: payload.reportedByStaffId,
      type: payload.type,
      severity: payload.severity,
      description: payload.description,
      actionTaken: payload.actionTaken,
      vetReferral: payload.vetReferral,
      vetDetails: payload.vetDetails,
      ownerNotified: payload.ownerNotified,
      ownerNotifiedAt:
        payload.ownerNotified === undefined
          ? undefined
          : payload.ownerNotified
            ? new Date()
            : null,
      followUpRequired: payload.followUpRequired,
      followUpNotes: payload.followUpNotes,
      photos: payload.photos,
      witnessNames: payload.witnessNames,
      followUpCompletedAt:
        payload.followUpRequired === undefined
          ? undefined
          : payload.followUpRequired
            ? null
            : new Date(),
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
  const deleted = await prisma.incidentReport.delete({ where: { id } });

  return NextResponse.json({ success: true, data: deleted } as ApiResponse<typeof deleted>);
}
