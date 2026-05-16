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

export async function GET(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity') || undefined;
  const followUpOnly = searchParams.get('followUpOnly') === 'true';

  const incidents = await prisma.incidentReport.findMany({
    where: {
      severity,
      followUpRequired: followUpOnly ? true : undefined,
    },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          breed: true,
        },
      },
      booking: {
        select: {
          id: true,
          bookingNumber: true,
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
    orderBy: [{ createdAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: incidents } as ApiResponse<typeof incidents>);
}

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json()) as unknown;
  const parsed = incidentReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  const created = await prisma.incidentReport.create({
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
      followUpRequired: payload.followUpRequired,
      followUpNotes: payload.followUpNotes,
      photos: payload.photos,
      witnessNames: payload.witnessNames,
      ownerNotifiedAt: payload.ownerNotified ? new Date() : null,
    },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          breed: true,
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
