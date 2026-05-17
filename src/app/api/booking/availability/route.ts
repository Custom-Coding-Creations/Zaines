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
    const activeSuites = await ensureDefaultSuites();
    const overlappingBookings = await bookingPrisma.booking.count({
      where: {
        status: {
          in: ["confirmed", "checked_in"],
        },
        OR: [
          {
            checkInDate: {
              gte: checkInDate,
              lt: checkOutDate,
            },
          },
          {
            checkOutDate: {
              gt: checkInDayEnd,
              lte: checkOutDate,
            },
          },
          {
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
