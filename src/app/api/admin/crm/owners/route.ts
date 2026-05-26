import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { listCrmAssignableOwners } from "@/lib/api/admin-crm";

export async function GET(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const query = request.nextUrl.searchParams.get("query")?.trim();
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "100");

  try {
    const owners = await listCrmAssignableOwners({
      query,
      limit: Number.isFinite(limitParam) ? limitParam : 100,
    });

    return NextResponse.json({ owners });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ owners: [] });
    }

    console.error("[API] CRM owner list failed", { message });
    return NextResponse.json({ error: "Unable to load assignable owners" }, { status: 500 });
  }
}
