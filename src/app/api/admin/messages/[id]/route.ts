import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { buildReassociationAuditContent } from "@/lib/api/reassociation-audit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }
  const session = authResult.session;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { bookingId?: string | null } | null;
  const bookingId = body?.bookingId?.trim() ?? "";
  const resolvedBookingId = bookingId.length > 0 ? bookingId : null;

  const message = await prisma.message.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      senderType: true,
      bookingId: true,
    },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (resolvedBookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: resolvedBookingId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Reassociation requires customer-originated message ownership parity.
    if (message.senderType !== "customer" || message.userId !== booking.userId) {
      return NextResponse.json(
        { error: "Message cannot be associated with this booking" },
        { status: 409 },
      );
    }
  }

  const actorName = session.user?.name ?? session.user?.email ?? session.user?.id ?? "Staff";

  const [updatedMessage] = await prisma.$transaction([
    prisma.message.update({
      where: { id },
      data: {
        bookingId: resolvedBookingId,
      },
      select: {
        id: true,
        bookingId: true,
        userId: true,
        senderType: true,
        senderName: true,
        content: true,
        isRead: true,
        sentAt: true,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.message.create({
      data: {
        bookingId: null,
        userId: session.user.id,
        senderType: "staff",
        senderName: actorName,
        content: buildReassociationAuditContent({
          actorUserId: session.user.id,
          actorName,
          entityType: "message",
          entityId: id,
          targetUserId: message.userId,
          previousBookingId: message.bookingId,
          nextBookingId: resolvedBookingId,
          reason: "admin_message_reassociation",
        }),
        isRead: true,
        sentAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ message: updatedMessage });
}
