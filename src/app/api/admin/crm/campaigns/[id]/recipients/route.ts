import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import {
  dispatchPendingCampaignRecipients,
  listCampaignRecipients,
  refreshCampaignRecipients,
  retryFailedCampaignRecipients,
} from "@/lib/api/admin-crm";

type RouteContext = { params: Promise<{ id: string }> };

function isValidRecipientStatus(value: string | undefined): value is "pending" | "sent" | "failed" | "skipped" {
  return value === "pending" || value === "sent" || value === "failed" || value === "skipped";
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  const statusRaw = request.nextUrl.searchParams.get("status")?.trim();
  const status = isValidRecipientStatus(statusRaw) ? statusRaw : undefined;
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "200");
  const offsetRaw = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  try {
    const data = await listCampaignRecipients({
      campaignId: id,
      status,
      limit: Number.isFinite(limitRaw) ? limitRaw : 200,
      offset: Number.isFinite(offsetRaw) ? offsetRaw : 0,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({
        recipients: [],
        summary: { pending: 0, sent: 0, failed: 0, skipped: 0, total: 0 },
        pagination: { offset: 0, limit: 0, hasMore: false, totalFiltered: 0 },
      });
    }

    console.error("[API] CRM campaign recipients fetch failed", { campaignId: id, message });
    return NextResponse.json({ error: "Unable to load campaign recipients" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as {
    action?: string;
    recipientIds?: unknown;
    simulatedFailureRate?: unknown;
  } | null;

  const action = payload?.action?.trim() || "refreshAudience";
  if (action !== "refreshAudience" && action !== "retryFailed" && action !== "dispatchPending") {
    return NextResponse.json({ error: "Unsupported campaign recipients action" }, { status: 400 });
  }

  try {
    if (action === "retryFailed") {
      const recipientIds = Array.isArray(payload?.recipientIds)
        ? payload.recipientIds.filter((id): id is string => typeof id === "string")
        : undefined;

      const result = await retryFailedCampaignRecipients({
        campaignId: id,
        recipientIds,
      });

      return NextResponse.json(result);
    }

    if (action === "dispatchPending") {
      const simulatedFailureRate =
        typeof payload?.simulatedFailureRate === "number"
          ? payload.simulatedFailureRate
          : undefined;

      const result = await dispatchPendingCampaignRecipients({
        campaignId: id,
        simulatedFailureRate,
      });

      return NextResponse.json(result);
    }

    const result = await refreshCampaignRecipients(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (message === "CAMPAIGN_ALREADY_SENT") {
      return NextResponse.json({ error: "Sent campaigns cannot refresh audience" }, { status: 409 });
    }

    if (message === "CAMPAIGN_CANCELLED") {
      return NextResponse.json({ error: "Cancelled campaigns cannot be dispatched" }, { status: 409 });
    }

    console.error("[API] CRM campaign recipients refresh failed", { campaignId: id, message });
    return NextResponse.json({ error: "Unable to refresh campaign recipients" }, { status: 500 });
  }
}
