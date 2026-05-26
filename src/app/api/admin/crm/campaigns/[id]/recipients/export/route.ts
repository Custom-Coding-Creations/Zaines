import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { exportCampaignRecipientsCsv } from "@/lib/api/admin-crm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  try {
    const csv = await exportCampaignRecipientsCsv(id);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campaign-${id}-recipients.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ error: "Persistence unavailable" }, { status: 503 });
    }

    console.error("[API] CRM campaign recipients export failed", { campaignId: id, message });
    return NextResponse.json({ error: "Unable to export campaign recipients" }, { status: 500 });
  }
}
