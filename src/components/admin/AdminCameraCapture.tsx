"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Sparkles } from "lucide-react";
import { retryWithBackoff } from "@/lib/retry";
import { safeJsonResponse } from "@/lib/safe-json-response";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type BookingOption = {
  id: string;
  bookingNumber: string;
  status: string;
  checkInDate?: string;
  user: { id?: string; name: string | null; email: string | null } | null;
  bookingPets: Array<{ pet: { id: string; name: string; breed: string } | null }>;
};

type PetOption = {
  id: string;
  name: string;
  breed: string;
  userId: string;
  user?: { id?: string; email?: string | null; name?: string | null };
};

type BookedPetOption = {
  key: string;
  bookingId: string;
  petId: string;
  petName: string;
  breed: string;
  ownerLabel: string;
  bookingLabel: string;
};

const BORDER_OPTIONS = [
  { value: "none", label: "No border", previewClass: "" },
  { value: "polaroid", label: "Polaroid", previewClass: "border-8 border-white shadow-lg" },
  { value: "gold", label: "Golden Frame", previewClass: "border-6 border-amber-300 shadow-md" },
  { value: "paw", label: "Paw Pattern", previewClass: "border-6 border-rose-200" },
] as const;

const EMOJI_OPTIONS = ["", "🐾", "🎾", "🦴", "💤", "❤️", "✨"] as const;
const NO_EMOJI_VALUE = "__none__";
const CLIENT_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const CLIENT_MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function buildOwnerLabel(booking: BookingOption): string {
  return booking.user?.name ?? booking.user?.email ?? "Pet Parent";
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    img.src = url;
  });
}

async function applyDecorativeFrameToImage(
  sourceFile: File,
  decorativeBorder: (typeof BORDER_OPTIONS)[number]["value"],
): Promise<File> {
  if (decorativeBorder === "none") {
    return sourceFile;
  }

  const image = await loadImageFromFile(sourceFile);
  const baseWidth = image.naturalWidth || image.width;
  const baseHeight = image.naturalHeight || image.height;
  const borderThickness = Math.max(18, Math.floor(Math.min(baseWidth, baseHeight) * 0.07));
  const polaroidBottomExtra = decorativeBorder === "polaroid"
    ? Math.max(26, Math.floor(borderThickness * 1.1))
    : 0;

  const canvas = document.createElement("canvas");
  canvas.width = baseWidth + borderThickness * 2;
  canvas.height = baseHeight + borderThickness * 2 + polaroidBottomExtra;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return sourceFile;
  }

  const drawPawPattern = () => {
    ctx.fillStyle = "#f9c6d1";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(170, 78, 112, 0.35)";
    ctx.font = `${Math.max(14, Math.floor(borderThickness * 0.45))}px sans-serif`;
    const step = Math.max(22, Math.floor(borderThickness * 0.9));
    for (let y = step; y < canvas.height; y += step) {
      for (let x = step; x < canvas.width; x += step) {
        if (
          x > borderThickness &&
          x < canvas.width - borderThickness &&
          y > borderThickness &&
          y < canvas.height - borderThickness
        ) {
          continue;
        }
        ctx.fillText("🐾", x, y);
      }
    }
  };

  if (decorativeBorder === "polaroid") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (decorativeBorder === "gold") {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#fdf5c4");
    gradient.addColorStop(0.5, "#e0b342");
    gradient.addColorStop(1, "#9a7420");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    drawPawPattern();
  }

  if (decorativeBorder === "gold") {
    ctx.strokeStyle = "rgba(123, 89, 19, 0.8)";
    ctx.lineWidth = Math.max(4, Math.floor(borderThickness * 0.18));
    ctx.strokeRect(
      Math.floor(borderThickness * 0.15),
      Math.floor(borderThickness * 0.15),
      canvas.width - Math.floor(borderThickness * 0.3),
      canvas.height - Math.floor(borderThickness * 0.3),
    );
  }

  ctx.drawImage(image, borderThickness, borderThickness, baseWidth, baseHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });

  if (!blob) {
    return sourceFile;
  }

  const sanitizedName = sourceFile.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${sanitizedName}-framed.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function AdminCameraCapture() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [selectedBookedPetKey, setSelectedBookedPetKey] = useState("");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const [sendMessage, setSendMessage] = useState(true);
  const [decorativeBorder, setDecorativeBorder] =
    useState<(typeof BORDER_OPTIONS)[number]["value"]>("none");
  const [decorativeEmoji, setDecorativeEmoji] =
    useState<(typeof EMOJI_OPTIONS)[number]>("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    let nextPreviewUrl = "";
    try {
      nextPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(nextPreviewUrl);
    } catch (previewError) {
      console.error("[Camera] Failed to create preview URL", previewError);
      setPreviewUrl("");
      setError("Unable to preview this photo. Please retake and try again.");
      return;
    }

    return () => {
      if (nextPreviewUrl) {
        URL.revokeObjectURL(nextPreviewUrl);
      }
    };
  }, [file]);

  const bookedPets = useMemo<BookedPetOption[]>(() => {
    return bookings.flatMap((booking) => {
      const ownerLabel = buildOwnerLabel(booking);
      return booking.bookingPets
        .map((bookingPet) => bookingPet.pet)
        .filter((pet): pet is NonNullable<typeof pet> => Boolean(pet))
        .map((pet) => ({
          key: `${booking.id}::${pet.id}`,
          bookingId: booking.id,
          petId: pet.id,
          petName: pet.name,
          breed: pet.breed,
          ownerLabel,
          bookingLabel: booking.bookingNumber,
        }));
    });
  }, [bookings]);

  const selectedBookedPet = useMemo(() => {
    return bookedPets.find((pet) => pet.key === selectedBookedPetKey) ?? null;
  }, [bookedPets, selectedBookedPetKey]);

  const bookingsMissingPets = useMemo(() => {
    return bookings
      .filter((booking) => {
        const hasLinkedPet = booking.bookingPets.some((bookingPet) => Boolean(bookingPet.pet));
        return !hasLinkedPet;
      })
      .map((booking) => booking.bookingNumber);
  }, [bookings]);

  const previewBorderClass = useMemo(() => {
    return BORDER_OPTIONS.find((option) => option.value === decorativeBorder)?.previewClass ?? "";
  }, [decorativeBorder]);

  async function loadBookedPets() {
    setLoading(true);
    setError("");

    try {
      const checkedInResponse = await fetch("/api/admin/bookings?status=checked_in", { cache: "no-store" });
      const checkedInPayload = await safeJsonResponse<{
        success?: boolean;
        data?: BookingOption[];
        bookings?: BookingOption[];
        error?: string;
      }>(checkedInResponse, {});

      if (!checkedInResponse.ok) {
        throw new Error(checkedInPayload.error ?? "Unable to load checked-in bookings.");
      }

      let nextBookings = checkedInPayload.data ?? checkedInPayload.bookings ?? [];

      // Fallback: include today's confirmed bookings when checked_in status is empty.
      if (nextBookings.length === 0) {
        const today = new Date().toISOString().split("T")[0];
        const confirmedResponse = await fetch(
          `/api/admin/bookings?status=confirmed&startDate=${today}&endDate=${today}`,
          { cache: "no-store" },
        );
        const confirmedPayload = await safeJsonResponse<{
          data?: BookingOption[];
          bookings?: BookingOption[];
        }>(confirmedResponse, {});
        if (confirmedResponse.ok) {
          nextBookings = confirmedPayload.data ?? confirmedPayload.bookings ?? [];
        }
      }

      // Occupancy feed can include currently checked-in pets even if bookings feed is stale.
      const occupancyResponse = await fetch("/api/admin/occupancy", { cache: "no-store" });
      const occupancyPayload = await safeJsonResponse<{
        suites?: Array<{
          bookings?: Array<{
            id: string;
            bookingNumber: string;
            checkInDate?: string;
            guest?: { id?: string; name?: string | null; email?: string | null } | null;
            pets?: Array<{ id: string; name: string; breed: string } | null>;
          }>;
        }>;
      }>(occupancyResponse, {});

      if (occupancyResponse.ok) {
        const occupancyBookings: BookingOption[] = (occupancyPayload.suites ?? [])
          .flatMap((suite) => suite.bookings ?? [])
          .map((booking) => ({
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: "checked_in",
            checkInDate: booking.checkInDate,
            user: {
              id: booking.guest?.id,
              name: booking.guest?.name ?? null,
              email: booking.guest?.email ?? null,
            },
            bookingPets: (booking.pets ?? []).map((pet) => ({ pet })),
          }));

        if (nextBookings.length === 0) {
          nextBookings = occupancyBookings;
        } else {
          const existingBookingIds = new Set(nextBookings.map((booking) => booking.id));
          const missingBookings = occupancyBookings.filter((booking) => !existingBookingIds.has(booking.id));
          if (missingBookings.length > 0) {
            nextBookings = [...nextBookings, ...missingBookings];
          }
        }
      }

      const needsPetHydration = nextBookings.some((booking) => booking.bookingPets.length === 0);

      if (needsPetHydration) {
        const petsResponse = await fetch('/api/admin/pets?limit=200', { cache: 'no-store' });
        const petsPayload = await safeJsonResponse<{ pets?: PetOption[] }>(petsResponse, {});
        if (petsResponse.ok) {
          const pets = petsPayload.pets ?? [];
          nextBookings = nextBookings.map((booking) => {
            if (booking.bookingPets.length > 0 || !booking.user?.id) {
              return booking;
            }

            const ownerPets = pets.filter((pet) => {
              if (booking.user?.id && pet.userId === booking.user.id) {
                return true;
              }

              const bookingEmail = booking.user?.email?.toLowerCase();
              if (bookingEmail && pet.user?.email?.toLowerCase() === bookingEmail) {
                return true;
              }

              const bookingName = booking.user?.name?.trim().toLowerCase();
              if (bookingName && pet.user?.name?.trim().toLowerCase() === bookingName) {
                return true;
              }

              return false;
            });
            return {
              ...booking,
              bookingPets: ownerPets.map((pet) => ({
                pet: {
                  id: pet.id,
                  name: pet.name,
                  breed: pet.breed,
                },
              })),
            };
          });
        }
      }

      setBookings(nextBookings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load booked pets.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  function resetComposerState() {
    setOpen(false);
    setFile(null);
    setCaption("");
    setMessage("");
    setSendMessage(true);
    setDecorativeBorder("none");
    setDecorativeEmoji("");
    setError("");
  }

  async function handleFileSelection(nextFile: File | null) {
    if (!nextFile) {
      return;
    }

    if (!CLIENT_ALLOWED_IMAGE_TYPES.includes(nextFile.type)) {
      setError("Unsupported photo format. Please use JPG or PNG.");
      setFile(null);
      setOpen(false);
      return;
    }

    if (nextFile.size > CLIENT_MAX_IMAGE_SIZE) {
      setError("Photo is too large. Please choose an image under 5MB.");
      setFile(null);
      setOpen(false);
      return;
    }

    setFile(nextFile);
    setSuccess("");
    setError("");

    if (bookings.length === 0) {
      await loadBookedPets();
    }

    setOpen(true);
  }

  async function handleOpenCamera() {
    setSuccess("");
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }

    // Non-blocking preload so the click interaction stays responsive.
    void loadBookedPets();
  }

  useEffect(() => {
    if (!bookedPets.length) {
      setSelectedBookedPetKey("");
      return;
    }

    if (!bookedPets.some((pet) => pet.key === selectedBookedPetKey)) {
      setSelectedBookedPetKey(bookedPets[0]?.key ?? "");
    }
  }, [bookedPets, selectedBookedPetKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Capture or choose a photo before submitting.");
      return;
    }

    if (!selectedBookedPet) {
      setError("Choose a currently booked pet.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("bookingId", selectedBookedPet.bookingId);
      formData.set("petId", selectedBookedPet.petId);
      formData.set("caption", caption.trim());
      formData.set("message", message.trim());
      formData.set("sendMessage", String(sendMessage));
      formData.set("decorativeBorder", decorativeBorder);
      formData.set("decorativeEmoji", decorativeEmoji);
      const framedFile = await applyDecorativeFrameToImage(file, decorativeBorder);
      formData.set("file", framedFile);

      const response = await retryWithBackoff(
        () =>
          fetch("/api/admin/photos", {
            method: "POST",
            body: formData,
          }),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          onAttempt: (attempt, lastError) => {
            if (attempt > 1) {
              console.warn(`[Camera] Retry attempt ${attempt}: ${lastError.message}`);
            }
          },
        },
      );

      const payload = await safeJsonResponse<{ error?: string }>(response, {});
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit photo update.");
      }

      setSuccess(
        sendMessage
          ? "Photo captured and posted to the customer feed with your message."
          : "Photo captured and posted to the customer feed.",
      );
      resetComposerState();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the camera update.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          void handleFileSelection(nextFile);
        }}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Capture pet update"
        title="Capture pet update"
        onClick={() => void handleOpenCamera()}
      >
        <Camera className="size-4" />
      </Button>

      {success ? <p className="hidden lg:block text-xs text-green-700">{success}</p> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Capture Pet Update</DialogTitle>
            <DialogDescription>
              Take a photo, choose the currently booked pet, and post directly to the customer feed.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="rounded-md border bg-muted/20 p-2">
                  {previewUrl ? (
                    <div className={`overflow-hidden rounded-md ${previewBorderClass}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Captured pet"
                        className="h-56 w-full object-cover"
                        onError={() => {
                          setPreviewUrl("");
                          setError("Unable to render this photo preview. Please retake the photo.");
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                      No photo selected.
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.value = "";
                      inputRef.current.click();
                    }
                  }}
                >
                  Retake / Choose Another
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Currently Booked Pet</Label>
                  <Select value={selectedBookedPetKey} onValueChange={setSelectedBookedPetKey}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {bookedPets.map((pet) => (
                        <SelectItem key={pet.key} value={pet.key}>
                          {pet.petName} ({pet.breed}) • {pet.bookingLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBookedPet ? (
                    <p className="text-xs text-muted-foreground">
                      Parent: {selectedBookedPet.ownerLabel}
                    </p>
                  ) : null}
                  {!loading && bookedPets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No checked-in pets available right now.</p>
                  ) : null}
                  {bookingsMissingPets.length > 0 ? (
                    <p className="text-xs text-amber-700">
                      Missing pet links for checked-in bookings: {bookingsMissingPets.join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="camera-caption">Photo Caption</Label>
                  <Input
                    id="camera-caption"
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    maxLength={200}
                    placeholder="Short caption for this moment"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="camera-message">Message to Parent</Label>
                  <Textarea
                    id="camera-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={5000}
                    rows={4}
                    placeholder="Optional context to include in the message feed"
                  />
                  <p className="text-xs text-muted-foreground">{message.length}/5000</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Decorative Border</Label>
                    <Select
                      value={decorativeBorder}
                      onValueChange={(value) => {
                        setDecorativeBorder(value as (typeof BORDER_OPTIONS)[number]["value"]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BORDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Emoji Accent</Label>
                    <Select
                      value={decorativeEmoji || NO_EMOJI_VALUE}
                      onValueChange={(value) => {
                        setDecorativeEmoji(
                          value === NO_EMOJI_VALUE ? "" : (value as (typeof EMOJI_OPTIONS)[number]),
                        );
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_EMOJI_VALUE}>None</SelectItem>
                        {EMOJI_OPTIONS.filter(Boolean).map((emoji) => (
                          <SelectItem key={emoji} value={emoji}>
                            {emoji}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-md border p-3">
                  <Checkbox
                    id="send-message-toggle"
                    checked={sendMessage}
                    onCheckedChange={(checked) => setSendMessage(Boolean(checked))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="send-message-toggle">Also post a message update</Label>
                    <p className="text-xs text-muted-foreground">
                      Creates a staff message in the same booking feed so parents see text + photo together.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || loading || !selectedBookedPet || !file}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Post Update
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
