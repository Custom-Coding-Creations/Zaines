import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  errorResponse,
  getCorrelationId,
  logServerFailure,
  rateLimitedResponse,
} from "@/lib/security/api";
import { renderPremiumReceiptHtml } from "@/lib/receipts/premium-receipt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const querySchema = z.object({
  format: z.enum(["json", "html"]).optional(),
});

function mapSuiteLabel(suite: { name: string; tier: string } | null): string {
  if (!suite) return "Suite";
  return suite.name || suite.tier;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const correlationId = getCorrelationId(request);

  try {
    const rateLimit = rateLimitedResponse({
      request,
      routeKey: "booking_receipt_read",
      route: "/api/bookings/[id]/receipt",
      correlationId,
      limit: 40,
      windowMs: 60_000,
      subject: id,
    });
    if (rateLimit) return rateLimit;

    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse({
        status: 401,
        errorCode: "AUTH_REQUIRED",
        message: "Authentication is required.",
        retryable: false,
        correlationId,
      });
    }

    if (!isDatabaseConfigured()) {
      return errorResponse({
        status: 503,
        errorCode: "RECEIPT_UNAVAILABLE",
        message: "Receipt retrieval is temporarily unavailable.",
        retryable: true,
        correlationId,
      });
    }

    const parsedUrl = new URL(request.url);
    const queryResult = querySchema.safeParse({
      format: parsedUrl.searchParams.get("format") || undefined,
    });

    if (!queryResult.success) {
      return errorResponse({
        status: 400,
        errorCode: "RECEIPT_VALIDATION_ERROR",
        message: "Invalid receipt request parameters.",
        retryable: false,
        correlationId,
      });
    }

    const receiptFormat = queryResult.data.format || "json";

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        suite: {
          select: {
            name: true,
            tier: true,
          },
        },
        bookingPets: {
          select: {
            pet: {
              select: {
                name: true,
              },
            },
          },
        },
        payments: {
          where: {
            status: {
              in: ["succeeded", "pending"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            status: true,
            currency: true,
            paidAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!booking) {
      return errorResponse({
        status: 404,
        errorCode: "BOOKING_NOT_FOUND",
        message: "Booking not found.",
        retryable: false,
        correlationId,
      });
    }

    const sessionRole = (session.user as { role?: string }).role;
    const isStaffOrAdmin = !!sessionRole && ["staff", "admin"].includes(sessionRole);

    if (!isStaffOrAdmin && booking.userId !== session.user.id) {
      return errorResponse({
        status: 403,
        errorCode: "BOOKING_ACCESS_DENIED",
        message: "You do not have access to this booking receipt.",
        retryable: false,
        correlationId,
      });
    }

    const latestPayment = booking.payments[0] || null;
    const receiptPayload = {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      status: latestPayment?.status || booking.status,
      checkIn: booking.checkInDate.toISOString(),
      checkOut: booking.checkOutDate.toISOString(),
      suite: mapSuiteLabel(booking.suite),
      subtotal: booking.subtotal,
      tax: booking.tax,
      total: booking.total,
      currency: (latestPayment?.currency || "usd").toUpperCase(),
      petNames: booking.bookingPets.map((entry) => entry.pet.name),
      customerName: booking.user.name || "Guest",
      customerEmail: booking.user.email || "",
      supportPhone: "(315) 765-7297",
      supportEmail: "jgibbs@zainesstayandplay.com",
      generatedAt: (latestPayment?.paidAt || latestPayment?.updatedAt || booking.updatedAt).toISOString(),
    };

    if (receiptFormat === "html") {
      const html = renderPremiumReceiptHtml(receiptPayload);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename=invoice-${booking.bookingNumber}.html`,
        },
      });
    }

    return NextResponse.json({
      receipt: receiptPayload,
      correlationId,
    });
  } catch (error) {
    logServerFailure(
      "/api/bookings/[id]/receipt",
      "BOOKING_RECEIPT_READ_FAILED",
      correlationId,
      error,
    );

    return errorResponse({
      status: 500,
      errorCode: "BOOKING_RECEIPT_READ_FAILED",
      message: "Unable to retrieve booking receipt.",
      retryable: true,
      correlationId,
    });
  }
}
