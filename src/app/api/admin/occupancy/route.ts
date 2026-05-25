import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { getAdminSettings } from '@/lib/api/admin-settings';

export async function GET() {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) {
      return authResult.error;
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ suites: [], summary: { suites: 0, occupiedSuites: 0, occupiedPets: 0 } });
    }

    // Read the authoritative service tiers from Settings
    const settings = await getAdminSettings();
    const activeTiers = settings.serviceSettings.serviceTiers.filter((t) => t.isActive);

    if (activeTiers.length === 0) {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        suites: [],
        summary: { suites: 0, occupiedSuites: 0, occupiedPets: 0 },
      });
    }

    // Build a map of tier id -> tier settings for capacity lookup
    const tierMap = new Map(activeTiers.map((t) => [t.id, t]));

    // Query bookings with checked_in status to determine occupancy
    const checkedInBookings = await prisma.booking.findMany({
      where: { status: 'checked_in' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        bookingPets: {
          include: { pet: { select: { id: true, name: true, breed: true } } },
        },
        suite: { select: { id: true, name: true, tier: true } },
      },
    });

    // Group bookings by tier
    const bookingsByTier = new Map<string, typeof checkedInBookings>();
    for (const booking of checkedInBookings) {
      // Match booking suite tier to settings tier id
      const tierId = booking.suite?.tier
        ? `${booking.suite.tier}-suite`
        : null;
      if (tierId && tierMap.has(tierId)) {
        const existing = bookingsByTier.get(tierId) || [];
        existing.push(booking);
        bookingsByTier.set(tierId, existing);
      }
    }

    // Build occupancy data from Settings tiers
    const normalizedSuites = activeTiers.map((tier) => {
      const tierBookings = bookingsByTier.get(tier.id) || [];
      const occupiedPets = tierBookings.reduce(
        (sum, booking) => sum + booking.bookingPets.length,
        0,
      );
      const capacity = tier.capacity || 1;
      const occupancyPct = capacity > 0 ? Math.min(100, Math.round((occupiedPets / capacity) * 100)) : 0;

      return {
        id: tier.id,
        name: tier.name,
        tier: tier.id.replace('-suite', ''),
        size: tier.id.includes('luxury') ? 'large' : tier.id.includes('deluxe') ? 'large' : 'medium',
        capacity,
        occupiedPets,
        occupancyPct,
        status: occupiedPets > 0 ? 'occupied' : 'available',
        bookings: tierBookings.map((booking) => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          guest: booking.user,
          pets: booking.bookingPets.map((bp) => bp.pet),
        })),
      };
    });

    const summary = {
      suites: normalizedSuites.length,
      occupiedSuites: normalizedSuites.filter((suite) => suite.occupiedPets > 0).length,
      occupiedPets: normalizedSuites.reduce((sum, suite) => sum + suite.occupiedPets, 0),
    };

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      suites: normalizedSuites,
      summary,
    });
  } catch (error) {
    console.error('Failed to load occupancy dashboard', error);
    return NextResponse.json(
      {
        error: 'Occupancy dashboard service unavailable',
        code: 'ADMIN_OCCUPANCY_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
