import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { processDueScheduledCampaigns } from "@/lib/api/admin-crm";

export async function POST() {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const result = await processDueScheduledCampaigns();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ processedCampaigns: 0, processedRecipientRows: 0 });
    }

    console.error("[API] CRM scheduled campaign processing failed", { message });
    return NextResponse.json({ error: "Unable to process scheduled campaigns" }, { status: 500 });
  }
}
