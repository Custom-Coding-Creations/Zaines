import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured } from '@/lib/prisma';
import { createAdminBooking, getAdminBookings, checkSuiteAvailability } from '@/lib/api/admin-bookings';
import type { AdminBookingFormData, ApiResponse } from '@/types/admin';

/**
 * GET /api/admin/bookings - List all bookings with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [], bookings: [] } as ApiResponse<unknown[]> & { bookings: unknown[] });
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const suiteId = searchParams.get('suiteId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchTerm = searchParams.get('search');

    const filters = {
      status: status || undefined,
      suiteId: suiteId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      searchTerm: searchTerm || undefined,
    };

    const bookings = await getAdminBookings(filters);

    return NextResponse.json({
      success: true,
      data: bookings,
    } as ApiResponse<typeof bookings>);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/bookings - Create a new booking
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;
    const session = authResult.session;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => null)) as AdminBookingFormData | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.customerId || !body.petIds || !body.suiteId || !body.checkInDate || !body.checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Check suite availability
    const checkIn = new Date(body.checkInDate);
    const checkOut = new Date(body.checkOutDate);
    const available = await checkSuiteAvailability(body.suiteId, checkIn, checkOut);

    if (!available) {
      return NextResponse.json(
        { error: 'Suite not available for selected dates' },
        { status: 409 },
      );
    }

    // Create booking
    const booking = await createAdminBooking({
      ...body,
      userId: session.user.id,
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: booking,
      } as ApiResponse<typeof booking>,
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
