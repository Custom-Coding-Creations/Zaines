import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import {
  createOpportunity,
  listOpportunities,
  updateOpportunityStage,
} from "@/lib/api/admin-crm";

export async function GET(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const stage = request.nextUrl.searchParams.get("stage")?.trim();
  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "200");

  try {
    const opportunities = await listOpportunities({
      stage,
      userId,
      limit: Number.isFinite(limit) ? limit : 200,
    });
    return NextResponse.json({ opportunities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ opportunities: [] });
    }

    console.error("[API] CRM opportunities fetch failed", { message });
    return NextResponse.json({ error: "Unable to load opportunities" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const payload = (await request.json().catch(() => null)) as {
    userId?: string;
    title?: string;
    description?: string;
    stage?: string;
    source?: string;
    estimatedValue?: number;
    expectedCloseAt?: string;
    ownerUserId?: string;
  } | null;

  const userId = payload?.userId?.trim();
  const title = payload?.title?.trim();

  if (!userId || !title) {
    return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
  }

  try {
    const opportunity = await createOpportunity({
      userId,
      title,
      description: payload?.description,
      stage: payload?.stage,
      source: payload?.source,
      estimatedValue: payload?.estimatedValue,
      expectedCloseAt: payload?.expectedCloseAt,
      ownerUserId: payload?.ownerUserId,
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "INVALID_EXPECTED_CLOSE_AT") {
      return NextResponse.json({ error: "Invalid expectedCloseAt date" }, { status: 400 });
    }

    console.error("[API] CRM opportunity create failed", { message });
    return NextResponse.json({ error: "Unable to create opportunity" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const payload = (await request.json().catch(() => null)) as {
    opportunityId?: string;
    stage?: string;
  } | null;

  const opportunityId = payload?.opportunityId?.trim();
  const stage = payload?.stage;

  if (!opportunityId || !stage) {
    return NextResponse.json(
      { error: "opportunityId and stage are required" },
      { status: 400 },
    );
  }

  if (!["new", "qualified", "proposal", "won", "lost"].includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  try {
    const opportunity = await updateOpportunityStage({
      opportunityId,
      stage: stage as "new" | "qualified" | "proposal" | "won" | "lost",
    });
    return NextResponse.json({ opportunity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] CRM opportunity stage update failed", {
      opportunityId,
      stage,
      message,
    });
    return NextResponse.json(
      { error: "Unable to update opportunity stage" },
      { status: 500 },
    );
  }
}
