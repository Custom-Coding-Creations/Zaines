import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendIncidentNotification } from '@/lib/notifications';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  const updated = await prisma.incidentReport.update({
    where: { id },
    data: {
      ownerNotified: true,
      ownerNotifiedAt: new Date(),
    },
    include: {
      pet: {
        select: {
          name: true,
        },
      },
      booking: {
        select: {
          bookingNumber: true,
          user: {
            select: {
              email: true,
              name: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  await sendIncidentNotification({
    toEmail: updated.booking?.user?.email,
    toPhone: updated.booking?.user?.phone,
    customerName: updated.booking?.user?.name,
    petName: updated.pet.name,
    bookingNumber: updated.booking?.bookingNumber,
  });

  return NextResponse.json({ success: true, data: updated } as ApiResponse<typeof updated>);
}
