import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { createCustomerInteraction, listCustomerInteractions } from "@/lib/api/admin-crm";

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
    const interactions = await listCustomerInteractions(id, 150);
    return NextResponse.json({ interactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ interactions: [] });
    }

    console.error("[API] CRM interactions fetch failed", { customerId: id, message });
    return NextResponse.json({ error: "Unable to load interactions" }, { status: 500 });
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

  const payload = (await request.json().catch(() => null)) as {
    channel?: string;
    direction?: string;
    subject?: string;
    content?: string;
    occurredAt?: string;
  } | null;

  const channel = payload?.channel?.trim();
  const direction = payload?.direction?.trim();
  const content = payload?.content?.trim();

  if (!channel || !direction || !content) {
    return NextResponse.json(
      { error: "channel, direction, and content are required" },
      { status: 400 },
    );
  }

  try {
    const interaction = await createCustomerInteraction({
      userId: id,
      createdById: authResult.session.user.id,
      channel,
      direction,
      subject: payload?.subject,
      content,
      occurredAt: payload?.occurredAt,
      sourceSystem: "manual",
    });

    return NextResponse.json({ interaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "INVALID_OCCURRED_AT") {
      return NextResponse.json({ error: "Invalid occurredAt date" }, { status: 400 });
    }

    console.error("[API] CRM interaction create failed", { customerId: id, message });
    return NextResponse.json({ error: "Unable to create interaction" }, { status: 500 });
  }
}
