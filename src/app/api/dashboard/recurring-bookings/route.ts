import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/admin';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const recurring = await prisma.recurringBooking.findMany({
    where: { userId: session.user.id },
    include: {
      suite: {
        select: {
          id: true,
          name: true,
        },
      },
      generatedBookings: {
        orderBy: { checkInDate: 'asc' },
        take: 10,
      },
    },
    orderBy: [{ isActive: 'desc' }, { startDate: 'asc' }],
  });

  return NextResponse.json({ success: true, data: recurring } as ApiResponse<typeof recurring>);
}
