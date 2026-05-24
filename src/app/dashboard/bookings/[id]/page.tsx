import { auth } from "@/lib/auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardUnavailableState } from "@/components/dashboard/dashboard-states";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { CancelBookingButton } from "./CancelBookingButton";
import { ModifyBookingButton } from "./ModifyBookingButton";
import BookingDetailClient from "./BookingDetailClient";

type Props = { params: Promise<{ id: string }> };

type BookingDetailPrisma = {
  booking: {
    findUnique: (args: {
      where: { id: string };
      include: {
        suite: boolean;
        bookingPets: { include: { pet: boolean } };
        payments: boolean;
      };
    }) => Promise<{
      id: string;
      userId: string;
      bookingNumber: string;
      checkInDate: Date;
      checkOutDate: Date;
      total: number;
      status: string;
      dropoffTimeSlot?: string | null;
      pickupTimeSlot?: string | null;
      createdAt: Date;
      suite?: { name?: string; tier?: string } | null;
      bookingPets: Array<{ id: string; pet?: { name?: string } | null }>;
      payments: Array<{ id: string; status: string; amount: number }>;
    } | null>;
  };
};

const bookingDetailPrisma = prisma as unknown as BookingDetailPrisma;

export default async function BookingDetail({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const e2eCustomerBypassEnabled =
    process.env.PLAYWRIGHT_TEST === "1" &&
    cookieStore.get("e2e-customer")?.value === "1";

  if (e2eCustomerBypassEnabled) {
    const now = new Date();
    const checkout = new Date(now);
    checkout.setDate(checkout.getDate() + 2);
    const e2ePolicy = { fullRefundHours: 48, partialRefundHours: 24, partialRefundPercent: 50 };

    return (
      <BookingDetailClient
        booking={{
          id: id,
          bookingNumber: "E2E-BOOK-001",
          checkInDate: now,
          checkOutDate: checkout,
          total: 199,
          status: "confirmed",
          dropoffTimeSlot: null,
          pickupTimeSlot: null,
          suite: { name: "E2E Suite", tier: "Deluxe" },
          bookingPets: [{ id: "e2e-bp-1", pet: { name: "E2E Pet" } }],
          payments: [{ id: "e2e-pay-1", status: "succeeded", amount: 199 }],
        }}
        canCancel
        canModify
        CancelButton={CancelBookingButton}
        cancelButtonProps={{ checkInDate: now, total: 199, cancellationPolicy: e2ePolicy }}
        ModifyButton={ModifyBookingButton}
      />
    );
  }

  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/signin");

  if (!isDatabaseConfigured()) {
    return (
      <DashboardUnavailableState
        title="Booking unavailable"
        description="Database is not configured in this environment."
      />
    );
  }

  const [booking, settings] = await Promise.all([
    bookingDetailPrisma.booking.findUnique({
      where: { id },
      include: {
        suite: true,
        bookingPets: { include: { pet: true } },
        payments: true,
      },
    }),
    getAdminSettings(),
  ]);

  if (!booking || booking.userId !== session.user.id) {
    return (
      <DashboardUnavailableState
        title="Booking unavailable"
        description="Booking not found or access denied."
      />
    );
  }

  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";
  const canModify =
    booking.status === "pending" || booking.status === "confirmed";

  return (
    <BookingDetailClient
      booking={booking}
      canCancel={canCancel}
      canModify={canModify}
      CancelButton={CancelBookingButton}
      cancelButtonProps={{
        checkInDate: booking.checkInDate,
        total: booking.total,
        cancellationPolicy: settings.cancellationPolicySettings,
      }}
      ModifyButton={ModifyBookingButton}
    />
  );
}

