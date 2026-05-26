import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { createSegment, listSegments } from "@/lib/api/admin-crm";

export async function GET() {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const segments = await listSegments();
    return NextResponse.json({ segments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ segments: [] });
    }

    console.error("[API] CRM segments fetch failed", { message });
    return NextResponse.json({ error: "Unable to load segments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
    criteriaJson?: Record<string, unknown>;
  } | null;

  const name = payload?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Segment name is required" }, { status: 400 });
  }

  try {
    const segment = await createSegment({
      name,
      description: payload?.description,
      criteriaJson: payload?.criteriaJson ?? {},
      createdByUserId: authResult.session.user.id,
    });

    return NextResponse.json({ segment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] CRM segment create failed", { message });
    return NextResponse.json({ error: "Unable to create segment" }, { status: 500 });
  }
}
