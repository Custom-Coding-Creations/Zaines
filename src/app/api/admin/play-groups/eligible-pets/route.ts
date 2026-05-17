import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/admin';

export async function GET() {
  try {
    const authResult = await requireStaffSession();
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
                assessments: {
                  where: {
                    overallResult: {
                      in: ['approved', 'conditional'],
                    },
                  },
                  orderBy: {
                    assessmentDate: 'desc',
                  },
                  take: 1,
                  select: {
                    id: true,
                    assessmentDate: true,
                    overallResult: true,
                    sizeCompatibility: true,
                    energyLevel: true,
                    playStyle: true,
                    reactivityLevel: true,
                    validUntil: true,
                  },
                },
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
        latestAssessment: pet.assessments[0] ?? null,
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
        },
        owner: booking.user,
      })),
    );

    return NextResponse.json({ success: true, data: pets } as ApiResponse<typeof pets>);
  } catch (error) {
    console.error('Failed to load eligible pets', error);
    return NextResponse.json({ error: 'Failed to load eligible pets' }, { status: 500 });
  }
}