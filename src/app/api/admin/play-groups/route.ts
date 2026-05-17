import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { playGroupSchema } from '@/lib/validations/play-group';
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

export async function GET(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const dateParam = request.nextUrl.searchParams.get('date');
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const playGroups = await prisma.playGroup.findMany({
    where: {
      date: {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      },
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
      assignments: {
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
        orderBy: { joinedAt: 'asc' },
      },
    },
    orderBy: [{ timeSlot: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ success: true, data: playGroups } as ApiResponse<typeof playGroups>);
}

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json()) as unknown;
  const parsed = playGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  if (parsed.data.staffMemberId) {
    const staff = await prisma.staffMember.findUnique({
      where: { id: parsed.data.staffMemberId },
      select: { id: true, isActive: true },
    });

    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: 'Assigned staff member is unavailable' }, { status: 400 });
    }
  }

  const created = await prisma.playGroup.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
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
      assignments: true,
    },
  });

  return NextResponse.json(
    { success: true, data: created } as ApiResponse<typeof created>,
    { status: 201 },
  );
}