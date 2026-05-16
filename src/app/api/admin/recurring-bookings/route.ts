import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { recurringBookingSchema } from '@/lib/validations/recurring-booking';
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

export async function GET() {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const recurring = await prisma.recurringBooking.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      suite: {
        select: {
          id: true,
          name: true,
        },
      },
      generatedBookings: {
        orderBy: { checkInDate: 'desc' },
        take: 5,
      },
    },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: recurring } as ApiResponse<typeof recurring>);
}

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json()) as unknown;
  const parsed = recurringBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const created = await prisma.recurringBooking.create({
    data: {
      userId: payload.userId,
      suiteId: payload.suiteId,
      serviceType: payload.serviceType,
      daysOfWeek: payload.daysOfWeek,
      startDate: new Date(payload.startDate),
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      isActive: payload.isActive,
      specialRequests: payload.specialRequests,
    },
  });

  return NextResponse.json(
    { success: true, data: created } as ApiResponse<typeof created>,
    { status: 201 },
  );
}
