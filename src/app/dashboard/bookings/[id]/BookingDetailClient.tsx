"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Camera, ClipboardList, MessageSquareMore, NotebookPen, RefreshCw } from "lucide-react";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { MessageThread } from "@/components/MessageThread";
import { NotificationBanner } from "@/components/NotificationBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { getBookingStatusMeta } from "@/lib/dashboard-status";
import { useSettings } from "@/providers/settings-provider";

const PhotoGallery = dynamic(
  () => import("@/components/PhotoGallery").then((m) => ({ default: m.PhotoGallery })),
  { loading: () => <Skeleton className="h-64 w-full rounded-2xl" /> },
);

interface BookingDetailClientProps {
  booking: {
    id: string;
    bookingNumber: string;
    checkInDate: Date;
    checkOutDate: Date;
    total: number;
    status: string;
    dropoffTimeSlot?: string | null;
    pickupTimeSlot?: string | null;
    suite?: { name?: string; tier?: string } | null;
    bookingPets: Array<{ id: string; pet?: { name?: string } | null }>;
    payments: Array<{ id: string; status: string; amount: number }>;
  };
  canCancel: boolean;
  canModify: boolean;
  CancelButton: ComponentType<{
    bookingId: string;
    bookingStatus: string;
    canCancel: boolean;
    checkInDate?: Date;
    total?: number;
    cancellationPolicy?: {
      fullRefundHours: number;
      partialRefundHours: number;
      partialRefundPercent: number;
    };
  }>;
  cancelButtonProps?: {
    checkInDate: Date;
    total: number;
    cancellationPolicy: {
      fullRefundHours: number;
      partialRefundHours: number;
      partialRefundPercent: number;
    };
  };
  ModifyButton: ComponentType<{
    bookingId: string;
    currentCheckOutDate: Date;
    currentDropoffTimeSlot: string | null;
    currentPickupTimeSlot: string | null;
  }>;
}

type TabType = "overview" | "timeline" | "gallery" | "messages";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

function formatDate(dateValue: Date | string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return DATE_FORMATTER.format(date);
}

function formatDateTime(dateValue: Date | string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return DATE_TIME_FORMATTER.format(date);
}

export default function BookingDetailClient({
  booking,
  canCancel,
  canModify,
  CancelButton,
  cancelButtonProps,
  ModifyButton,
}: BookingDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { settings } = useSettings();
  const fullRefundHours = settings?.cancellationPolicySettings.fullRefundHours ?? 48;
  const partialRefundHours = settings?.cancellationPolicySettings.partialRefundHours ?? 24;
  const partialRefundPercent =
    settings?.cancellationPolicySettings.partialRefundPercent ?? 50;

  const tabs: Array<{ id: TabType; label: string; icon: ComponentType<{ className?: string }> }> = [
    { id: "overview", label: "Overview", icon: ClipboardList },
    { id: "timeline", label: "Activity", icon: NotebookPen },
    { id: "gallery", label: "Photos", icon: Camera },
    { id: "messages", label: "Messages", icon: MessageSquareMore },
  ];

  const canRecoverPayment =
    (booking.status === "pending" || booking.status === "confirmed") &&
    !booking.payments.some((payment) => payment.status === "succeeded");

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      <NotificationBanner bookingId={booking.id} />

      <DashboardPageHeader
        eyebrow="Booking Details"
        title={`Booking ${booking.bookingNumber}`}
        description={`${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}`}
        className="luxury-shell"
      />

      {/* Tab Navigation */}
      <div
        className="rounded-2xl border border-border/70 bg-card/80 p-2"
        role="tablist"
        aria-label="Booking details navigation"
        aria-orientation="horizontal"
      >
        <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const panelId = `tab-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`focus-ring whitespace-nowrap rounded-xl border px-3 py-3 text-sm transition-colors sm:px-4 sm:text-base ${
                activeTab === tab.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={panelId}
              id={`tab-${tab.id}`}
            >
              <Icon className="mr-2 inline size-4" />
              {tab.label}
            </button>
          );
        })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        <section
          role="tabpanel"
          id="tab-panel-overview"
          aria-labelledby="tab-overview"
          hidden={activeTab !== "overview"}
          tabIndex={0}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Suite Information */}
            <div className="playful-card space-y-4 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Suite Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Suite</p>
                  <p className="font-medium">
                    {booking.suite?.name} ({booking.suite?.tier})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">{formatDateTime(booking.checkInDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">{formatDateTime(booking.checkOutDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${getBookingStatusMeta(booking.status).toneClass}`}
                    >
                      {getBookingStatusMeta(booking.status).label}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Pets Information */}
            <div className="paw-card space-y-4 p-6">
              <h2 className="heading-playful text-lg">Pets</h2>
              <div className="space-y-2">
                {booking.bookingPets.length === 0 ? (
                  <p className="text-muted-foreground">No pets for this booking.</p>
                ) : (
                  booking.bookingPets.map((bp) => (
                    <div
                      key={bp.id}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <p className="font-medium text-lg">
                        {bp.pet?.name || "Pet"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="paw-card space-y-4 p-6 md:col-span-2">
              <h2 className="text-lg font-semibold">Payment</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <p className="text-muted-foreground">Total Amount:</p>
                  <p className="font-semibold text-lg">${booking.total}</p>
                </div>

                {booking.payments.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Payment History:</p>
                    <div className="space-y-2">
                      {booking.payments.map((pay) => (
                        <div
                          key={pay.id}
                          className="flex justify-between rounded bg-muted/30 p-2 text-sm"
                        >
                          <span>
                            {pay.status} - ${pay.amount}
                          </span>
                          <span
                            className={`font-medium ${
                              pay.status === "succeeded"
                                ? "text-emerald-700"
                                : "text-muted-foreground"
                            }`}
                          >
                            {pay.status === "succeeded" ? "✓" : "◯"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canRecoverPayment ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-900">
                      Payment has not been completed yet. Use the secure recovery link below.
                    </p>
                    <a
                      href={`/book/recover/${booking.id}`}
                      className="focus-ring mt-2 inline-flex rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      Complete Payment
                    </a>
                  </div>
                ) : null}

                <div className="pt-2 border-t">
                  <p className="mb-3 text-xs text-muted-foreground">
                      Cancellation policy: {fullRefundHours}+ hours full refund, {partialRefundHours}-{fullRefundHours} hours {partialRefundPercent}%
                      refund, under {partialRefundHours} hours no refund.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canCancel && (
                      <CancelButton
                        bookingId={booking.id}
                        bookingStatus={booking.status}
                        canCancel={canCancel}
                        {...cancelButtonProps}
                      />
                    )}
                    {canModify && (
                      <ModifyButton
                        bookingId={booking.id}
                        currentCheckOutDate={booking.checkOutDate}
                        currentDropoffTimeSlot={booking.dropoffTimeSlot ?? null}
                        currentPickupTimeSlot={booking.pickupTimeSlot ?? null}
                      />
                    )}
                    {(booking.status === "completed" || booking.status === "cancelled") && (
                      <Link
                        href={`/book?rebook=${booking.id}`}
                        className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <RefreshCw className="size-4" />
                        Rebook this stay
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Activity Timeline Tab */}
        <section
          role="tabpanel"
          id="tab-panel-timeline"
          aria-labelledby="tab-timeline"
          hidden={activeTab !== "timeline"}
          tabIndex={0}
        >
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
            <ActivityTimeline bookingId={booking.id} />
          </div>
        </section>

        {/* Photo Gallery Tab */}
        <section
          role="tabpanel"
          id="tab-panel-gallery"
          aria-labelledby="tab-gallery"
          hidden={activeTab !== "gallery"}
          tabIndex={0}
        >
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
            <PhotoGallery bookingId={booking.id} />
          </div>
        </section>

        {/* Messages Tab */}
        <section
          role="tabpanel"
          id="tab-panel-messages"
          aria-labelledby="tab-messages"
          hidden={activeTab !== "messages"}
          tabIndex={0}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MessageThread
                bookingId={booking.id}
                bookingNumber={booking.bookingNumber}
              />
            </div>
            <div className="rounded-xl border bg-muted/30 p-6">
              <h3 className="font-semibold mb-3">Quick Tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Get real-time updates on your pet&apos;s activities</li>
                <li>✓ Receive notifications of new photos</li>
                <li>✓ Direct messaging with staff</li>
                <li>✓ Messages update every 30 seconds</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
