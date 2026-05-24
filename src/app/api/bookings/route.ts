import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import * as stripeLib from "@/lib/stripe";
import { sendBookingConfirmation } from "@/lib/notifications";
import {
  errorResponse,
  getCorrelationId,
  logServerFailure,
  rateLimitedResponse,
} from "@/lib/security/api";
import { logSecurityEvent } from "@/lib/security/logging";
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
import { buildBookingDateOverlapWhere } from "@/lib/booking/availability";
import { ensureDefaultSuites } from "@/lib/booking/default-suites";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { getCanonicalCapacityMap } from "@/lib/site/service-tiers";
import {
  WAIVER_CONTENT_BY_TYPE,
  getAccountWaiverExpiry,
  isAccountWaiverActive,
  type WaiverType,
} from "@/lib/health-records";

function isAbsoluteOrRootRelativeUrl(value: string): boolean {
  if (value.startsWith("/")) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const vaccineFileUrlSchema = z.string().refine(isAbsoluteOrRootRelativeUrl, {
  message: "Invalid file URL",
});

let hasLoggedStripeUnavailableWarning = false;
const shouldLogBookingDiagnostics = process.env.NODE_ENV !== "test";

type BookingPaymentMode = "payment_element" | "embedded_checkout";

const REUSABLE_PAYMENT_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
]);

function getBookingPaymentMode(): BookingPaymentMode {
  return process.env.STRIPE_BOOKING_PAYMENT_FLOW === "checkout_session"
    ? "embedded_checkout"
    : "payment_element";
}

function createBookingValidationDetails(validationError: z.ZodError): {
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

function normalizeVaccineName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sanitizeRequiredVaccineNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getVaccineAliases(value: string): string[] {
  const normalized = normalizeVaccineName(value);
  const aliases = new Set<string>([normalized]);

  if (normalized === "dhpp") {
    aliases.add("dhlpp");
    aliases.add("da2pp");
    aliases.add("dappp");
    aliases.add("distemper");
  }

  if (normalized === "bordetella") {
    aliases.add("kennelcough");
  }

  return [...aliases];
}

function vaccineNameMatchesRequirement(recordName: string, requiredName: string): boolean {
  const record = normalizeVaccineName(recordName);
  const requiredCandidates = getVaccineAliases(requiredName);

  return requiredCandidates.some(
    (required) =>
      record === required ||
      record.includes(required) ||
      required.includes(record),
  );
}

function isCurrentVaccineRecord(expiryDate: Date, referenceDate: Date): boolean {
  // Vaccine expiry values are treated as date-only values and stored at UTC midnight.
  // Compare using UTC day boundaries to avoid false negatives from local timezone shifts.
  const expiryUtcDay = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
  );
  const referenceUtcDay = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  return expiryUtcDay >= referenceUtcDay;
}

type BookingsApiPrisma = {
  $transaction: <T>(
    fn: (tx: BookingsTransactionClient) => Promise<T>,
    options?: { isolationLevel?: string; timeout?: number },
  ) => Promise<T>;
  payment: {
    findFirst: (args: {
      where: { bookingId: string };
    }) => Promise<{ id: string; stripePaymentId: string | null } | null>;
    update: (args: {
      where: { id: string };
      data: { stripePaymentId: string; status: string };
    }) => Promise<unknown>;
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
    }) => Promise<unknown>;
  };
  booking: {
    findMany: (args: {
      where: { userId: string };
      orderBy: { createdAt: "desc" | "asc" };
      include: Record<string, unknown>;
    }) => Promise<unknown[]>;
  };
  accountWaiver: {
    findMany: (args: {
      where: { userId: string };
    }) => Promise<Array<{ id: string; type: WaiverType; content: string; signature: string; signedAt: Date; expiresAt: Date | null; ipAddress: string; userAgent: string | null }>>;
    upsert: (args: Record<string, unknown>) => Promise<{ id: string; type: WaiverType; content: string; signature: string; signedAt: Date; expiresAt: Date | null; ipAddress: string; userAgent: string | null }>;
  };
  waiver: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

type BookingRecord = {
  id: string;
  subtotal: number;
  tax: number;
  total: number;
  bookingNumber: string;
  userId: string;
  checkInDate: Date;
  checkOutDate: Date;
  [key: string]: unknown;
};

type BookingsTransactionClient = {
  $executeRaw: (
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<unknown>;
  booking: {
    count: (args: Record<string, unknown>) => Promise<number>;
    create: (args: Record<string, unknown>) => Promise<BookingRecord>;
  };
  suite: {
    findFirst: (
      args: Record<string, unknown>,
    ) => Promise<{ id: string } | null>;
  };
  user: {
    findUnique: (
      args: Record<string, unknown>,
    ) => Promise<{ id: string } | null>;
    upsert: (args: Record<string, unknown>) => Promise<{ id: string }>;
    create: (args: Record<string, unknown>) => Promise<{ id: string }>;
  };
  pet: {
    findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string }>>;
    create: (args: Record<string, unknown>) => Promise<{ id: string }>;
  };
  customerPackage: {
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  accountWaiver: {
    findMany: (args: Record<string, unknown>) => Promise<Array<{
      id: string;
      userId: string;
      type: string;
      content: string;
      signature: string;
      signedAt: Date;
      expiresAt: Date | null;
      ipAddress: string;
      userAgent: string | null;
    }>>;
    upsert: (args: Record<string, unknown>) => Promise<{
      id: string;
      content: string;
      signature: string;
      signedAt: Date;
      expiresAt: Date | null;
      ipAddress: string;
      userAgent: string | null;
    }>;
  };
  waiver: {
    create: (args: Record<string, unknown>) => Promise<{ id: string }>;
  };
};

const bookingsPrisma = prisma as unknown as BookingsApiPrisma;

async function resolveBookingUserId(
  tx: BookingsTransactionClient,
  session: { user?: { id?: string | null } | null } | null,
  data: z.infer<typeof bookingSchema>,
): Promise<string> {
  if (session?.user?.id) {
    const existingUser = await tx.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (existingUser?.id) {
      return existingUser.id;
    }

    throw new Error("BOOKING_USER_NOT_FOUND");
  }

  const existingGuest = await tx.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existingGuest?.id) {
    return existingGuest.id;
  }

  const guestUser = await tx.user.create({
    data: {
      id: randomUUID(),
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone,
    },
    select: { id: true },
  });

  return guestUser.id;
}

const bookingSchema = z.object({
  checkIn: z.string(),
  checkOut: z.string(),
  dropoffTimeSlot: z.string().optional(),
  pickupTimeSlot: z.string().optional(),
  suiteType: z.enum(["standard", "deluxe", "luxury"]),
  petCount: z.number().min(1).max(5),
  petIds: z.array(z.string()).optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  petNames: z.string().min(1, "Pet name(s) required"),
  specialRequests: z.string().optional(),
  addOns: z
    .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
    .optional(),
  newPets: z
    .array(
      z.object({
        name: z.string().min(1),
        breed: z.string().min(1),
        age: z.number().min(0),
        weight: z.number().min(1),
        gender: z.enum(["male", "female"]),
        temperament: z.string().optional(),
        specialNeeds: z.string().optional(),
        feedingInstructions: z.string().optional(),
      }),
    )
    .optional(),
  vaccines: z
    .array(
      z.object({
        petId: z.string(),
        fileUrl: vaccineFileUrlSchema,
        fileName: z.string(),
      }),
    )
    .optional(),
  waiver: z.object({
    liabilityAccepted: z.boolean(),
    medicalAuthorizationAccepted: z.boolean(),
    photoReleaseAccepted: z.boolean(),
    policyAcknowledgmentAccepted: z.boolean(),
    signature: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim().length === 0
          ? undefined
          : value,
      z.string().min(10).optional(),
    ),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
  reuseExistingWaivers: z.boolean().optional().default(true),
}).superRefine((data, context) => {
  const reuseExistingWaivers = data.reuseExistingWaivers !== false;

  if (reuseExistingWaivers) {
    return;
  }

  if (!data.waiver.liabilityAccepted) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Liability waiver must be accepted",
      path: ["waiver", "liabilityAccepted"],
    });
  }

  if (!data.waiver.medicalAuthorizationAccepted) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Medical authorization must be accepted",
      path: ["waiver", "medicalAuthorizationAccepted"],
    });
  }

  if (!data.waiver.photoReleaseAccepted) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Photo release must be accepted",
      path: ["waiver", "photoReleaseAccepted"],
    });
  }

  if (!data.waiver.policyAcknowledgmentAccepted) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Policy acknowledgment must be accepted",
      path: ["waiver", "policyAcknowledgmentAccepted"],
    });
  }

  if (!data.waiver.signature) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Signature is required",
      path: ["waiver", "signature"],
    });
  }
});

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);

  await ensureDefaultSuites();

  try {
    const rateLimit = rateLimitedResponse({
      request,
      routeKey: "bookings_create",
      route: "/api/bookings",
      correlationId,
      limit: 12,
      windowMs: 60_000,
    });
    if (rateLimit) return rateLimit;

    // Check if database is configured
    if (!isDatabaseConfigured()) {
      return errorResponse({
        status: 503,
        errorCode: "BOOKING_PERSISTENCE_UNAVAILABLE",
        message: "Booking system is temporarily unavailable.",
        retryable: true,
        correlationId,
      });
    }

    // Check if user is authenticated
    const session = await auth();

    const body = await request.json();
    const validation = bookingSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse({
        status: 400,
        errorCode: "BOOKING_VALIDATION_ERROR",
        message: "Invalid booking data",
        retryable: false,
        correlationId,
        details: createBookingValidationDetails(validation.error),
      });
    }

    const data = validation.data;
    const adminSettings = await getAdminSettings();
    const selectedPetIds = [...new Set((data.petIds ?? []).filter(Boolean))];

    if (selectedPetIds.length > 0) {
      const requiredVaccines =
        sanitizeRequiredVaccineNames(
          adminSettings.requiredVaccineSettings?.requiredVaccines,
        );

      const blockOnExpiredVaccines =
        adminSettings.requiredVaccineSettings?.blockBookingsOnExpiredVaccines !==
        false;

      const petRecords = await prisma.pet.findMany({
        where: {
          id: { in: selectedPetIds },
          userId: session?.user?.id ?? undefined,
        },
        select: {
          id: true,
          name: true,
          vaccines: {
            select: {
              name: true,
              expiryDate: true,
            },
          },
        },
      });

      if (petRecords.length !== selectedPetIds.length) {
        return errorResponse({
          status: 400,
          errorCode: 'BOOKING_PET_SELECTION_INVALID',
          message: 'One or more selected pets are invalid for this account.',
          retryable: false,
          correlationId,
        });
      }

      const now = new Date();
      if (blockOnExpiredVaccines && requiredVaccines.length > 0) {
        const invalidPets = petRecords
          .map((pet) => {
            const missingRequiredVaccines: string[] = [];
            const expiredRequiredVaccines: string[] = [];

            for (const requiredVaccine of requiredVaccines) {
              const matchingRecords = pet.vaccines.filter((record) =>
                vaccineNameMatchesRequirement(record.name, requiredVaccine),
              );

              if (matchingRecords.length === 0) {
                missingRequiredVaccines.push(requiredVaccine);
                continue;
              }

              const hasCurrentRecord = matchingRecords.some((record) =>
                isCurrentVaccineRecord(new Date(record.expiryDate), now),
              );

              if (!hasCurrentRecord) {
                expiredRequiredVaccines.push(requiredVaccine);
              }
            }

            if (
              missingRequiredVaccines.length === 0 &&
              expiredRequiredVaccines.length === 0
            ) {
              return null;
            }

            return {
              id: pet.id,
              name: pet.name,
              missingRequiredVaccines,
              expiredRequiredVaccines,
            };
          })
          .filter((pet): pet is NonNullable<typeof pet> => pet !== null);

        if (invalidPets.length > 0) {
          return errorResponse({
            status: 409,
            errorCode: 'BOOKING_REQUIRES_CURRENT_VACCINES',
            message:
              'Some selected pets need updated vaccine records before booking can continue.',
            retryable: false,
            correlationId,
            details: {
              petIds: invalidPets.map((pet) => pet.id),
              pets: invalidPets,
              requiredVaccines,
              resolutionPath: '/dashboard/records',
              resolutionMessage:
                'Update vaccine records in your dashboard, then return to complete this booking.',
            },
          });
        }
      }
    }

    if ((data.newPets ?? []).length > 0) {
      const vaccineRecordsByPetId = new Set(
        (data.vaccines ?? [])
          .map((record) => record.petId)
          .filter((petId) => typeof petId === "string" && petId.length > 0),
      );
      const missingVaccinePetIds = (data.newPets ?? [])
        .map((_, index) => `new-${index}`)
        .filter((petId) => !vaccineRecordsByPetId.has(petId));
      const missingNewPetDetails = missingVaccinePetIds.map((petId) => {
        const index = Number.parseInt(petId.replace("new-", ""), 10);
        const newPet = Number.isNaN(index) ? null : data.newPets?.[index];
        return {
          id: petId,
          name: newPet?.name ?? `New Pet ${index + 1}`,
          missingRequiredVaccines:
            sanitizeRequiredVaccineNames(
              adminSettings.requiredVaccineSettings?.requiredVaccines,
            ),
          expiredRequiredVaccines: [],
        };
      });

      if (missingVaccinePetIds.length > 0) {
        return errorResponse({
          status: 409,
          errorCode: 'BOOKING_REQUIRES_CURRENT_VACCINES',
          message:
            'One or more newly added pets are missing vaccine records required to book.',
          retryable: false,
          correlationId,
          details: {
            petIds: missingVaccinePetIds,
            pets: missingNewPetDetails,
            requiredVaccines: sanitizeRequiredVaccineNames(
              adminSettings.requiredVaccineSettings?.requiredVaccines,
            ),
            resolutionPath: '/book?step=pets',
            resolutionMessage:
              'Upload vaccine records for each new pet, then continue checkout.',
          },
        });
      }
    }

    const minNights = Math.max(
      1,
      adminSettings.availabilityRules.minNightsPerBooking,
    );
    const maxNights = Math.max(
      minNights,
      adminSettings.availabilityRules.maxNightsPerBooking,
    );

    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);
    const totalNights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (!Number.isFinite(totalNights) || totalNights < 1) {
      return errorResponse({
        status: 400,
        errorCode: "INVALID_DATE_RANGE",
        message: "Check-out must be after check-in.",
        retryable: false,
        correlationId,
      });
    }

    if (totalNights < minNights) {
      return errorResponse({
        status: 400,
        errorCode: "INVALID_STAY_LENGTH",
        message: `Minimum stay is ${minNights} night${minNights === 1 ? "" : "s"}.`,
        retryable: false,
        correlationId,
      });
    }

    if (totalNights > maxNights) {
      return errorResponse({
        status: 400,
        errorCode: "INVALID_STAY_LENGTH",
        message: `Maximum stay is ${maxNights} night${maxNights === 1 ? "" : "s"}.`,
        retryable: false,
        correlationId,
      });
    }

    // Calculate pricing
    const basePricing = calculateBookingPrice(
      data.checkIn,
      data.checkOut,
      data.suiteType,
      data.petCount,
      adminSettings.pricingSettings,
      undefined,
      adminSettings.holidaySurcharges,
    );
    const packageRedemption = await getEligiblePackageRedemption(
      session?.user?.id,
      basePricing.subtotal,
    );
    const pricing = packageRedemption
      ? applyPackageCreditToPricing(basePricing, packageRedemption.creditAmount)
      : { ...basePricing, packageCredit: 0 };

    // Prepare booking number outside transaction
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const bookingNumber = `PB-${dateStr}-${randomNum}`;

    // Suite capacity configuration
    const configuredCapacities = getCanonicalCapacityMap(
      adminSettings.serviceSettings.serviceTiers,
    );
    const capacity = {
      standard: configuredCapacities.standard ?? 0,
      deluxe: configuredCapacities.deluxe ?? 0,
      luxury: configuredCapacities.luxury ?? 0,
    };

    // Log advisory lock acquisition
    if (shouldLogBookingDiagnostics) {
      logSecurityEvent({
        route: "/api/bookings",
        event: "BOOKING_ADVISORY_LOCK_ATTEMPT",
        correlationId,
        context: {
          suiteType: data.suiteType,
          checkInDate: checkInDate.toISOString(),
        },
      });
    }

    // Wrap booking creation in transaction with advisory lock
    const booking = await bookingsPrisma.$transaction(
      async (tx) => {
        // 1. Acquire PostgreSQL advisory lock for this suite type + date range
        // This ensures only one request can check capacity and create a booking at a time
        // for the same suite type and check-in date combination
        await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${data.suiteType}::text || ${checkInDate.toISOString()}::text)
        )
      `;

        if (shouldLogBookingDiagnostics) {
          logSecurityEvent({
            route: "/api/bookings",
            event: "BOOKING_ADVISORY_LOCK_ACQUIRED",
            correlationId,
            context: {
              suiteType: data.suiteType,
              checkInDate: checkInDate.toISOString(),
            },
          });
        }

        // Log capacity check
        if (shouldLogBookingDiagnostics) {
          logSecurityEvent({
            route: "/api/bookings",
            event: "BOOKING_CAPACITY_CHECK",
            correlationId,
            context: { suiteType: data.suiteType },
          });
        }
        const overlappingBookings = await tx.booking.count({
          where: {
            suite: {
              tier: {
                equals: data.suiteType,
                mode: "insensitive",
              },
            },
            status: {
              in: ["confirmed", "checked_in"],
            },
            ...buildBookingDateOverlapWhere(checkInDate, checkOutDate),
          },
        });

        if (shouldLogBookingDiagnostics) {
          logSecurityEvent({
            route: "/api/bookings",
            event: "BOOKING_OVERLAP_COUNT",
            correlationId,
            context: { overlappingBookings },
          });
        }

        // 3. Enforce capacity limit
        if (overlappingBookings >= capacity[data.suiteType]) {
          if (shouldLogBookingDiagnostics) {
            logServerFailure(
              "/api/bookings",
              "BOOKING_CAPACITY_EXCEEDED",
              correlationId,
              new Error(`Capacity exceeded for suite type ${data.suiteType}`),
            );
          }
          throw new Error("CAPACITY_EXCEEDED");
        }

        // 4. Find an available suite of the requested tier
        const availableSuite = await tx.suite.findFirst({
          where: {
            tier: {
              equals: data.suiteType,
              mode: "insensitive",
            },
            isActive: true,
          },
        });

        if (!availableSuite) {
          if (shouldLogBookingDiagnostics) {
            logServerFailure(
              "/api/bookings",
              "BOOKING_NO_SUITE_AVAILABLE",
              correlationId,
              new Error(`No available suite for ${data.suiteType}`),
            );
          }
          throw new Error("NO_SUITE_AVAILABLE");
        }

        if (shouldLogBookingDiagnostics) {
          logSecurityEvent({
            route: "/api/bookings",
            event: "BOOKING_AVAILABLE_SUITE_FOUND",
            correlationId,
            context: { suiteId: availableSuite.id },
          });
        }

        // 5. Create or find user inside transaction
        const userId = await resolveBookingUserId(tx, session, data);

        const now = new Date();
        const reuseExistingWaivers = data.reuseExistingWaivers !== false;
        const supportsWaiverPersistence =
          typeof tx.accountWaiver?.findMany === "function" &&
          typeof tx.accountWaiver?.upsert === "function" &&
          typeof tx.waiver?.create === "function";

        const existingAccountWaivers = supportsWaiverPersistence
          ? await tx.accountWaiver.findMany({
              where: { userId },
            })
          : [];
        const bookingWaivers: Array<{
          accountWaiverId: string | null;
          type: WaiverType;
          content: string;
          signature: string;
          signedAt: Date;
          appliedAt: Date;
          sourceType: 'auto_applied' | 'new_signature';
          ipAddress: string;
          userAgent: string | null;
        }> = [];

        for (const type of ["liability", "medical", "photo_release"] as WaiverType[]) {
          if (!supportsWaiverPersistence) {
            continue;
          }

          const existing = existingAccountWaivers.find((waiver) => waiver.type === type);

          if (reuseExistingWaivers && existing && isAccountWaiverActive(existing)) {
            bookingWaivers.push({
              accountWaiverId: existing.id,
              type,
              content: existing.content,
              signature: existing.signature,
              signedAt: existing.signedAt,
              appliedAt: now,
              sourceType: 'auto_applied',
              ipAddress: existing.ipAddress,
              userAgent: existing.userAgent,
            });
            continue;
          }

          if (!data.waiver.signature) {
            throw new Error('Waiver signature is required when no active waiver is on file');
          }

          const accountWaiver = await tx.accountWaiver.upsert({
            where: {
              userId_type: {
                userId,
                type,
              },
            },
            create: {
              userId,
              type,
              content: WAIVER_CONTENT_BY_TYPE[type],
              signature: data.waiver.signature,
              signedAt: now,
              expiresAt: getAccountWaiverExpiry(type, now),
              ipAddress:
                data.waiver.ipAddress ?? request.headers.get('x-forwarded-for') ?? 'unknown',
              userAgent: data.waiver.userAgent ?? request.headers.get('user-agent'),
            },
            update: {
              content: WAIVER_CONTENT_BY_TYPE[type],
              signature: data.waiver.signature,
              signedAt: now,
              expiresAt: getAccountWaiverExpiry(type, now),
              ipAddress:
                data.waiver.ipAddress ?? request.headers.get('x-forwarded-for') ?? 'unknown',
              userAgent: data.waiver.userAgent ?? request.headers.get('user-agent'),
            },
          });

          bookingWaivers.push({
            accountWaiverId: accountWaiver.id,
            type,
            content: accountWaiver.content,
            signature: accountWaiver.signature,
            signedAt: accountWaiver.signedAt,
            appliedAt: now,
            sourceType: 'new_signature',
            ipAddress: accountWaiver.ipAddress,
            userAgent: accountWaiver.userAgent,
          });
        }

        const linkedPetIds: string[] = [];

        if (selectedPetIds.length > 0) {
          const existingPets = await tx.pet.findMany({
            where: {
              id: { in: selectedPetIds },
              userId,
            },
            select: { id: true },
          });

          if (existingPets.length !== selectedPetIds.length) {
            throw new Error("BOOKING_PET_SELECTION_INVALID");
          }

          linkedPetIds.push(...existingPets.map((pet) => pet.id));
        }

        if ((data.newPets ?? []).length > 0) {
          const createdPets = await Promise.all(
            (data.newPets ?? []).map((pet) =>
              tx.pet.create({
                data: {
                  userId,
                  name: pet.name,
                  breed: pet.breed,
                  age: pet.age,
                  weight: pet.weight,
                  gender: pet.gender,
                  temperament: pet.temperament,
                  specialNeeds: pet.specialNeeds,
                  feedingInstructions: pet.feedingInstructions,
                },
                select: { id: true },
              }),
            ),
          );

          linkedPetIds.push(...createdPets.map((pet) => pet.id));
        }

        // 6. Create booking atomically
        const createdBooking = await tx.booking.create({
          data: {
            userId,
            suiteId: availableSuite.id,
            packageId: packageRedemption?.packageId || null,
            bookingNumber,
            checkInDate,
            checkOutDate,
            dropoffTimeSlot: data.dropoffTimeSlot || null,
            pickupTimeSlot: data.pickupTimeSlot || null,
            totalNights,
            subtotal: pricing.subtotal,
            tax: pricing.tax,
            total: pricing.total,
            status: "pending",
            specialRequests: data.specialRequests || null,
            bookingPets:
              linkedPetIds.length > 0
                ? {
                    create: linkedPetIds.map((petId) => ({ petId })),
                  }
                : undefined,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            suite: {
              select: {
                id: true,
                name: true,
                tier: true,
                pricePerNight: true,
              },
            },
          },
        });

        if (packageRedemption) {
          await tx.customerPackage.update({
            where: { id: packageRedemption.customerPackageId },
            data: {
              sessionsUsed: { increment: 1 },
              sessionsRemaining: packageRedemption.sessionsRemainingAfter,
              status:
                packageRedemption.sessionsRemainingAfter <= 0
                  ? 'fully_used'
                  : 'active',
            },
          });
        }

        if (supportsWaiverPersistence) {
          await Promise.all(
            bookingWaivers.map((waiver) =>
              tx.waiver.create({
                data: {
                  bookingId: createdBooking.id,
                  accountWaiverId: waiver.accountWaiverId,
                  type: waiver.type,
                  content: waiver.content,
                  signature: waiver.signature,
                  signedAt: waiver.signedAt,
                  appliedAt: waiver.appliedAt,
                  sourceType: waiver.sourceType,
                  ipAddress: waiver.ipAddress,
                  userAgent: waiver.userAgent,
                },
              }),
            ),
          );
        }

        return createdBooking;
      },
      {
        isolationLevel: "Serializable",
        timeout: 20000, // Increased timeout to 20 seconds
      },
    );

    // Send confirmation email (Resend if configured, otherwise record to dev queue)
    try {
      await sendBookingConfirmation(booking);
    } catch (err) {
      logServerFailure(
        "/api/bookings",
        "BOOKING_NOTIFICATION_FAILED",
        correlationId,
        err,
      );
    }

    const stripeConfigured = stripeLib.isStripeConfigured();

    if (!stripeConfigured) {
      if (
        process.env.NODE_ENV !== "test" &&
        !hasLoggedStripeUnavailableWarning
      ) {
          logSecurityEvent({
            route: "/api/bookings",
            event: "BOOKING_STRIPE_UNAVAILABLE",
            correlationId,
            level: "warn",
          });
        hasLoggedStripeUnavailableWarning = true;
      }
    }

    let stripeKeysModeAligned = true;
    try {
      stripeKeysModeAligned =
        stripeLib.areStripeKeysModeAligned?.() ?? true;
    } catch {
      stripeKeysModeAligned = true;
    }

    if (stripeConfigured && !stripeKeysModeAligned) {
      return errorResponse({
        status: 503,
        errorCode: "PAYMENT_PROVIDER_MISCONFIGURED",
        message: "Payment processing is temporarily unavailable.",
        retryable: true,
        correlationId,
      });
    }

    // Create Stripe payment session if Stripe is configured
    let clientSecret: string | undefined;
    let paymentMode: BookingPaymentMode = "payment_element";
    if (stripeConfigured) {
      try {
        paymentMode = getBookingPaymentMode();

        // Check if payment already exists for this booking (idempotency)
        const existingPayment = await bookingsPrisma.payment.findFirst({
          where: {
            bookingId: booking.id,
          },
        });

        if (!existingPayment) {
          if (paymentMode === "embedded_checkout") {
            const checkoutSession = await stripeLib.stripe.checkout.sessions.create({
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
                receipt_email: data.email,
              },
            }, {
              idempotencyKey: `booking:${booking.id}:mode:embedded_checkout`,
            });

            await bookingsPrisma.payment.create({
              data: {
                bookingId: booking.id,
                amount: booking.total,
                currency: "usd",
                status: "pending",
                stripePaymentId: checkoutSession.id,
                revenueRecognitionMethod: "service_period",
                recognitionStatus: "pending_payment",
                servicePeriodStart: booking.checkInDate,
                servicePeriodEnd: booking.checkOutDate,
                deferredRevenueAmount: booking.total,
                recognizedRevenueAmount: 0,
                taxTreatment: "booking_taxable",
              },
            });

            clientSecret = checkoutSession.client_secret || undefined;
          } else {
            const paymentIntent = await stripeLib.stripe.paymentIntents.create({
              amount: stripeLib.formatAmountForStripe(booking.total),
              currency: "usd",
              automatic_payment_methods: { enabled: true },
              metadata: {
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                userId: booking.userId,
              },
              description: `Booking #${booking.bookingNumber} at Zaine's Stay & Play`,
              receipt_email: data.email,
            }, {
              idempotencyKey: `booking:${booking.id}:mode:payment_element`,
            });

            await bookingsPrisma.payment.create({
              data: {
                bookingId: booking.id,
                amount: booking.total,
                currency: "usd",
                status: "pending",
                stripePaymentId: paymentIntent.id,
                revenueRecognitionMethod: "service_period",
                recognitionStatus: "pending_payment",
                servicePeriodStart: booking.checkInDate,
                servicePeriodEnd: booking.checkOutDate,
                deferredRevenueAmount: booking.total,
                recognizedRevenueAmount: 0,
                taxTreatment: "booking_taxable",
              },
            });

            clientSecret = paymentIntent.client_secret || undefined;
          }
        } else if (existingPayment.stripePaymentId) {
          if (existingPayment.stripePaymentId.startsWith("cs_")) {
            const existingSession = await stripeLib.stripe.checkout.sessions.retrieve(
              existingPayment.stripePaymentId,
            );

            if (
              existingSession.status === "open" &&
              existingSession.client_secret
            ) {
              paymentMode = "embedded_checkout";
              clientSecret = existingSession.client_secret;
            } else {
              const refreshedSession = await stripeLib.stripe.checkout.sessions.create({
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
                  receipt_email: data.email,
                },
              }, {
                idempotencyKey: `booking:${booking.id}:mode:embedded_checkout:refresh:${Date.now()}`,
              });

              await bookingsPrisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                  stripePaymentId: refreshedSession.id,
                  status: "pending",
                },
              });

              paymentMode = "embedded_checkout";
              clientSecret = refreshedSession.client_secret || undefined;
            }
          } else if (existingPayment.stripePaymentId.startsWith("pi_")) {
            const existingIntent = await stripeLib.stripe.paymentIntents.retrieve(
              existingPayment.stripePaymentId,
            );

            if (
              REUSABLE_PAYMENT_INTENT_STATUSES.has(existingIntent.status) &&
              existingIntent.client_secret
            ) {
              paymentMode = "payment_element";
              clientSecret = existingIntent.client_secret;
            } else {
              const refreshedIntent = await stripeLib.stripe.paymentIntents.create({
                amount: stripeLib.formatAmountForStripe(booking.total),
                currency: "usd",
                automatic_payment_methods: { enabled: true },
                metadata: {
                  bookingId: booking.id,
                  bookingNumber: booking.bookingNumber,
                  userId: booking.userId,
                },
                description: `Booking #${booking.bookingNumber} at Zaine's Stay & Play`,
                receipt_email: data.email,
              }, {
                idempotencyKey: `booking:${booking.id}:mode:payment_element:refresh:${Date.now()}`,
              });

              await bookingsPrisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                  stripePaymentId: refreshedIntent.id,
                  status: "pending",
                },
              });

              paymentMode = "payment_element";
              clientSecret = refreshedIntent.client_secret || undefined;
            }
          }
        }
      } catch (error) {
        logServerFailure(
          "/api/bookings",
          "BOOKING_PAYMENT_INTENT_FAILED",
          correlationId,
          error,
        );
        // Don't fail booking if payment creation fails
      }
    }

    const responseSubtotal =
      typeof booking.subtotal === "number"
        ? booking.subtotal
        : pricing.subtotal;
    const responseTax =
      typeof booking.tax === "number" ? booking.tax : pricing.tax;
    const responseTotal =
      Math.round((responseSubtotal + responseTax) * 100) / 100;

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          checkIn: booking.checkInDate,
          checkOut: booking.checkOutDate,
          suite: booking.suite,
          total: booking.total,
          status: booking.status,
        },
        pricing: {
          subtotal: responseSubtotal,
          tax: responseTax,
          total: responseTotal,
          packageCredit: pricing.packageCredit,
          holidaySurchargeTotal: basePricing.holidaySurchargeTotal,
          appliedHolidaySurcharges: basePricing.appliedHolidaySurcharges,
          appliedPackage: packageRedemption
            ? {
                packageId: packageRedemption.packageId,
                packageName: packageRedemption.packageName,
                customerPackageId: packageRedemption.customerPackageId,
              }
            : null,
          currency:
            adminSettings.pricingSettings?.currency || BOOKING_PRICING_CURRENCY,
          pricingModelLabel: BOOKING_PRICING_MODEL_LABEL,
          disclosure:
            adminSettings.trustCopySettings?.pricingDisclosure ||
            BOOKING_PRICING_DISCLOSURE,
        },
        payment: clientSecret ? { clientSecret, mode: paymentMode } : undefined,
        message: clientSecret
          ? "Booking created. Please complete payment."
          : "Booking created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    logServerFailure(
      "/api/bookings",
      "BOOKING_CREATE_FAILED",
      correlationId,
      error,
    );

    // Handle custom business logic errors
    if (error instanceof Error) {
      if (error.message === "CAPACITY_EXCEEDED") {
        return errorResponse({
          status: 409,
          errorCode: "CAPACITY_EXCEEDED",
          message: "Selected suite type is not available for these dates",
          retryable: false,
          correlationId,
        });
      }

      if (error.message === "NO_SUITE_AVAILABLE") {
        return errorResponse({
          status: 404,
          errorCode: "NO_SUITE_AVAILABLE",
          message: "No suites available for the selected tier",
          retryable: false,
          correlationId,
        });
      }

      if (error.message === "BOOKING_PET_SELECTION_INVALID") {
        return errorResponse({
          status: 400,
          errorCode: "BOOKING_PET_SELECTION_INVALID",
          message: "One or more selected pets are invalid for this account.",
          retryable: false,
          correlationId,
        });
      }

      // Handle transaction timeout
      if (
        error.message.includes("timeout") ||
        error.message.includes("timed out")
      ) {
        return errorResponse({
          status: 503,
          errorCode: "TIMEOUT",
          message: "High server load. Please retry in a few seconds.",
          retryable: true,
          correlationId,
          headers: { "Retry-After": "5" },
        });
      }
    }

    // Handle Prisma transaction errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };

      // P2034: Transaction conflict (serialization failure, deadlock)
      if (prismaError.code === "P2034") {
        return errorResponse({
          status: 409,
          errorCode: "TRANSACTION_CONFLICT",
          message: "Booking conflict detected. Please retry your request.",
          retryable: true,
          correlationId,
          headers: { "Retry-After": "3" },
        });
      }
    }

    // Generic error fallback
    return errorResponse({
      status: 500,
      errorCode: "BOOKING_CREATE_FAILED",
      message: "Failed to create booking. Please try again.",
      retryable: true,
      correlationId,
    });
  }
}

// GET /api/bookings - Get user's bookings
export async function GET() {
  try {
    // Check if database is configured
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

    const bookings = await bookingsPrisma.booking.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        suite: {
          select: {
            name: true,
            tier: true,
            pricePerNight: true,
          },
        },
        bookingPets: {
          include: {
            pet: true,
          },
        },
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    logServerFailure(
      "/api/bookings",
      "BOOKINGS_FETCH_FAILED",
      "booking-list",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}
