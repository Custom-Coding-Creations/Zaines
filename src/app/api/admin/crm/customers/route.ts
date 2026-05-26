import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { listCrmCustomers } from "@/lib/api/admin-crm";

export async function GET(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const query = request.nextUrl.searchParams.get("query")?.trim();
  const tagId = request.nextUrl.searchParams.get("tagId")?.trim();
  const loyaltyTier = request.nextUrl.searchParams.get("loyaltyTier")?.trim();
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "50");

  try {
    const customers = await listCrmCustomers({
      query,
      tagId,
      loyaltyTier,
      limit: Number.isFinite(limitParam) ? limitParam : 50,
    });

    return NextResponse.json({ customers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ customers: [] });
    }

    console.error("[API] CRM customer list failed", { message });
    return NextResponse.json(
      { error: "Unable to load CRM customers" },
      { status: 500 },
    );
  }
}