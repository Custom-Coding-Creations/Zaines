import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Mock the prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
    },
  },
  isDatabaseConfigured: vi.fn(),
}));

vi.mock("@/lib/api/admin-settings", () => ({
  getAdminSettings: vi.fn(async () => ({
    serviceSettings: {
      serviceTiers: [
        { id: "standard-suite", name: "Standard Suite", capacity: 3, isActive: true, displayOrder: 1 },
        { id: "deluxe-suite", name: "Deluxe Suite", capacity: 2, isActive: true, displayOrder: 2 },
        { id: "luxury-suite", name: "Luxury Suite", capacity: 1, isActive: true, displayOrder: 3 },
      ],
    },
  })),
}));

describe("GET /api/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 503 when database is not configured", async () => {
    const { isDatabaseConfigured } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkIn=2026-03-01&checkOut=2026-03-05",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual(
      expect.objectContaining({
        errorCode: "AVAILABILITY_UNAVAILABLE",
        retryable: true,
        correlationId: expect.any(String),
      }),
    );
  });

  it("should return 400 when checkIn is missing", async () => {
    const { isDatabaseConfigured } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkOut=2026-03-05",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual(
      expect.objectContaining({
        errorCode: "AVAILABILITY_VALIDATION_ERROR",
        retryable: false,
        correlationId: expect.any(String),
      }),
    );
  });

  it("should return 400 when checkOut is missing", async () => {
    const { isDatabaseConfigured } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkIn=2026-03-01",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual(
      expect.objectContaining({
        errorCode: "AVAILABILITY_VALIDATION_ERROR",
        retryable: false,
        correlationId: expect.any(String),
      }),
    );
  });

  it("should return availability when database is configured and dates are valid", async () => {
    const { isDatabaseConfigured, prisma } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkIn=2026-03-01&checkOut=2026-03-05",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("checkIn", "2026-03-01");
    expect(data).toHaveProperty("checkOut", "2026-03-05");
    expect(data).toHaveProperty("availability");
    expect(data.availability).toEqual({
      standard: 3,
      deluxe: 2,
      luxury: 1,
    });
    expect(data).toHaveProperty("isAvailable", true);
  });

  it("should return 400 for invalid date ranges", async () => {
    const { isDatabaseConfigured } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkIn=2026-03-10&checkOut=2026-03-05",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual(
      expect.objectContaining({
        errorCode: "AVAILABILITY_VALIDATION_ERROR",
        retryable: false,
      }),
    );
  });

  it("should ignore bookings without suite tier instead of throwing", async () => {
    const { isDatabaseConfigured, prisma } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      {
        id: "1",
        suite: null,
        bookingPets: [{ id: "pet-1" }],
      },
      {
        id: "2",
        suite: { tier: "Standard" },
        bookingPets: [{ id: "pet-2" }],
      },
    ] as never);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkIn=2026-03-01&checkOut=2026-03-05",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availability).toEqual({
      standard: 2,
      deluxe: 2,
      luxury: 1,
    });
  });

  it("should calculate occupied suites correctly", async () => {
    const { isDatabaseConfigured, prisma } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      {
        id: "1",
        suite: { tier: "Standard" },
      },
      {
        id: "2",
        suite: { tier: "Deluxe" },
      },
      {
        id: "3",
        suite: { tier: "Standard" },
      },
    ] as never);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkIn=2026-03-01&checkOut=2026-03-05",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availability).toEqual({
      standard: 1,
      deluxe: 1,
      luxury: 1,
    });
  });

  it("should use end-of-day check-in boundary for overlap query", async () => {
    const { isDatabaseConfigured } = await import("@/lib/prisma");
    vi.mocked(isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/availability?checkIn=2026-05-18&checkOut=2026-05-29",
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const findManyMock = vi.mocked(prisma.booking.findMany);
    expect(findManyMock).toHaveBeenCalledTimes(1);

    const whereClause = findManyMock.mock.calls[0]?.[0]?.where as {
      OR: Array<{ checkOutDate?: { gt?: Date } }>;
    };
    const checkOutGate = whereClause.OR[1]?.checkOutDate?.gt;

    expect(checkOutGate).toBeInstanceOf(Date);
    expect(checkOutGate?.toISOString()).toBe("2026-05-18T23:59:59.999Z");
  });
});
