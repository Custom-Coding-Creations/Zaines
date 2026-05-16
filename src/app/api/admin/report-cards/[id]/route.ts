import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { reportCardSchema } from '@/lib/validations/report-card';
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
  const card = await prisma.reportCard.findUnique({
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

  if (!card) {
    return NextResponse.json({ error: 'Report card not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: card } as ApiResponse<typeof card>);
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

  const parsed = reportCardSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const updated = await prisma.reportCard.update({
    where: { id },
    data: {
      bookingId: payload.bookingId,
      petId: payload.petId,
      staffMemberId: payload.staffMemberId,
      date: payload.date ? new Date(payload.date) : undefined,
      overallMood: payload.overallMood,
      energyLevel: payload.energyLevel,
      appetiteLevel: payload.appetiteLevel,
      socialization: payload.socialization,
      bathroomNotes: payload.bathroomNotes,
      playHighlights: payload.playHighlights,
      behaviorNotes: payload.behaviorNotes,
      staffNotes: payload.staffNotes,
      sentToOwner: payload.sentToOwner,
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
  const deleted = await prisma.reportCard.delete({ where: { id } });

  return NextResponse.json({ success: true, data: deleted } as ApiResponse<typeof deleted>);
}
