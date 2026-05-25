import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireStaffSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/admin-auth", () => ({
  requireStaffSession: requireStaffSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: vi.fn(() => true),
  prisma: {
    booking: { count: vi.fn(), findMany: vi.fn() },
    message: { count: vi.fn(), findMany: vi.fn() },
    payment: { count: vi.fn() },
    automatedReminder: { count: vi.fn(), findMany: vi.fn() },
    inventoryItem: { count: vi.fn(), findMany: vi.fn() },
    customerPackage: { count: vi.fn() },
    playGroup: { count: vi.fn(), findMany: vi.fn() },
    staffMember: { count: vi.fn(), findMany: vi.fn() },
    staffSchedule: { findMany: vi.fn() },
    timeSlotConfig: { findMany: vi.fn() },
    bookingPackage: { findMany: vi.fn() },
    incidentReport: { findMany: vi.fn() },
    reportCard: { findMany: vi.fn() },
    suite: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/api/admin-settings", () => ({
  getAdminSettings: vi.fn(async () => ({
    stripeCapabilityFlags: { disputesEnabled: false },
  })),
}));

vi.mock("@/lib/api/issue26", () => ({
  getRecentContactSubmissions: vi.fn(async () => []),
}));

vi.mock("@/lib/booking/default-suites", () => ({
  ensureDefaultSuites: vi.fn(async () => undefined),
}));

import { GET as getOperationsQueue } from "@/app/api/admin/operations/queue/route";
import { GET as getStaffingExceptions } from "@/app/api/admin/play-groups/staffing-exceptions/route";
import { GET as getTimeSlots } from "@/app/api/admin/time-slots/route";
import { GET as getReminders } from "@/app/api/admin/reminders/route";
import { GET as getInventory } from "@/app/api/admin/inventory/route";
import { GET as getPlayGroups } from "@/app/api/admin/play-groups/route";
import { GET as getStaff } from "@/app/api/admin/staff/route";
import { GET as getEligiblePets } from "@/app/api/admin/play-groups/eligible-pets/route";
import { GET as getPackages } from "@/app/api/admin/packages/route";
import { GET as getIncidents } from "@/app/api/admin/incidents/route";
import { GET as getReportCards } from "@/app/api/admin/report-cards/route";
import { GET as getOccupancy } from "@/app/api/admin/occupancy/route";
import { GET as getBookings } from "@/app/api/admin/bookings/route";
import { GET as getRecurringBookings } from "@/app/api/admin/recurring-bookings/route";

describe("admin endpoint hardening regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffSessionMock.mockImplementation(async () => ({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }));
  });

  it("returns a non-500 auth error envelope for all targeted admin endpoints", async () => {
    const calls = [
      getOperationsQueue(),
      getStaffingExceptions(new NextRequest("http://localhost/api/admin/play-groups/staffing-exceptions?date=2026-05-17")),
      getTimeSlots(),
      getReminders(),
      getInventory(),
      getPlayGroups(new NextRequest("http://localhost/api/admin/play-groups?date=2026-05-17")),
      getStaff(new NextRequest("http://localhost/api/admin/staff?includeInactive=false")),
      getEligiblePets(),
      getPackages(),
      getIncidents(new NextRequest("http://localhost/api/admin/incidents")),
      getReportCards(new NextRequest("http://localhost/api/admin/report-cards")),
      getOccupancy(),
      getBookings(new NextRequest("http://localhost/api/admin/bookings")),
      getRecurringBookings(),
    ];

    const responses = await Promise.all(calls);

    for (const response of responses) {
      expect(response.status).toBe(401);
      const body = (await response.json()) as { error?: string };
      expect(body.error).toBe("Unauthorized");
    }
  });
});
