import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireStaffSessionMock = vi.hoisted(() => vi.fn());
const isDatabaseConfiguredMock = vi.hoisted(() => vi.fn(() => true));
const generateAutomatedRemindersMock = vi.hoisted(() => vi.fn());
const dispatchDueAutomatedRemindersMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/admin-auth", () => ({
  requireStaffSession: requireStaffSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  isDatabaseConfigured: isDatabaseConfiguredMock,
  prisma: {
    automatedReminder: {
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock("@/lib/reminders", () => ({
  generateAutomatedReminders: generateAutomatedRemindersMock,
  dispatchDueAutomatedReminders: dispatchDueAutomatedRemindersMock,
}));

import { POST as postAdminReminders } from "@/app/api/admin/reminders/route";

describe("admin reminders endpoint hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffSessionMock.mockImplementation(async () => ({
      session: { user: { id: "staff-1", role: "staff" } },
      error: null,
    }));
    isDatabaseConfiguredMock.mockReturnValue(true);
  });

  it("returns auth error envelope without 500", async () => {
    requireStaffSessionMock.mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await postAdminReminders(
      new NextRequest("http://localhost/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "run" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 503 with workflow-unavailable code when reminder workflow fails", async () => {
    generateAutomatedRemindersMock.mockRejectedValue(new Error("workflow failure"));

    const response = await postAdminReminders(
      new NextRequest("http://localhost/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "run" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string; code?: string };
    expect(body.error).toBe("Reminder workflow unavailable");
    expect(body.code).toBe("REMINDER_WORKFLOW_UNAVAILABLE");
  });

  it("returns 503 when database is not configured", async () => {
    isDatabaseConfiguredMock.mockReturnValue(false);

    const response = await postAdminReminders(
      new NextRequest("http://localhost/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "run" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Database not configured");
  });
});
