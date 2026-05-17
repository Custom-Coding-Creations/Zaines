"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeJsonResponse } from "@/lib/safe-json-response";

export function RepairBookingPetsButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleRepair() {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/repair-pets`, {
        method: "POST",
      });
      const payload = await safeJsonResponse<{ error?: string; message?: string; attachedCount?: number }>(
        response,
        {},
      );

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to repair booking pet links.");
      }

      setMessage(payload.message ?? `Attached ${payload.attachedCount ?? 0} pet(s).`);
      router.refresh();
    } catch (repairError) {
      setError(repairError instanceof Error ? repairError.message : "Unable to repair booking pet links.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={() => void handleRepair()} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Attaching pets...
          </>
        ) : (
          <>
            <Link2 className="mr-2 size-4" />
            Attach Owner Pets
          </>
        )}
      </Button>
      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
