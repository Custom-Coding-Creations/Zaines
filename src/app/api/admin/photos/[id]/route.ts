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

  const photo = await prisma.petPhoto.findUnique({
    where: { id },
    select: {
      id: true,
      bookingId: true,
      userId: true,
      petId: true,
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (resolvedBookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: resolvedBookingId },
      select: {
        id: true,
        userId: true,
        bookingPets: {
          select: {
            petId: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.userId !== photo.userId) {
      return NextResponse.json(
        { error: "Photo owner does not match booking owner" },
        { status: 409 },
      );
    }

    const petIsOnBooking = booking.bookingPets.some((bookingPet) => bookingPet.petId === photo.petId);
    if (!petIsOnBooking) {
      return NextResponse.json(
        { error: "Photo pet is not assigned to this booking" },
        { status: 409 },
      );
    }
  }

  const actorName = session.user?.name ?? session.user?.email ?? session.user?.id ?? "Staff";

  const [updatedPhoto] = await prisma.$transaction([
    prisma.petPhoto.update({
      where: { id },
      data: {
        bookingId: resolvedBookingId,
      },
      include: {
        pet: {
          select: { id: true, name: true, breed: true },
        },
        booking: {
          select: { id: true, bookingNumber: true, status: true },
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
          entityType: "photo",
          entityId: id,
          targetUserId: photo.userId,
          previousBookingId: photo.bookingId,
          nextBookingId: resolvedBookingId,
          reason: "admin_photo_reassociation",
        }),
        isRead: true,
        sentAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ photo: updatedPhoto });
}
