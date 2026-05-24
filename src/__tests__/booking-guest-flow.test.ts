import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => {
  const createdPets: Array<{ id: string }> = [];

  const mock = {
    $transaction: vi.fn(async (callback: (tx: Record<string, any>) => Promise<unknown>) => {
      const tx = {
        $executeRaw: vi.fn(async () => undefined),
        booking: {
          count: vi.fn(async () => 0),
          create: vi.fn(async (args: Record<string, any>) => ({
            id: "booking-guest-001",
            bookingNumber: "PB-20260524-0001",
            checkInDate: new Date("2026-06-10T00:00:00.000Z"),
            checkOutDate: new Date("2026-06-13T00:00:00.000Z"),
            subtotal: 255,
            tax: 25.5,
            total: 280.5,
            status: "pending",
            userId: "user-guest-001",
            suite: {
              id: "suite-deluxe-1",
              name: "Deluxe Suite",
              tier: "deluxe",
              pricePerNight: 85,
            },
            ...args.data,
          })),
        },
        suite: {
          findFirst: vi.fn(async () => ({ id: "suite-deluxe-1" })),
        },
        user: {
          findUnique: vi.fn(async () => null),
          upsert: vi.fn(async () => ({ id: "user-guest-001" })),
        },
        pet: {
          create: vi.fn(async () => {
            const pet = { id: `pet-${createdPets.length + 1}` };
            createdPets.push(pet);
            return pet;
          }),
        },
        accountWaiver: {
          findMany: vi.fn(async () => []),
          upsert: vi.fn(async ({ create }: Record<string, any>) => ({
            id: `waiver-${create.type}`,
            content: create.content,
            signature: create.signature,
            signedAt: create.signedAt,
            expiresAt: create.expiresAt,
            ipAddress: create.ipAddress,
            userAgent: create.userAgent,
          })),
        },
        waiver: {
          create: vi.fn(async () => ({ id: "booking-waiver-001" })),
        },
      };

      return callback(tx);
    }),
    payment: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "payment-001" })),
    },
    booking: {
      findMany: vi.fn(async () => []),
    },
    pet: {
      findMany: vi.fn(async () => []),
    },
    customerPackage: {
      update: vi.fn(async () => undefined),
    },
  };

  return { prismaMock: mock };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/notifications", () => ({
  sendBookingConfirmation: vi.fn(async () => undefined),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: null,
  formatAmountForStripe: vi.fn((amount: number) => Math.round(amount * 100)),
  isStripeConfigured: vi.fn(() => false),
}));

vi.mock("@/lib/api/admin-settings", () => ({
  getAdminSettings: vi.fn(async () => ({
    availabilityRules: {
      minNightsPerBooking: 1,
      maxNightsPerBooking: 365,
    },
    pricingSettings: {
      currency: "USD",
      standardNightlyRate: 65,
      deluxeNightlyRate: 85,
      luxuryNightlyRate: 120,
      taxRatePercent: 10,
      twoPetDiscountPercent: 15,
      threePlusPetsDiscountPercent: 20,
    },
    holidaySurcharges: [],
    serviceSettings: {
      serviceTiers: [
        { id: "standard-suite", name: "Standard Suite", capacity: 3, isActive: true },
        { id: "deluxe-suite", name: "Deluxe Suite", capacity: 2, isActive: true },
        { id: "luxury-suite", name: "Luxury Suite", capacity: 1, isActive: true },
      ],
    },
    trustCopySettings: {
      pricingDisclosure:
        "Premium but fair pricing includes clear subtotal, applicable tax, selected care items, and total shown before confirmation.",
    },
    requiredVaccineSettings: {
      requiredVaccines: ["Rabies"],
      blockBookingsOnExpiredVaccines: false,
    },
  })),
  getDefaultSettings: vi.fn(() => ({
    availabilityRules: {
      minNightsPerBooking: 1,
      maxNightsPerBooking: 365,
    },
    pricingSettings: {
      currency: "USD",
      standardNightlyRate: 65,
      deluxeNightlyRate: 85,
      luxuryNightlyRate: 120,
      taxRatePercent: 10,
      twoPetDiscountPercent: 15,
      threePlusPetsDiscountPercent: 20,
    },
    holidaySurcharges: [],
    serviceSettings: {
      serviceTiers: [
        { id: "standard-suite", name: "Standard Suite", capacity: 3, isActive: true },
        { id: "deluxe-suite", name: "Deluxe Suite", capacity: 2, isActive: true },
        { id: "luxury-suite", name: "Luxury Suite", capacity: 1, isActive: true },
      ],
    },
    trustCopySettings: {
      pricingDisclosure:
        "Premium but fair pricing includes clear subtotal, applicable tax, selected care items, and total shown before confirmation.",
    },
    requiredVaccineSettings: {
      requiredVaccines: ["Rabies"],
      blockBookingsOnExpiredVaccines: false,
    },
  })),
}));

vi.mock("@/lib/booking/default-suites", () => ({
  ensureDefaultSuites: vi.fn(async () => 4),
}));

import { POST as createBooking } from "@/app/api/bookings/route";

describe("guest booking flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a booking successfully without a signed-in session", async () => {
    const request = new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIn: "2026-06-10",
        checkOut: "2026-06-13",
        suiteType: "deluxe",
        petCount: 1,
        firstName: "Morgan",
        lastName: "Lee",
        email: "morgan@example.com",
        phone: "3155551234",
        petNames: "Scout",
        newPets: [
          {
            name: "Scout",
            breed: "Golden Retriever",
            age: 4,
            weight: 65,
            gender: "male",
            temperament: "friendly",
          },
        ],
        vaccines: [
          {
            petId: "new-0",
            fileUrl: "/uploads/scout-rabies.pdf",
            fileName: "Rabies.pdf",
            fileSize: 1024,
          },
        ],
        waiver: {
          liabilityAccepted: true,
          medicalAuthorizationAccepted: true,
          photoReleaseAccepted: true,
          policyAcknowledgmentAccepted: true,
          signature: "Morgan Lee Signature Data",
        },
      }),
    });

    const response = await createBooking(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.booking).toBeDefined();
    expect(payload.booking.status).toBe("pending");
    expect(payload.booking.suite.tier).toBe("deluxe");
    expect(payload.message).toContain("Booking created");
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});
