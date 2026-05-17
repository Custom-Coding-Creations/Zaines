import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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

export async function GET() {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'checked_in',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      bookingPets: {
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              breed: true,
              weight: true,
            },
          },
        },
      },
    },
    orderBy: { checkInDate: 'asc' },
  });

  const pets = bookings.flatMap((booking) =>
    booking.bookingPets.map(({ pet }) => ({
      pet,
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
      },
      owner: booking.user,
    })),
  );

  return NextResponse.json({ success: true, data: pets } as ApiResponse<typeof pets>);
}