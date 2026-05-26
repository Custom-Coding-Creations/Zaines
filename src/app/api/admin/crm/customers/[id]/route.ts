import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { getCrmCustomerProfile } from "@/lib/api/admin-crm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  try {
    const profile = await getCrmCustomerProfile(id);
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    console.error("[API] CRM profile load failed", { customerId: id, message });
    return NextResponse.json(
      { error: "Unable to load CRM customer profile" },
      { status: 500 },
    );
  }
}