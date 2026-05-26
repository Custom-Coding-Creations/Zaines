import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { previewSegmentAudience } from "@/lib/api/admin-crm";

function isValidChannel(value: string | undefined): value is "email" | "sms" {
  return value === "email" || value === "sms";
}

export async function POST(request: Request) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const payload = (await request.json().catch(() => null)) as {
    criteriaJson?: Record<string, unknown>;
    channel?: string;
  } | null;

  if (!isValidChannel(payload?.channel)) {
    return NextResponse.json({ error: "Valid channel is required" }, { status: 400 });
  }

  try {
    const result = await previewSegmentAudience({
      criteriaJson: payload?.criteriaJson ?? {},
      channel: payload.channel,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ estimatedRecipients: 0 });
    }

    console.error("[API] CRM segment preview failed", { message });
    return NextResponse.json({ error: "Unable to preview segment" }, { status: 500 });
  }
}
