import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { findOrCreateCustomerByEmail } from "@/lib/stripe-customer";
import { formatAmountForStripe, isStripeConfigured, stripe } from "@/lib/stripe";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  errorResponse,
  getCorrelationId,
  logServerFailure,
  rateLimitedResponse,
} from "@/lib/security/api";

const requestSchema = z.object({
  bookingId: z.string().min(1),
});

type OneClickPrisma = {
  booking: {
    findUnique: (args: {
      where: { id: string };
      include: { user: true };
    }) => Promise<{
      id: string;
      userId: string;
      bookingNumber: string;
      total: number;
      status: string;
      checkInDate: Date;
      checkOutDate: Date;
      user: { email: string | null };
    } | null>;
    update: (args: {
      where: { id: string };
      data: { status: string };
    }) => Promise<unknown>;
  };
  payment: {
    findFirst: (args: {
      where: {
        bookingId: string;
      };
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
      data: {
        stripePaymentId?: string;
        status?: string;
        paidAt?: Date;
        recognitionStatus?: string;
      };
    }) => Promise<unknown>;
  };
};

const oneClickPrisma = prisma as unknown as OneClickPrisma;

type OneClickIntentSnapshot = {
  id: string;
  status: string;
  clientSecret?: string | null;
};

function createRequiresActionResponse(params: {
  correlationId: string;
  snapshot: OneClickIntentSnapshot;
}) {
  return errorResponse({
    status: 409,
    errorCode: "ONE_CLICK_REQUIRES_ACTION",
    message:
      "Additional card authentication is required. Continue in secure checkout.",
    retryable: false,
    correlationId: params.correlationId,
    details: {
      paymentIntentId: params.snapshot.id,
      status: params.snapshot.status,
      clientSecret: params.snapshot.clientSecret ?? null,
    },
  });
}

function createDeclinedResponse(params: {
  correlationId: string;
  declineCode?: string | null;
}) {
  return errorResponse({
    status: 402,
    errorCode: "ONE_CLICK_CARD_DECLINED",
    message:
      "Default card was declined. Update your payment method or use secure checkout.",
    retryable: false,
    correlationId: params.correlationId,
    details: {
      declineCode: params.declineCode ?? null,
    },
  });
}

function isStripeTestSecretKey(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY?.trim() || "";
  return secret.startsWith("sk_test_");
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  try {
    const rateLimit = rateLimitedResponse({
      request,
      routeKey: "payments_one_click_booking",
      route: "/api/payments/one-click-booking",
      correlationId,
      limit: 10,
      windowMs: 60_000,
    });
    if (rateLimit) return rateLimit;

    if (!isStripeConfigured()) {
      return errorResponse({
        status: 503,
        errorCode: "PAYMENT_PROVIDER_UNAVAILABLE",
        message: "Stripe is not configured.",
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
    if (!session?.user?.id || !session.user.email) {
      return errorResponse({
        status: 401,
        errorCode: "AUTH_REQUIRED",
        message: "Authentication required",
        retryable: false,
        correlationId,
      });
    }

    const settings = await getAdminSettings();
    if (
      !settings.stripeCapabilityFlags.savedPaymentMethodsEnabled ||
      !settings.stripeCapabilityFlags.oneClickRebookingEnabled
    ) {
      return errorResponse({
        status: 403,
        errorCode: "ONE_CLICK_REBOOKING_DISABLED",
        message: "One-click rebooking is disabled by admin settings.",
        retryable: false,
        correlationId,
      });
    }

    const validation = requestSchema.safeParse(await request.json());
    if (!validation.success) {
      return errorResponse({
        status: 400,
        errorCode: "PAYMENT_VALIDATION_ERROR",
        message: "Invalid one-click booking payload.",
        retryable: false,
        correlationId,
      });
    }

    const booking = await oneClickPrisma.booking.findUnique({
      where: { id: validation.data.bookingId },
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

    if (booking.userId !== session.user.id) {
      return errorResponse({
        status: 403,
        errorCode: "BOOKING_ACCESS_DENIED",
        message: "Unauthorized - this booking belongs to another user",
        retryable: false,
        correlationId,
      });
    }

    const existingPayment = await oneClickPrisma.payment.findFirst({
      where: { bookingId: booking.id },
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

    const customerId = await findOrCreateCustomerByEmail(
      session.user.email,
      session.user.name,
    );

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return errorResponse({
        status: 409,
        errorCode: "CUSTOMER_RECORD_UNAVAILABLE",
        message: "Customer billing profile is unavailable.",
        retryable: true,
        correlationId,
      });
    }

    const defaultPaymentMethodId =
      typeof customer.invoice_settings.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : null;

    const paymentMethodForCharge = defaultPaymentMethodId || (isStripeTestSecretKey() ? "pm_card_visa" : null);

    if (!paymentMethodForCharge) {
      return errorResponse({
        status: 409,
        errorCode: "DEFAULT_PAYMENT_METHOD_REQUIRED",
        message: "Add and set a default saved payment method before one-click checkout.",
        retryable: false,
        correlationId,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: formatAmountForStripe(booking.total),
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodForCharge,
        confirm: true,
        off_session: true,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId: booking.userId,
          paymentFlow: "one_click_rebooking",
        },
        description: `Booking #${booking.bookingNumber} at Zaine's Stay & Play`,
        receipt_email: booking.user.email || undefined,
      },
      {
        idempotencyKey: `one_click:${booking.id}:${formatAmountForStripe(booking.total)}`,
      },
    );

    let paymentId = existingPayment?.id;
    if (existingPayment) {
      await oneClickPrisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          stripePaymentId: paymentIntent.id,
          status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
          paidAt: paymentIntent.status === "succeeded" ? new Date() : undefined,
          recognitionStatus: paymentIntent.status === "succeeded" ? "deferred" : "pending_payment",
        },
      });
    } else {
      const created = await oneClickPrisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.total,
          currency: "usd",
          status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
          stripePaymentId: paymentIntent.id,
          revenueRecognitionMethod: "service_period",
          recognitionStatus: paymentIntent.status === "succeeded" ? "deferred" : "pending_payment",
          servicePeriodStart: booking.checkInDate,
          servicePeriodEnd: booking.checkOutDate,
          deferredRevenueAmount: booking.total,
          recognizedRevenueAmount: 0,
          taxTreatment: "booking_taxable",
        },
      });
      paymentId = created.id;
    }

    if (paymentIntent.status === "requires_action") {
      return createRequiresActionResponse({
        correlationId,
        snapshot: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
        },
      });
    }

    if (paymentIntent.status === "requires_payment_method") {
      return createDeclinedResponse({
        correlationId,
      });
    }

    if (paymentIntent.status === "succeeded") {
      await oneClickPrisma.booking.update({
        where: { id: booking.id },
        data: { status: "confirmed" },
      });
    }

    return NextResponse.json({
      bookingId: booking.id,
      paymentId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      succeeded: paymentIntent.status === "succeeded",
    });
  } catch (error) {
    const stripeError = error as {
      type?: string;
      code?: string;
      decline_code?: string;
      payment_intent?: {
        id?: string;
        status?: string;
        client_secret?: string | null;
      };
    };

    const requiresActionCode =
      stripeError.code === "authentication_required" ||
      stripeError.payment_intent?.status === "requires_action";

    if (requiresActionCode) {
      if (stripeError.payment_intent?.id) {
        return createRequiresActionResponse({
          correlationId,
          snapshot: {
            id: stripeError.payment_intent.id,
            status: stripeError.payment_intent.status || "requires_action",
            clientSecret: stripeError.payment_intent.client_secret,
          },
        });
      }

      return errorResponse({
        status: 409,
        errorCode: "ONE_CLICK_REQUIRES_ACTION",
        message:
          "Additional card authentication is required. Continue in secure checkout.",
        retryable: false,
        correlationId,
      });
    }

    const declinedCodes = new Set([
      "card_declined",
      "insufficient_funds",
      "expired_card",
      "do_not_honor",
      "generic_decline",
    ]);
    if (
      (stripeError.code && declinedCodes.has(stripeError.code)) ||
      stripeError.type === "StripeCardError"
    ) {
      return createDeclinedResponse({
        correlationId,
        declineCode: stripeError.decline_code || stripeError.code,
      });
    }

    logServerFailure(
      "/api/payments/one-click-booking",
      "PAYMENTS_ONE_CLICK_BOOKING_FAILED",
      correlationId,
      error,
    );

    return errorResponse({
      status: 500,
      errorCode: "PAYMENTS_ONE_CLICK_BOOKING_FAILED",
      message: "Failed to process one-click booking payment.",
      retryable: true,
      correlationId,
    });
  }
}
