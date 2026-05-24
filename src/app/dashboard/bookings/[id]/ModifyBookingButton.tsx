"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const TIME_SLOTS = [
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
];

type ModifyBookingButtonProps = {
  bookingId: string;
  currentCheckOutDate: Date;
  currentDropoffTimeSlot: string | null;
  currentPickupTimeSlot: string | null;
  compact?: boolean;
};

type ModifyPayload = {
  error?: string;
  priceDiff?: number;
};

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function ModifyBookingButton({
  bookingId,
  currentCheckOutDate,
  currentDropoffTimeSlot,
  currentPickupTimeSlot,
  compact = false,
}: ModifyBookingButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkOutDateStr, setCheckOutDateStr] = useState("");
  const [dropoffTimeSlot, setDropoffTimeSlot] = useState<string>(
    currentDropoffTimeSlot ?? "",
  );
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>(
    currentPickupTimeSlot ?? "",
  );
  const router = useRouter();

  const minCheckoutDateStr = toDateInputValue(
    new Date(currentCheckOutDate.getTime() + 24 * 60 * 60 * 1000),
  );

  const handleOpen = () => {
    setCheckOutDateStr("");
    setDropoffTimeSlot(currentDropoffTimeSlot ?? "");
    setPickupTimeSlot(currentPickupTimeSlot ?? "");
    setOpen(true);
  };

  const handleSubmit = async () => {
    const body: {
      checkOutDate?: string;
      dropoffTimeSlot?: string;
      pickupTimeSlot?: string;
    } = {};

    if (checkOutDateStr) {
      body.checkOutDate = new Date(checkOutDateStr).toISOString();
    }
    if (dropoffTimeSlot !== (currentDropoffTimeSlot ?? "")) {
      body.dropoffTimeSlot = dropoffTimeSlot;
    }
    if (pickupTimeSlot !== (currentPickupTimeSlot ?? "")) {
      body.pickupTimeSlot = pickupTimeSlot;
    }

    if (Object.keys(body).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/modify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as ModifyPayload;

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to modify booking.");
        return;
      }

      const priceDiff = payload.priceDiff ?? 0;
      if (priceDiff > 0) {
        toast.success(
          `Booking updated. An additional charge of $${priceDiff.toFixed(2)} will be applied.`,
        );
      } else {
        toast.success("Booking updated successfully.");
      }

      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Unable to modify booking right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        size={compact ? "sm" : "default"}
      >
        <PencilLine className="mr-2 size-4" />
        Modify Stay
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Booking</DialogTitle>
            <DialogDescription>
              Extend your checkout date or change drop-off / pick-up time slots.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Extend checkout */}
            <div className="space-y-2">
              <Label htmlFor="checkout-date">Extend checkout date</Label>
              <p className="text-xs text-muted-foreground">
                Current checkout:{" "}
                <span className="font-medium">
                  {format(currentCheckOutDate, "PPP")}
                </span>
              </p>
              <Input
                id="checkout-date"
                type="date"
                min={minCheckoutDateStr}
                value={checkOutDateStr}
                onChange={(e) => setCheckOutDateStr(e.target.value)}
              />
            </div>

            {/* Drop-off time slot */}
            <div className="space-y-2">
              <Label htmlFor="dropoff-slot">Drop-off time slot</Label>
              <Select value={dropoffTimeSlot} onValueChange={setDropoffTimeSlot}>
                <SelectTrigger id="dropoff-slot" className="w-full">
                  <SelectValue placeholder="Select drop-off time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pick-up time slot */}
            <div className="space-y-2">
              <Label htmlFor="pickup-slot">Pick-up time slot</Label>
              <Select value={pickupTimeSlot} onValueChange={setPickupTimeSlot}>
                <SelectTrigger id="pickup-slot" className="w-full">
                  <SelectValue placeholder="Select pick-up time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
