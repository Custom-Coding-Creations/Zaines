import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import {
  createCampaign,
  listCampaigns,
  updateCampaignStatus,
} from "@/lib/api/admin-crm";

export async function GET() {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ campaigns: [] });
    }

    console.error("[API] CRM campaigns fetch failed", { message });
    return NextResponse.json({ error: "Unable to load campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    channel?: string;
    subject?: string;
    body?: string;
    segmentId?: string;
    scheduledFor?: string;
  } | null;

  const name = payload?.name?.trim();
  const body = payload?.body?.trim();
  const channel = payload?.channel;

  if (!name || !body || !channel) {
    return NextResponse.json(
      { error: "name, channel, and body are required" },
      { status: 400 },
    );
  }

  if (channel !== "email" && channel !== "sms") {
    return NextResponse.json({ error: "channel must be email or sms" }, { status: 400 });
  }

  try {
    const campaign = await createCampaign({
      name,
      channel,
      subject: payload?.subject,
      body,
      segmentId: payload?.segmentId,
      scheduledFor: payload?.scheduledFor,
      createdByUserId: authResult.session.user.id,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "INVALID_SCHEDULED_FOR") {
      return NextResponse.json({ error: "Invalid scheduledFor date" }, { status: 400 });
    }

    console.error("[API] CRM campaign create failed", { message });
    return NextResponse.json({ error: "Unable to create campaign" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const payload = (await request.json().catch(() => null)) as {
    campaignId?: string;
    status?: string;
  } | null;

  const campaignId = payload?.campaignId?.trim();
  const status = payload?.status;

  if (!campaignId || !status) {
    return NextResponse.json({ error: "campaignId and status are required" }, { status: 400 });
  }

  if (!["draft", "scheduled", "sent", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const campaign = await updateCampaignStatus({
      campaignId,
      status: status as "draft" | "scheduled" | "sent" | "cancelled",
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] CRM campaign status update failed", {
      campaignId,
      status,
      message,
    });
    return NextResponse.json({ error: "Unable to update campaign" }, { status: 500 });
  }
}
