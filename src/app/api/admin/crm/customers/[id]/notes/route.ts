import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { createCustomerNote, listCustomerNotes } from "@/lib/api/admin-crm";

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
    const notes = await listCustomerNotes(id, 100);
    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ notes: [] });
    }

    console.error("[API] CRM notes fetch failed", { customerId: id, message });
    return NextResponse.json(
      { error: "Unable to load customer notes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as { content?: string } | null;
  const content = payload?.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "Note content is required" }, { status: 400 });
  }

  if (content.length > 4000) {
    return NextResponse.json({ error: "Note is too long (max 4000 chars)" }, { status: 400 });
  }

  try {
    const session = authResult.session;
    const note = await createCustomerNote({
      userId: id,
      content,
      createdById: session.user.id,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    console.error("[API] CRM note create failed", { customerId: id, message });
    return NextResponse.json({ error: "Unable to create note" }, { status: 500 });
  }
}