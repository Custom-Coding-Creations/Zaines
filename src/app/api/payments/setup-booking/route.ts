import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import * as stripeLib from "@/lib/stripe";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  errorResponse,
  getCorrelationId,
  logServerFailure,
  rateLimitedResponse,
} from "@/lib/security/api";

const setupSchema = z.object({
  bookingId: z.string().min(1),
  preferredFlow: z.enum(["payment_element", "embedded_checkout"]).optional(),
});

type BookingPaymentMode = "payment_element" | "embedded_checkout";

const REUSABLE_PAYMENT_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
]);

type SetupPrisma = {
  booking: {
    findUnique: (args: {
      where: { id: string };
      include: { user: true };
    }) => Promise<{
      id: string;
      userId: string;
      bookingNumber: string;
      total: number;
      checkInDate: Date;
      checkOutDate: Date;
      status: string;
      email: string | null;
      user: { email: string | null };
    } | null>;
  };
  payment: {
    findFirst: (args: {
      where: { bookingId: string };
      orderBy?: { createdAt: "desc" | "asc" };
    }) => Promise<{
      id: string;
      status: string;
      stripePaymentId: string | null;
    } | null>;
    create: (args: {
      data: {
        bookingId: string;
        amount: number;
        currency: string;
        status: string;
        stripePaymentId: string;
        revenueRecognitionMethod: string;
        recognitionStatus: string;
        servicePeriodStart: Date;
        servicePeriodEnd: Date;
        deferredRevenueAmount: number;
        recognizedRevenueAmount: number;
        taxTreatment: string;
      };
    }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: { stripePaymentId: string; status: string };
    }) => Promise<{ id: string }>;
  };
};

const setupPrisma = prisma as unknown as SetupPrisma;

function resolveFlowMode(preferredFlow?: BookingPaymentMode): BookingPaymentMode {
  if (preferredFlow) return preferredFlow;
  return process.env.STRIPE_BOOKING_PAYMENT_FLOW === "checkout_session"
    ? "embedded_checkout"
    : "payment_element";
}

async function createPaymentObject(args: {
  booking: {
    id: string;
    userId: string;
    bookingNumber: string;
    total: number;
    user: { email: string | null };
  };
  mode: BookingPaymentMode;
  idempotencyKey: string;
}) {
  const { booking, mode, idempotencyKey } = args;

  if (mode === "embedded_checkout") {
    const session = await stripeLib.stripe.checkout.sessions.create(
      {
        ui_mode: "embedded",
        redirect_on_completion: "never",
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Booking #${booking.bookingNumber}`,
                description: "Zaine's Stay & Play booking payment",
              },
              unit_amount: stripeLib.formatAmountForStripe(booking.total),
            },
            quantity: 1,
          },
        ],
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId: booking.userId,
        },
        payment_intent_data: {
          metadata: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            userId: booking.userId,
          },
          description: `Booking #${booking.bookingNumber} at Zaine's Stay & Play`,
          receipt_email: booking.user.email || undefined,
        },
      },
      {
        idempotencyKey,
      },
    );

    return {
      mode,
      stripeObjectId: session.id,
      clientSecret: session.client_secret,
    };
  }

  const intent = await stripeLib.stripe.paymentIntents.create(
    {
      amount: stripeLib.formatAmountForStripe(booking.total),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId: booking.userId,
      },
      description: `Booking #${booking.bookingNumber} at Zaine's Stay & Play`,
      receipt_email: booking.user.email || undefined,
    },
    {
      idempotencyKey,
    },
  );

  return {
    mode,
    stripeObjectId: intent.id,
    clientSecret: intent.client_secret,
  };
}

async function resolveExistingClientSecret(
  stripePaymentId: string,
): Promise<{ clientSecret: string | null; mode: BookingPaymentMode | null }> {
  if (stripePaymentId.startsWith("cs_")) {
    const session =
      await stripeLib.stripe.checkout.sessions.retrieve(stripePaymentId);

    if ((session.status && session.status !== "open") || !session.client_secret) {
      return { clientSecret: null, mode: null };
    }

    return {
      clientSecret: session.client_secret,
      mode: "embedded_checkout",
    };
  }

  if (stripePaymentId.startsWith("pi_")) {
    const intent = await stripeLib.stripe.paymentIntents.retrieve(stripePaymentId);

    if (
      !REUSABLE_PAYMENT_INTENT_STATUSES.has(intent.status) ||
      !intent.client_secret
    ) {
      return { clientSecret: null, mode: null };
    }

    return {
      clientSecret: intent.client_secret,
      mode: "payment_element",
    };
  }

  return { clientSecret: null, mode: null };
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  try {
    const rateLimit = rateLimitedResponse({
      request,
      routeKey: "payments_setup_booking",
      route: "/api/payments/setup-booking",
      correlationId,
      limit: 20,
      windowMs: 60_000,
    });
    if (rateLimit) return rateLimit;

    if (!stripeLib.isStripeConfigured()) {
      return errorResponse({
        status: 503,
        errorCode: "PAYMENT_PROVIDER_UNAVAILABLE",
        message: "Payment processing is temporarily unavailable.",
        retryable: true,
        correlationId,
      });
    }

    let stripeKeysModeAligned = true;
    try {
      stripeKeysModeAligned =
        stripeLib.areStripeKeysModeAligned?.() ?? true;
    } catch {
      stripeKeysModeAligned = true;
    }

    if (!stripeKeysModeAligned) {
      return errorResponse({
        status: 503,
        errorCode: "PAYMENT_PROVIDER_MISCONFIGURED",
        message: "Payment processing is temporarily unavailable.",
        retryable: true,
        correlationId,
      });
    }

    if (!isDatabaseConfigured()) {
      return errorResponse({
        status: 503,
        errorCode: "PAYMENT_PERSISTENCE_UNAVAILABLE",
        message: "Payment processing is temporarily unavailable.",
        retryable: true,
        correlationId,
      });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse({
        status: 401,
        errorCode: "AUTH_REQUIRED",
        message: "Authentication required",
        retryable: false,
        correlationId,
      });
    }

    const role = (session.user as { id: string; role?: string }).role;
    const isStaffOrAdmin = !!role && ["staff", "admin"].includes(role);

    const body = await request.json();
    const validation = setupSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse({
        status: 400,
        errorCode: "PAYMENT_VALIDATION_ERROR",
        message: "Invalid payment setup data",
        retryable: false,
        correlationId,
      });
    }

    const { bookingId, preferredFlow } = validation.data;
    const booking = await setupPrisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
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

    const isOwner = booking.userId === session.user.id;
    const isEmailMatch =
      !!booking.email &&
      !!session.user.email &&
      booking.email.toLowerCase() === session.user.email.toLowerCase();
    const hasAccess = isOwner || isStaffOrAdmin || isEmailMatch;

    if (!hasAccess) {
      return errorResponse({
        status: 403,
        errorCode: "BOOKING_ACCESS_DENIED",
        message: "Unauthorized - this booking belongs to another user",
        retryable: false,
        correlationId,
      });
    }

    const existingPayment = await setupPrisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });

    if (existingPayment?.status === "succeeded") {
      return errorResponse({
        status: 409,
        errorCode: "PAYMENT_ALREADY_COMPLETED",
        message: "Payment already completed for this booking.",
        retryable: false,
        correlationId,
      });
    }

    if (existingPayment?.stripePaymentId) {
      try {
        const existing = await resolveExistingClientSecret(
          existingPayment.stripePaymentId,
        );

        if (existing.clientSecret) {
          return NextResponse.json({
            bookingId,
            paymentId: existingPayment.id,
            paymentMode: existing.mode || resolveFlowMode(preferredFlow),
            clientSecret: existing.clientSecret,
            reused: true,
          });
        }
      } catch {
        // Fall through to fresh object creation.
      }
    }

    const mode = resolveFlowMode(preferredFlow);
    const idempotencyKey = existingPayment
      ? `booking:${booking.id}:mode:${mode}:refresh:${Date.now()}`
      : `booking:${booking.id}:mode:${mode}:create`;
    const created = await createPaymentObject({ booking, mode, idempotencyKey });

    if (!created.clientSecret) {
      throw new Error("PAYMENT_SETUP_CLIENT_SECRET_MISSING");
    }

    let paymentId = existingPayment?.id;
    if (existingPayment) {
      await setupPrisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          stripePaymentId: created.stripeObjectId,
          status: "pending",
        },
      });
    } else {
      const payment = await setupPrisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.total,
          currency: "usd",
          status: "pending",
          stripePaymentId: created.stripeObjectId,
          revenueRecognitionMethod: "service_period",
          recognitionStatus: "pending_payment",
          servicePeriodStart: booking.checkInDate,
          servicePeriodEnd: booking.checkOutDate,
          deferredRevenueAmount: booking.total,
          recognizedRevenueAmount: 0,
          taxTreatment: "booking_taxable",
        },
      });
      paymentId = payment.id;
    }

    return NextResponse.json({
      bookingId,
      paymentId,
      paymentMode: created.mode,
      clientSecret: created.clientSecret,
      reused: false,
    });
  } catch (error: unknown) {
    logServerFailure(
      "/api/payments/setup-booking",
      "PAYMENT_SETUP_BOOKING_FAILED",
      correlationId,
      error,
    );
    return errorResponse({
      status: 500,
      errorCode: "PAYMENT_SETUP_BOOKING_FAILED",
      message: "Failed to initialize booking payment. Please retry.",
      retryable: true,
      correlationId,
    });
  }
}
