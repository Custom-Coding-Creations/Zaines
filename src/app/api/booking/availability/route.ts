import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  availabilityRequestSchema,
  createPublicErrorEnvelope,
  getCorrelationId,
  logServerFailure,
  parseDate,
} from "@/lib/api/issue26";
import { ensureDefaultSuites } from "@/lib/booking/default-suites";
import { getAdminSettings } from "@/lib/api/admin-settings";
import {
  buildBookingDateOverlapWhere,
  getTotalConfiguredCapacity,
} from "@/lib/booking/availability";
import { rateLimitedResponse } from "@/lib/security/api";

type BookingPrisma = {
  suite: {
    count: (args: { where: { isActive: boolean } }) => Promise<number>;
  };
  booking: {
    count: (args: {
      where: {
        status: { in: string[] };
        OR: Array<Record<string, unknown>>;
      };
    }) => Promise<number>;
  };
};

const bookingPrisma = prisma as unknown as BookingPrisma;

async function getConfiguredCapacity(): Promise<number> {
  const settings = await getAdminSettings();
  return getTotalConfiguredCapacity(
    settings.serviceSettings.serviceTiers,
  );
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      createPublicErrorEnvelope({
        errorCode: "INVALID_DATE_RANGE",
        message: "Check-out must be after check-in.",
        retryable: false,
        correlationId,
      }),
      { status: 400 },
    );
  }

  const parsed = availabilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      createPublicErrorEnvelope({
        errorCode: "INVALID_DATE_RANGE",
        message: "Check-out must be after check-in.",
        retryable: false,
        correlationId,
      }),
      { status: 400 },
    );
  }

  const rateLimit = rateLimitedResponse({
    request,
    routeKey: "booking_availability",
    route: "/api/booking/availability",
    correlationId,
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimit) return rateLimit;

  const checkInDate = parseDate(parsed.data.checkIn);
  const checkOutDate = parseDate(parsed.data.checkOut);

  if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
    return NextResponse.json(
      createPublicErrorEnvelope({
        errorCode: "INVALID_DATE_RANGE",
        message: "Check-out must be after check-in.",
        retryable: false,
        correlationId,
      }),
      { status: 400 },
    );
  }

  try {
    const seededSuites = await ensureDefaultSuites();
    const activeCapacity = await getConfiguredCapacity();

    // During first-run bootstrap in tests or partial mocks, capacity can read as zero
    // immediately after seeding; fall back to seeded suite count.
    const effectiveCapacity = activeCapacity > 0 ? activeCapacity : seededSuites;

    if (effectiveCapacity === 0) {
      return NextResponse.json(
        createPublicErrorEnvelope({
          errorCode: "AVAILABILITY_UNAVAILABLE",
          message: "Booking system is being initialized. Please try again in a moment.",
          retryable: true,
          correlationId,
        }),
        { status: 503 },
      );
    }

    const overlappingBookings = await bookingPrisma.booking.count({
      where: {
        status: {
          in: ["confirmed", "checked_in"],
        },
        ...buildBookingDateOverlapWhere(checkInDate, checkOutDate),
      },
    });

    const availableCapacity = Math.max(0, effectiveCapacity - overlappingBookings);
    const isAvailable = availableCapacity >= parsed.data.partySize;

    if (process.env.NODE_ENV === "development") {
      console.debug(`[${correlationId}] Availability check:`, {
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
        partySize: parsed.data.partySize,
        configuredCapacity: effectiveCapacity,
        overlappingBookings,
        availableCapacity,
        isAvailable,
      });
    }

    return NextResponse.json(
      {
        isAvailable,
        reasonCode: isAvailable ? "NONE" : "NO_CAPACITY",
        nextRetryAfterSeconds: isAvailable ? undefined : 900,
      },
      { status: 200 },
    );
  } catch (error) {
    logServerFailure(
      "/api/booking/availability",
      "AVAILABILITY_UNAVAILABLE",
      correlationId,
      error,
    );
    return NextResponse.json(
      createPublicErrorEnvelope({
        errorCode: "AVAILABILITY_UNAVAILABLE",
        message: "Availability is temporarily unavailable. Please retry.",
        retryable: true,
        correlationId,
      }),
      { status: 503 },
    );
  }
}
