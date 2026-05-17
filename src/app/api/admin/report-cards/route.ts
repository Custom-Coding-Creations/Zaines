import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { reportCardSchema } from '@/lib/validations/report-card';
import type { ApiResponse } from '@/types/admin';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId') || undefined;
    const petId = searchParams.get('petId') || undefined;
    const dateParam = searchParams.get('date');

    const where: {
      bookingId?: string;
      petId?: string;
      date?: { gte: Date; lt: Date };
    } = {};

    if (bookingId) where.bookingId = bookingId;
    if (petId) where.petId = petId;
    if (dateParam) {
      const start = new Date(dateParam);
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 });
      }
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.date = { gte: start, lt: end };
    }

    const cards = await prisma.reportCard.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
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
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: cards } as ApiResponse<typeof cards>);
  } catch (error) {
    console.error('Failed to load report cards', error);
    return NextResponse.json(
      {
        error: 'Report cards service unavailable',
        code: 'ADMIN_REPORT_CARDS_UNAVAILABLE',
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
    const parsed = reportCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const created = await prisma.reportCard.create({
      data: {
        bookingId: payload.bookingId,
        petId: payload.petId,
        staffMemberId: payload.staffMemberId,
        date: new Date(payload.date),
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
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
            breed: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: created } as ApiResponse<typeof created>,
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create report card', error);
    return NextResponse.json(
      {
        error: 'Report cards service unavailable',
        code: 'ADMIN_REPORT_CARDS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
