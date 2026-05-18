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
  const checkInDayEnd = checkInDate ? new Date(checkInDate) : null;
  if (checkInDayEnd) {
    // Treat checkout on check-in day as non-overlapping for date-based stays.
    checkInDayEnd.setUTCHours(23, 59, 59, 999);
  }

  if (!checkInDate || !checkOutDate || !checkInDayEnd || checkOutDate <= checkInDate) {
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
    // First, ensure suites are initialized
    const activeSuites = await ensureDefaultSuites();
    
    // If no active suites, this indicates a bootstrap issue
    if (activeSuites === 0) {
      console.error(`[${correlationId}] No active suites found after ensureDefaultSuites()`, {
        correlationId,
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
      });
      // Still check database directly as fallback
      try {
        const dbSuiteCount = await bookingPrisma.suite.count({
          where: { isActive: true },
        });
        if (dbSuiteCount === 0) {
          // This is a real issue - no suites in database
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
      } catch {
        // Ignore fallback error, continue with original result
      }
    }

    const overlappingBookings = await bookingPrisma.booking.count({
      where: {
        status: {
          in: ["confirmed", "checked_in"],
        },
        OR: [
          {
            // Existing booking starts during requested stay
            checkInDate: {
              gte: checkInDate,
              lt: checkOutDate,
            },
          },
          {
            // Existing booking ends during requested stay (or starts during it)
            // A booking that checks out exactly on our check-in date is OK (no overlap)
            // A booking that checks out after our check-in day has ended overlaps
            checkOutDate: {
              gt: checkInDayEnd,
              lt: checkOutDate,  // Changed from <= to < for correct boundary
            },
          },
          {
            // Existing booking completely spans requested stay
            AND: [
              {
                checkInDate: {
                  lte: checkInDate,
                },
              },
              {
                checkOutDate: {
                  gte: checkOutDate,
                },
              },
            ],
          },
        ],
      },
    });

    const availableCapacity = Math.max(0, activeSuites - overlappingBookings);
    const isAvailable = availableCapacity >= parsed.data.partySize;

    // Log for diagnostics
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${correlationId}] Availability check:`, {
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
        partySize: parsed.data.partySize,
        activeSuites,
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
