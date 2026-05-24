import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getCorrelationId, logServerFailure } from "@/lib/api/issue26";
import { stripe, isStripeConfigured, formatAmountForStripe } from "@/lib/stripe";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { calculateBookingPrice } from "@/lib/booking/pricing";

type BookingModifyRecord = {
  id: string;
  userId: string;
  suiteId: string;
  status: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalNights: number;
  subtotal: number;
  tax: number;
  total: number;
  dropoffTimeSlot: string | null;
  pickupTimeSlot: string | null;
  suite: { tier: string } | null;
  bookingPets: Array<{ id: string }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    stripePaymentId: string | null;
  }>;
};

type ModifyRequestBody = {
  checkOutDate?: string;
  dropoffTimeSlot?: string;
  pickupTimeSlot?: string;
};

function resolveRouteParams(context: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  return Promise.resolve(context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const correlationId = getCorrelationId(request);

  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error: "Booking system is not available",
          message:
            "Database is not configured. Please set DATABASE_URL environment variable.",
        },
        { status: 400 },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await resolveRouteParams(context);

    const body = (await request.json()) as ModifyRequestBody;

    const booking = (await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        suite: { select: { tier: true } },
        bookingPets: { select: { id: true } },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            stripePaymentId: true,
          },
        },
      },
    })) as BookingModifyRecord | null;

    if (!booking || booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return NextResponse.json(
        {
          error:
            "Only pending or confirmed bookings can be modified.",
        },
        { status: 409 },
      );
    }

    const hasChange =
      body.checkOutDate !== undefined ||
      body.dropoffTimeSlot !== undefined ||
      body.pickupTimeSlot !== undefined;

    if (!hasChange) {
      return NextResponse.json(
        { error: "No changes provided." },
        { status: 400 },
      );
    }

    let newCheckOutDate = booking.checkOutDate;
    let datesChanged = false;

    if (body.checkOutDate !== undefined) {
      const proposed = new Date(body.checkOutDate);
      if (Number.isNaN(proposed.getTime())) {
        return NextResponse.json(
          { error: "Invalid checkOutDate format." },
          { status: 400 },
        );
      }
      if (proposed.getTime() <= booking.checkInDate.getTime()) {
        return NextResponse.json(
          { error: "New checkout date must be after check-in date." },
          { status: 400 },
        );
      }
      if (proposed.getTime() <= booking.checkOutDate.getTime()) {
        return NextResponse.json(
          {
            error:
              "New checkout date must be after the current checkout date. Stays can only be extended.",
          },
          { status: 400 },
        );
      }
      newCheckOutDate = proposed;
      datesChanged = true;
    }

    const newDropoffTimeSlot =
      body.dropoffTimeSlot !== undefined
        ? body.dropoffTimeSlot
        : booking.dropoffTimeSlot;
    const newPickupTimeSlot =
      body.pickupTimeSlot !== undefined
        ? body.pickupTimeSlot
        : booking.pickupTimeSlot;

    const settings = await getAdminSettings();
    const suiteType = (booking.suite?.tier ?? "standard").toLowerCase();
    const petCount = Math.max(1, booking.bookingPets.length);

    const updatedPricing = datesChanged
      ? calculateBookingPrice(
          booking.checkInDate.toISOString(),
          newCheckOutDate.toISOString(),
          suiteType,
          petCount,
          settings.pricingSettings,
        )
      : null;

    const oldTotal = booking.total;
    const newTotal = updatedPricing ? updatedPricing.total : oldTotal;
    const priceDiff = Math.round((newTotal - oldTotal) * 100) / 100;

    const newTotalNights = datesChanged
      ? Math.ceil(
          (newCheckOutDate.getTime() - booking.checkInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : booking.totalNights;

    // Charge the price difference via Stripe if payment was already taken
    let additionalPaymentIntentId: string | null = null;

    if (
      priceDiff > 0 &&
      isStripeConfigured()
    ) {
      const succeededPayment = booking.payments.find(
        (p) => p.status === "succeeded" && Boolean(p.stripePaymentId),
      );

      if (succeededPayment) {
        const currency = settings.pricingSettings.currency?.toLowerCase() ?? "usd";
        const paymentIntent = await stripe.paymentIntents.create({
          amount: formatAmountForStripe(priceDiff),
          currency,
          metadata: {
            bookingId: booking.id,
            reason: "booking_extension",
            correlationId,
          },
        });
        additionalPaymentIntentId = paymentIntent.id;

        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            stripePaymentId: paymentIntent.id,
            amount: priceDiff,
            currency,
            status: "pending",
          },
        });
      }
    }

    const updateData: {
      checkOutDate?: Date;
      totalNights?: number;
      subtotal?: number;
      tax?: number;
      total?: number;
      dropoffTimeSlot?: string | null;
      pickupTimeSlot?: string | null;
    } = {};

    if (datesChanged && updatedPricing) {
      updateData.checkOutDate = newCheckOutDate;
      updateData.totalNights = newTotalNights;
      updateData.subtotal = updatedPricing.subtotal;
      updateData.tax = updatedPricing.tax;
      updateData.total = updatedPricing.total;
    }
    if (body.dropoffTimeSlot !== undefined) {
      updateData.dropoffTimeSlot = newDropoffTimeSlot;
    }
    if (body.pickupTimeSlot !== undefined) {
      updateData.pickupTimeSlot = newPickupTimeSlot;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      priceDiff,
      additionalPaymentIntentId,
      correlationId,
    });
  } catch (error) {
    logServerFailure(
      "/api/bookings/[id]/modify",
      "BOOKING_MODIFICATION_FAILED",
      correlationId,
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to modify booking. Please try again.",
        correlationId,
      },
      { status: 500 },
    );
  }
}
