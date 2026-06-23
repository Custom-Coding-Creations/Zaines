import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [], total: 0, page: 1, limit: 50, unreadCount: 0 });
  }

  const params = request.nextUrl.searchParams;
  const folder = params.get("folder") ?? "inbox"; // inbox | sent | starred | archived
  const search = params.get("search")?.trim() ?? "";
  const type = params.get("type") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const limit = Math.min(Math.max(1, Number(params.get("limit") ?? "50") || 50), 200);
  const dateFrom = params.get("dateFrom") ?? "";
  const dateTo = params.get("dateTo") ?? "";

  const where: Prisma.EmailLogWhereInput = {};

  if (folder === "starred") {
    where.isStarred = true;
    where.isArchived = false;
  } else if (folder === "archived") {
    where.isArchived = true;
  } else if (folder === "sent") {
    where.direction = "outbound";
    where.isArchived = false;
  } else {
    // inbox: unread emails that haven't been archived — the "needs review" queue
    where.isRead = false;
    where.isArchived = false;
  }

  if (type) where.type = type;

  if (search) {
    where.OR = [
      { toAddress: { contains: search, mode: "insensitive" } },
      { fromAddress: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }

  if (dateFrom || dateTo) {
    where.sentAt = {};
    if (dateFrom) where.sentAt.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1); // inclusive end-of-day
      where.sentAt.lte = to;
    }
  }

  try {
    const [emails, total, unreadCount] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        select: {
          id: true,
          direction: true,
          type: true,
          fromAddress: true,
          toAddress: true,
          cc: true,
          subject: true,
          resendId: true,
          status: true,
          bookingId: true,
          userId: true,
          isRead: true,
          isStarred: true,
          isArchived: true,
          attachments: true,
          sentAt: true,
          createdAt: true,
          // html excluded from list — fetched on detail
        },
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({
        where: { isRead: false, isArchived: false },
      }),
    ]);

    return NextResponse.json({ success: true, data: emails, total, page, limit, unreadCount });
  } catch (error) {
    console.error("[email-inbox] list failed", error);
    return NextResponse.json(
      { error: "Email inbox unavailable" },
      { status: 503 },
    );
  }
}
