import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createPublicErrorEnvelope,
  getCorrelationId,
  logServerFailure,
  parseDate,
} from "@/lib/api/issue26";
import {
  BOOKING_PRICING_CURRENCY,
  BOOKING_PRICING_DISCLOSURE,
  BOOKING_PRICING_MODEL_LABEL,
  calculateBookingPrice,
} from "@/lib/booking/pricing";
import {
  applyPackageCreditToPricing,
  getEligiblePackageRedemption,
} from "@/lib/booking/package-redemption";
import { getAdminSettings } from "@/lib/api/admin-settings";

const bookingValidationSchema = z.object({
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  suiteType: z.enum(["standard", "deluxe", "luxury"]),
  petCount: z.number().int().min(1).max(5),
});

function createValidationDetails(validationError: z.ZodError): {
  fields: string[];
} {
  const fields = validationError.issues
    .map((issue) => issue.path.join("."))
    .filter((field) => field.length > 0);

  const uniqueSortedFields = [...new Set(fields)].sort((left, right) =>
    left.localeCompare(right),
  );

  return { fields: uniqueSortedFields };
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      createPublicErrorEnvelope({
        errorCode: "BOOKING_VALIDATION_ERROR",
        message: "Invalid booking data.",
        retryable: false,
        correlationId,
      }),
      { status: 400 },
    );
  }

  const validation = bookingValidationSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        ...createPublicErrorEnvelope({
          errorCode: "BOOKING_VALIDATION_ERROR",
          message: "Invalid booking data.",
          retryable: false,
          correlationId,
        }),
        details: createValidationDetails(validation.error),
      },
      { status: 400 },
    );
  }

  const { checkIn, checkOut, suiteType, petCount } = validation.data;
  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);

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
    const session = await auth();
    const settings = await getAdminSettings();
    const totalNights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const minNights = Math.max(
      1,
      settings.availabilityRules.minNightsPerBooking,
    );
    const maxNights = Math.max(
      minNights,
      settings.availabilityRules.maxNightsPerBooking,
    );

    if (totalNights < minNights) {
      return NextResponse.json(
        createPublicErrorEnvelope({
          errorCode: "INVALID_STAY_LENGTH",
          message: `Minimum stay is ${minNights} night${minNights === 1 ? "" : "s"}.`,
          retryable: false,
          correlationId,
        }),
        { status: 400 },
      );
    }

    if (totalNights > maxNights) {
      return NextResponse.json(
        createPublicErrorEnvelope({
          errorCode: "INVALID_STAY_LENGTH",
          message: `Maximum stay is ${maxNights} night${maxNights === 1 ? "" : "s"}.`,
          retryable: false,
          correlationId,
        }),
        { status: 400 },
      );
    }

    const pricing = calculateBookingPrice(
      checkIn,
      checkOut,
      suiteType,
      petCount,
      settings.pricingSettings,
    );
    const packageRedemption = await getEligiblePackageRedemption(
      session?.user?.id,
      pricing.subtotal,
    );
    const adjustedPricing = packageRedemption
      ? applyPackageCreditToPricing(pricing, packageRedemption.creditAmount)
      : { ...pricing, packageCredit: 0 };

    return NextResponse.json(
      {
        valid: true,
        pricing: {
          subtotal: adjustedPricing.subtotal,
          tax: adjustedPricing.tax,
          total: adjustedPricing.total,
          packageCredit: adjustedPricing.packageCredit,
          appliedPackage: packageRedemption
            ? {
                packageId: packageRedemption.packageId,
                packageName: packageRedemption.packageName,
                customerPackageId: packageRedemption.customerPackageId,
              }
            : null,
          currency: settings.pricingSettings.currency || BOOKING_PRICING_CURRENCY,
          pricingModelLabel: BOOKING_PRICING_MODEL_LABEL,
          disclosure:
            settings.trustCopySettings.pricingDisclosure ||
            BOOKING_PRICING_DISCLOSURE,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logServerFailure(
      "/api/bookings/validate",
      "BOOKING_VALIDATE_FAILED",
      correlationId,
      error,
    );

    return NextResponse.json(
      createPublicErrorEnvelope({
        errorCode: "BOOKING_VALIDATE_FAILED",
        message: "Unable to validate booking pricing right now. Please retry.",
        retryable: true,
        correlationId,
      }),
      { status: 503 },
    );
  }
}
