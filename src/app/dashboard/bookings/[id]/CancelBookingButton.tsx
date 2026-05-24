"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type CancellationPolicy = {
  fullRefundHours: number;
  partialRefundHours: number;
  partialRefundPercent: number;
};

type CancelBookingButtonProps = {
  bookingId: string;
  bookingStatus: string;
  canCancel: boolean;
  compact?: boolean;
  checkInDate?: Date;
  total?: number;
  cancellationPolicy?: CancellationPolicy;
};

function getRefundPreview(
  checkInDate: Date,
  total: number,
  policy: CancellationPolicy,
): string {
  const hoursUntilCheckIn =
    (checkInDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilCheckIn >= policy.fullRefundHours) {
    return `Full refund: $${total.toFixed(2)}`;
  }
  if (hoursUntilCheckIn >= policy.partialRefundHours) {
    const amount = (total * policy.partialRefundPercent) / 100;
    return `Partial refund: $${amount.toFixed(2)} (${policy.partialRefundPercent}%)`;
  }
  return "No refund (under 24 hours before check-in)";
}

type CancellationPayload = {
  error?: string;
  cancellation?: {
    message?: string;
    refundEligibleAmount?: number;
    refundedAmount?: number;
    refundPendingAmount?: number;
  };
};

export function CancelBookingButton({
  bookingId,
  bookingStatus,
  canCancel,
  compact = false,
  checkInDate,
  total,
  cancellationPolicy,
}: CancelBookingButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const router = useRouter();

  const handleCancelBooking = async () => {
    if (!canCancel) {
      toast.error("This booking cannot be cancelled in its current state.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      const payload = (await response.json()) as CancellationPayload;

      if (!response.ok) {
        toast.error(payload.error || "Unable to cancel booking.");
        return;
      }

      const summary = payload.cancellation?.message || "Booking cancelled.";
      toast.success(summary);
      setShowConfirmDialog(false);
      router.refresh();
    } catch {
      toast.error("Unable to cancel booking right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setShowConfirmDialog(true)}
        disabled={isSubmitting || !canCancel}
        size={compact ? "sm" : "default"}
      >
        {isSubmitting
          ? "Cancelling..."
          : bookingStatus === "cancelled"
            ? "Cancelled"
            : bookingStatus === "checked_in" || bookingStatus === "completed"
              ? "Cancellation Unavailable"
              : "Cancel Booking"}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking?</DialogTitle>
            <DialogDescription>
              {checkInDate && total != null && cancellationPolicy ? (
                <>
                  <span className="block font-medium text-foreground">
                    {getRefundPreview(checkInDate, total, cancellationPolicy)}
                  </span>
                  <span className="block mt-1 text-sm">
                    This action cannot be undone.
                  </span>
                </>
              ) : (
                "Cancellation terms and refund policy will be applied based on your stay dates."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
