import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/admin';

function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const threshold = new Date();
  threshold.setDate(threshold.getDate() + 30);

  const vaccines = await prisma.vaccine.findMany({
    where: {
      expiryDate: {
        lte: threshold,
      },
    },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          breed: true,
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
    orderBy: [{ expiryDate: 'asc' }],
  });

  const alerts = vaccines.map((vaccine) => {
    const daysRemaining = daysUntil(vaccine.expiryDate);
    return {
      id: vaccine.id,
      vaccineName: vaccine.name,
      expiryDate: vaccine.expiryDate,
      daysRemaining,
      status: daysRemaining < 0 ? 'expired' : daysRemaining <= 7 ? 'urgent' : 'upcoming',
      pet: vaccine.pet,
    };
  });

  return NextResponse.json({ success: true, data: alerts } as ApiResponse<typeof alerts>);
}
