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

  const cards = await prisma.reportCard.findMany({
    where: {
      booking: {
        userId: session.user.id,
      },
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
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ success: true, data: cards } as ApiResponse<typeof cards>);
}
