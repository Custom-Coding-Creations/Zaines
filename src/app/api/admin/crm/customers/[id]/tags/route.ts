import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { assignCustomerTag, removeCustomerTag } from "@/lib/api/admin-crm";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as { tagId?: string } | null;
  const tagId = payload?.tagId?.trim();

  if (!id || !tagId) {
    return NextResponse.json({ error: "Customer ID and tagId are required" }, { status: 400 });
  }

  try {
    await assignCustomerTag(id, tagId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] CRM tag assignment failed", { customerId: id, tagId, message });
    return NextResponse.json({ error: "Unable to assign tag" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as { tagId?: string } | null;
  const tagId = payload?.tagId?.trim();

  if (!id || !tagId) {
    return NextResponse.json({ error: "Customer ID and tagId are required" }, { status: 400 });
  }

  try {
    await removeCustomerTag(id, tagId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] CRM tag unassignment failed", { customerId: id, tagId, message });
    return NextResponse.json({ error: "Unable to remove tag" }, { status: 500 });
  }
}
