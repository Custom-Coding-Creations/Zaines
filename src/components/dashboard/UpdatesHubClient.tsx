"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Download, ExternalLink, Share2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardEmptyState, DashboardLoadingState } from "@/components/dashboard/dashboard-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { safeJsonResponse } from "@/lib/safe-json-response";

type BookingOption = {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  status: string;
};

type TimelineItem =
  | {
      id: string;
      entityId: string;
      type: "message";
      occurredAt: string;
      booking: { id: string; bookingNumber: string } | null;
      senderType: string;
      senderName: string;
      content: string;
    }
  | {
      id: string;
      entityId: string;
      type: "photo";
      occurredAt: string;
      booking: { id: string; bookingNumber: string } | null;
      pet: { id: string; name: string };
      imageUrl: string;
      caption: string | null;
      uploadedBy: string | null;
    };

type FeedMode = "all" | "messages" | "photos";
type ContextMode = "all" | "booking-linked" | "unassigned";

export function UpdatesHubClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [feedMode, setFeedMode] = useState<FeedMode>("all");
  const [contextMode, setContextMode] = useState<ContextMode>("all");
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("none");
  const [expandedPhoto, setExpandedPhoto] = useState<Extract<TimelineItem, { type: "photo" }> | null>(null);
  const [sharingPhotoId, setSharingPhotoId] = useState<string | null>(null);

  const cleanMessageContent = useCallback((content: string) => {
    return content
      .replace(/\(Frame:\s*[^)]+\)/gi, "")
      .replace(/\[frame:[^\]]+\]/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }, []);

  const handleSharePhoto = useCallback(
    async (photo: Extract<TimelineItem, { type: "photo" }>) => {
      setSharingPhotoId(photo.id);
      setError("");
      setSuccess("");
      try {
        const shareTitle = `${photo.pet.name} update photo`;
        const shareText = photo.caption || `${photo.pet.name} photo update`;

        const buildShareFile = async (): Promise<File | null> => {
          try {
            if (photo.imageUrl.startsWith("data:")) {
              const [meta, base64] = photo.imageUrl.split(",");
              if (!meta || !base64) return null;
              const mimeMatch = meta.match(/data:(.*?);base64/);
              const mimeType = mimeMatch?.[1] || "image/jpeg";
              const bytes = atob(base64);
              const array = new Uint8Array(bytes.length);
              for (let i = 0; i < bytes.length; i += 1) {
                array[i] = bytes.charCodeAt(i);
              }
              return new File([array], `${photo.pet.name.toLowerCase().replace(/\s+/g, "-")}-update.jpg`, {
                type: mimeType,
              });
            }

            const response = await fetch(photo.imageUrl);
            if (!response.ok) return null;
            const blob = await response.blob();
            const extension = blob.type.includes("png") ? "png" : "jpg";
            return new File([blob], `${photo.pet.name.toLowerCase().replace(/\s+/g, "-")}-update.${extension}`, {
              type: blob.type || "image/jpeg",
            });
          } catch {
            return null;
          }
        };

        const shareFile = await buildShareFile();

        if (
          typeof navigator !== "undefined" &&
          navigator.share &&
          shareFile &&
          (navigator as Navigator & { canShare?: (data: ShareData) => boolean }).canShare?.({ files: [shareFile] })
        ) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files: [shareFile],
          });
          return;
        }

        if (typeof navigator !== "undefined" && navigator.share && !photo.imageUrl.startsWith("data:")) {
          await navigator.share({ title: shareTitle, text: shareText, url: photo.imageUrl });
          return;
        }

        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(photo.imageUrl);
          return;
        }

        if (typeof window !== "undefined") {
          const openedWindow = window.open(photo.imageUrl, "_blank", "noopener,noreferrer");
          if (openedWindow) {
            return;
          }
        } else {
          throw new Error("Share not supported in this browser");
        }
      } catch {
        setError("Unable to share this photo on this device right now.");
      } finally {
        setSharingPhotoId(null);
      }
    },
    [],
  );

  const loadUpdates = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        mode: feedMode,
        limit: "80",
      });
      const response = await fetch(`/api/dashboard/updates?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await safeJsonResponse<{
        items?: TimelineItem[];
        bookings?: BookingOption[];
        error?: string;
      }>(response, {});

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load updates");
      }

      setItems(data.items ?? []);
      setBookings(data.bookings ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load updates");
    } finally {
      setIsLoading(false);
    }
  }, [feedMode]);

  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates]);

  const filteredItems = useMemo(() => {
    if (contextMode === "all") {
      return items;
    }

    if (contextMode === "booking-linked") {
      return items.filter((item) => Boolean(item.booking));
    }

    return items.filter((item) => !item.booking);
  }, [contextMode, items]);

  async function handleSendMessage() {
    const content = messageDraft.trim();
    if (!content) return;

    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/dashboard/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          bookingId: selectedBookingId === "none" ? undefined : selectedBookingId,
        }),
      });

      const data = await safeJsonResponse<{
        error?: string;
      }>(response, {});

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send message");
      }

      setMessageDraft("");
      setSelectedBookingId("none");
      await loadUpdates();
      setSuccess("Message sent successfully.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Customer Updates"
        title="One Timeline for Messages and Photos"
        description="Stay in sync with care updates in one place. Send account-level messages without choosing a booking, or attach context when it matters."
        className="paw-card"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="updates-context-select" className="text-sm font-medium">Context (optional)</Label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger id="updates-context-select" aria-label="Message context" className="focus-ring">
                  <SelectValue placeholder="No booking (account-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No booking (account-level)</SelectItem>
                  {bookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.bookingNumber} • {booking.status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="updates-message-input" className="text-sm font-medium">Message</Label>
              <Textarea
                id="updates-message-input"
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder="Ask a question or share an update..."
                rows={4}
                maxLength={5000}
                className="focus-ring"
              />
              <p className="text-xs text-muted-foreground">{messageDraft.length}/5000</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleSendMessage}
                disabled={isSending || !messageDraft.trim()}
                className="focus-ring w-full sm:w-auto"
              >
                {isSending ? "Sending..." : "Send Message"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void loadUpdates()}
                disabled={isLoading}
                className="focus-ring w-full sm:w-auto"
              >
                Refresh Feed
              </Button>
            </div>

            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Account-level messaging is live now. Account-level photo uploads are next in the rollout;
              current photos still originate from booking activity.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Unified Timeline</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={feedMode} onValueChange={(value) => setFeedMode(value as FeedMode)}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by content type">
                  <SelectValue placeholder="Content" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All content</SelectItem>
                  <SelectItem value="messages">Messages only</SelectItem>
                  <SelectItem value="photos">Photos only</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={contextMode}
                onValueChange={(value) => setContextMode(value as ContextMode)}
              >
                <SelectTrigger className="w-full sm:w-[210px]" aria-label="Filter by context type">
                  <SelectValue placeholder="Context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All context</SelectItem>
                  <SelectItem value="booking-linked">Booking-linked only</SelectItem>
                  <SelectItem value="unassigned">Unassigned only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {success ? (
              <Alert className="mb-3 border-emerald-200 bg-emerald-50 text-emerald-700">
                <AlertDescription className="text-emerald-700">{success}</AlertDescription>
              </Alert>
            ) : null}

            {isLoading ? (
              <DashboardLoadingState message="Loading updates..." />
            ) : filteredItems.length === 0 ? (
              <DashboardEmptyState
                title="No updates matched this view"
                description="Adjust filters or check back later for new messages and photos."
              />
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const when = new Date(item.occurredAt).toLocaleString();
                  const bookingBadge = item.booking ? `Booking ${item.booking.bookingNumber}` : "Account-level";

                  if (item.type === "message") {
                    return (
                      <article key={item.id} className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="bg-sky-100 text-sky-800">Message</Badge>
                          <span>{bookingBadge}</span>
                          <span>{when}</span>
                        </div>
                        <p className="mt-2 text-sm">{cleanMessageContent(item.content)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.senderType === "customer" ? "You" : item.senderName}
                        </p>
                      </article>
                    );
                  }

                  return (
                    <article key={item.id} className="rounded-lg border bg-card p-3 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Photo</Badge>
                        <span>{bookingBadge}</span>
                        <span>{when}</span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                        <div className="relative h-[150px] overflow-hidden rounded-md bg-muted sm:h-[170px]">
                          <Image
                            src={item.imageUrl}
                            alt={item.caption || `${item.pet.name} photo`}
                            fill
                            className="object-contain"
                            sizes="(max-width: 640px) 90vw, 170px"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{item.pet.name}</p>
                          {item.caption ? <p className="text-sm">{item.caption}</p> : null}
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {item.uploadedBy || "Staff"}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setExpandedPhoto(item)}
                            >
                              <ExternalLink className="mr-1 size-4" />
                              Open
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={item.imageUrl}
                                download={`${item.pet.name.toLowerCase().replace(/\s+/g, "-")}-update.jpg`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="mr-1 size-4" />
                                Download
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleSharePhoto(item)}
                              disabled={sharingPhotoId === item.id}
                            >
                              <Share2 className="mr-1 size-4" />
                              {sharingPhotoId === item.id ? "Sharing..." : "Share"}
                            </Button>
                          </div>
                          {item.booking ? (
                            <Link
                              className="text-xs text-primary underline"
                              href={`/dashboard/bookings/${item.booking.id}`}
                            >
                              Open booking details
                            </Link>
                          ) : (
                            <p className="text-xs text-muted-foreground">No booking linked</p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(expandedPhoto)} onOpenChange={(open) => !open && setExpandedPhoto(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          {expandedPhoto ? (
            <>
              <DialogHeader>
                <DialogTitle>{expandedPhoto.pet.name} Photo Update</DialogTitle>
                <DialogDescription>
                  {expandedPhoto.caption || "Care photo update"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="relative h-[70vh] min-h-[340px] w-full overflow-hidden rounded-md bg-muted">
                  <Image
                    src={expandedPhoto.imageUrl}
                    alt={expandedPhoto.caption || `${expandedPhoto.pet.name} photo`}
                    fill
                    className="object-contain"
                    sizes="95vw"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a
                      href={expandedPhoto.imageUrl}
                      download={`${expandedPhoto.pet.name.toLowerCase().replace(/\s+/g, "-")}-update.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="mr-1 size-4" />
                      Download
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => void handleSharePhoto(expandedPhoto)}>
                    <Share2 className="mr-1 size-4" />
                    Share
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
