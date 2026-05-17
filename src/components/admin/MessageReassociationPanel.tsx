"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { safeJsonResponse } from "@/lib/safe-json-response";

type BookingOption = {
  id: string;
  bookingNumber: string;
  status: string;
  checkInDate?: string;
};

type MessageItem = {
  id: string;
  bookingId: string | null;
  userId: string;
  senderType: string;
  senderName: string;
  content: string;
  isRead: boolean;
  sentAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
  } | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export function MessageReassociationPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [targetByMessageId, setTargetByMessageId] = useState<Record<string, string>>({});
  const [savingByMessageId, setSavingByMessageId] = useState<Record<string, boolean>>({});

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [messagesRes, bookingsRes] = await Promise.all([
        fetch("/api/admin/messages?includeUnassigned=true&limit=120", { cache: "no-store" }),
        fetch("/api/admin/bookings", { cache: "no-store" }),
      ]);

      const messagesData = await safeJsonResponse<{ messages?: MessageItem[]; error?: string }>(messagesRes, {});
      const bookingsData = await safeJsonResponse<{
        data?: BookingOption[];
        bookings?: BookingOption[];
        error?: string;
      }>(bookingsRes, {});

      if (!messagesRes.ok) {
        throw new Error(messagesData.error ?? "Unable to load messages");
      }
      if (!bookingsRes.ok) {
        throw new Error(bookingsData.error ?? "Unable to load bookings");
      }

      const loadedMessages = messagesData.messages ?? [];
      const loadedBookings = bookingsData.data ?? bookingsData.bookings ?? [];

      setMessages(loadedMessages);
      setBookings(loadedBookings);
      setTargetByMessageId(
        loadedMessages.reduce<Record<string, string>>((acc, message) => {
          acc[message.id] = message.bookingId ?? "none";
          return acc;
        }, {}),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load message reassociation data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const editableMessages = useMemo(
    () => messages.filter((message) => message.senderType === "customer"),
    [messages],
  );

  async function handleSave(message: MessageItem) {
    const nextBookingId = targetByMessageId[message.id] ?? "none";

    setSavingByMessageId((state) => ({ ...state, [message.id]: true }));
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/messages/${message.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: nextBookingId === "none" ? null : nextBookingId,
        }),
      });

      const data = await safeJsonResponse<{ error?: string }>(response, {});
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update message association");
      }

      setSuccess("Message association updated.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update message association");
    } finally {
      setSavingByMessageId((state) => ({ ...state, [message.id]: false }));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Message Reassociation</CardTitle>
        <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Reattach customer account-level messages to a booking when context is clarified later.
        </p>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading message context…</p>
        ) : editableMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customer messages available for reassociation.</p>
        ) : (
          <div className="space-y-3">
            {editableMessages.map((message) => (
              <div key={message.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{message.user.name ?? message.user.email ?? "Customer"}</span>
                  <span>{new Date(message.sentAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm">{message.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select
                    value={targetByMessageId[message.id] ?? "none"}
                    onValueChange={(value) =>
                      setTargetByMessageId((state) => ({
                        ...state,
                        [message.id]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select booking" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Account-level (no booking)</SelectItem>
                      {bookings.map((booking) => (
                        <SelectItem key={booking.id} value={booking.id}>
                          {booking.bookingNumber} • {booking.status.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => void handleSave(message)}
                    disabled={savingByMessageId[message.id] === true}
                  >
                    {savingByMessageId[message.id] ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
