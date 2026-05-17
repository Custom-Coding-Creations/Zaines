import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireFinanceAccessMock = vi.hoisted(() => vi.fn());
const getFinanceExceptionsMock = vi.hoisted(() => vi.fn());
const getFinanceTransactionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/admin-finance-auth", () => ({
  requireFinanceAccess: requireFinanceAccessMock,
}));

vi.mock("@/lib/api/admin-finance", () => ({
  getFinanceExceptions: getFinanceExceptionsMock,
  getFinanceTransactions: getFinanceTransactionsMock,
}));

import { GET as getFinanceExceptionsRoute } from "@/app/api/admin/finance/exceptions/route";
import { GET as getFinanceTransactionsRoute } from "@/app/api/admin/finance/transactions/route";

describe("admin finance endpoint hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFinanceAccessMock.mockImplementation(async () => ({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }));
  });

  it("returns non-500 auth responses for finance endpoints", async () => {
    const responses = await Promise.all([
      getFinanceExceptionsRoute(new NextRequest("http://localhost/api/admin/finance/exceptions")),
      getFinanceTransactionsRoute(new NextRequest("http://localhost/api/admin/finance/transactions")),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      const body = (await response.json()) as { error?: string };
      expect(body.error).toBe("Unauthorized");
    }
  });

  it("returns 400 when finance transaction date query is invalid", async () => {
    requireFinanceAccessMock.mockResolvedValue({
      session: { user: { id: "staff-1", role: "staff", name: "Staff" } },
    });

    const response = await getFinanceTransactionsRoute(
      new NextRequest("http://localhost/api/admin/finance/transactions?startDate=not-a-date"),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Invalid date parameter");
    expect(getFinanceTransactionsMock).not.toHaveBeenCalled();
  });
});
