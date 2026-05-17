import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { incidentReportSchema } from '@/lib/validations/incident-report';
import type { ApiResponse } from '@/types/admin';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
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
  } catch (error) {
    console.error('Failed to load incidents', error);
    return NextResponse.json(
      {
        error: 'Incidents service unavailable',
        code: 'ADMIN_INCIDENTS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
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
  } catch (error) {
    console.error('Failed to create incident report', error);
    return NextResponse.json(
      {
        error: 'Incidents service unavailable',
        code: 'ADMIN_INCIDENTS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
