import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

type BulkAction = "archive" | "unarchive" | "mark_read" | "mark_unread" | "star" | "unstar";

const ACTION_MAP: Record<BulkAction, Record<string, unknown>> = {
  archive: { isArchived: true },
  unarchive: { isArchived: false },
  mark_read: { isRead: true },
  mark_unread: { isRead: false },
  star: { isStarred: true },
  unstar: { isStarred: false },
};

export async function PATCH(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { ids?: string[]; action?: string };

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }

    if (!body.action || !(body.action in ACTION_MAP)) {
      return NextResponse.json(
        { error: `action must be one of: ${Object.keys(ACTION_MAP).join(", ")}` },
        { status: 400 },
      );
    }

    const data = ACTION_MAP[body.action as BulkAction];
    const result = await prisma.emailLog.updateMany({
      where: { id: { in: body.ids } },
      data,
    });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error("[email-inbox/bulk] failed", error);
    return NextResponse.json({ error: "Bulk action failed" }, { status: 500 });
  }
}
