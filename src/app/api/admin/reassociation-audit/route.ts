import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import {
  ASSOCIATION_AUDIT_PREFIX,
  parseReassociationAuditContent,
} from "@/lib/api/reassociation-audit";

function normalizeDateFilter(value: string | null, endOfDay: boolean): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  return value;
}

function buildCsv(events: Array<{
  entityType: "photo" | "message";
  entityId: string;
  reason: string;
  timestamp: string;
  actor: { id: string; name: string | null; email: string | null };
  targetUser: { id: string; name: string | null; email: string | null };
  previousBooking: { id: string; bookingNumber: string; status: string } | null;
  nextBooking: { id: string; bookingNumber: string; status: string } | null;
}>): string {
  const header = [
    "timestamp",
    "entityType",
    "entityId",
    "reason",
    "actorName",
    "actorEmail",
    "targetUserName",
    "targetUserEmail",
    "previousBookingNumber",
    "nextBookingNumber",
  ];

  const rows = events.map((event) => [
    event.timestamp,
    event.entityType,
    event.entityId,
    event.reason,
    event.actor.name ?? event.actor.id,
    event.actor.email ?? "",
    event.targetUser.name ?? event.targetUser.id,
    event.targetUser.email ?? "",
    event.previousBooking?.bookingNumber ?? "Account-level",
    event.nextBooking?.bookingNumber ?? "Account-level",
  ]);

  return [header, ...rows]
    .map((columns) => columns.map((value) => escapeCsv(String(value))).join(","))
    .join("\n");
}

export async function GET(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ events: [] });
  }

  const format = request.nextUrl.searchParams.get("format")?.trim();
  const entityTypeFilter = request.nextUrl.searchParams.get("entityType")?.trim();
  const startDate = normalizeDateFilter(request.nextUrl.searchParams.get("startDate"), false);
  const endDate = normalizeDateFilter(request.nextUrl.searchParams.get("endDate"), true);
  const take = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? "100") || 100, 1000);

  const rows = await prisma.message.findMany({
    where: {
      content: {
        startsWith: ASSOCIATION_AUDIT_PREFIX,
      },
      ...(startDate || endDate
        ? {
            sentAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      senderName: true,
      sentAt: true,
      content: true,
    },
    orderBy: { sentAt: "desc" },
    take,
  });

  const parsed = rows
    .map((row) => {
      const payload = parseReassociationAuditContent(row.content);
      if (!payload) return null;

      return {
        id: row.id,
        actorUserId: row.userId,
        actorName: row.senderName,
        loggedAt: row.sentAt,
        ...payload,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const filtered = entityTypeFilter
    ? parsed.filter((event) => event.entityType === entityTypeFilter)
    : parsed;

  const bookingIds = Array.from(
    new Set(
      filtered
        .flatMap((event) => [event.previousBookingId, event.nextBookingId])
        .filter((bookingId): bookingId is string => Boolean(bookingId)),
    ),
  );

  const userIds = Array.from(
    new Set(filtered.flatMap((event) => [event.actorUserId, event.targetUserId])),
  );

  const [bookings, users] = await Promise.all([
    bookingIds.length
      ? prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));
  const userMap = new Map(users.map((user) => [user.id, user]));

  const events = filtered.map((event) => ({
    id: event.id,
    entityType: event.entityType,
    entityId: event.entityId,
    reason: event.reason,
    timestamp: event.timestamp,
    actor: {
      id: event.actorUserId,
      name: userMap.get(event.actorUserId)?.name ?? event.actorName,
      email: userMap.get(event.actorUserId)?.email ?? null,
    },
    targetUser: {
      id: event.targetUserId,
      name: userMap.get(event.targetUserId)?.name ?? null,
      email: userMap.get(event.targetUserId)?.email ?? null,
    },
    previousBooking: event.previousBookingId
      ? bookingMap.get(event.previousBookingId) ?? {
          id: event.previousBookingId,
          bookingNumber: "Unknown",
          status: "unknown",
        }
      : null,
    nextBooking: event.nextBookingId
      ? bookingMap.get(event.nextBookingId) ?? {
          id: event.nextBookingId,
          bookingNumber: "Unknown",
          status: "unknown",
        }
      : null,
  }));

  if (format === "csv") {
    const csv = buildCsv(events);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="association-audit.csv"',
      },
    });
  }

  return NextResponse.json({ events });
}
