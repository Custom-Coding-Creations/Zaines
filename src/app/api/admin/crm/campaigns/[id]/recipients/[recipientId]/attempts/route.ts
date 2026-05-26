import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { listCampaignRecipientAttempts } from "@/lib/api/admin-crm";

type RouteContext = { params: Promise<{ id: string; recipientId: string }> };

function isValidAttemptStatus(value: string | undefined): value is "sent" | "failed" | "retry_queued" {
  return value === "sent" || value === "failed" || value === "retry_queued";
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id, recipientId } = await params;
  if (!id || !recipientId) {
    return NextResponse.json({ error: "Campaign ID and recipient ID are required" }, { status: 400 });
  }

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const offsetRaw = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  const statusRaw = request.nextUrl.searchParams.get("status")?.trim();
  const status = isValidAttemptStatus(statusRaw) ? statusRaw : undefined;
  const since = request.nextUrl.searchParams.get("since")?.trim() || undefined;
  const until = request.nextUrl.searchParams.get("until")?.trim() || undefined;

  try {
    const data = await listCampaignRecipientAttempts({
      campaignId: id,
      recipientId,
      status,
      since,
      until,
      limit: Number.isFinite(limitRaw) ? limitRaw : 20,
      offset: Number.isFinite(offsetRaw) ? offsetRaw : 0,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CAMPAIGN_RECIPIENT_NOT_FOUND") {
      return NextResponse.json({ error: "Campaign recipient not found" }, { status: 404 });
    }

    if (message === "INVALID_SINCE_AT" || message === "INVALID_UNTIL_AT" || message === "INVALID_ATTEMPT_RANGE") {
      return NextResponse.json({ error: "Invalid attempt filter date range" }, { status: 400 });
    }

    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({
        attempts: [],
        pagination: { offset: 0, limit: 0, hasMore: false, total: 0 },
      });
    }

    console.error("[API] CRM campaign recipient attempts fetch failed", {
      campaignId: id,
      recipientId,
      message,
    });
    return NextResponse.json({ error: "Unable to load recipient attempts" }, { status: 500 });
  }
}
