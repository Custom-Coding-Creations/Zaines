"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarDays, Download, Loader2, Printer } from "lucide-react";
import { downloadICSFile } from "@/lib/calendar-export";
import { clearBookingProgress } from "@/lib/booking/progress-saver";
import { typedStorage } from "@/lib/safe-storage";
import Link from "next/link";

interface BookingData {
  id: string;
  bookingNumber?: string;
  checkIn: string;
  checkOut: string;
  suite: string;
  total: number;
  pricing?: {
    subtotal: number;
    tax: number;
    total: number;
    packageCredit?: number;
    holidaySurchargeTotal?: number;
    currency?: string;
  };
  petNames: string[];
  email: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimBookingNumber, setClaimBookingNumber] = useState("");
  const [claimRequesting, setClaimRequesting] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  // Clear booking progress on confirmation page load (booking is complete)
  useEffect(() => {
    // Clear progress-saver storage
    clearBookingProgress();
    // Clear wizard's localStorage to prevent restoration on next booking
    typedStorage.removeJson("booking-wizard-progress");
  }, []);

  useEffect(() => {
    const loadAndApplyBookingData = async () => {
      const bookingId = searchParams.get("bookingId");

      if (bookingId) {
        const storedBooking = sessionStorage.getItem(`booking-${bookingId}`);
        if (storedBooking) {
          const parsed = JSON.parse(storedBooking);
          setBooking(parsed);
          setClaimEmail(parsed.email || "");
          setClaimBookingNumber(parsed.bookingNumber || "");
        }

        try {
          const response = await fetch(`/api/bookings/${bookingId}/receipt`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              receipt?: {
                bookingId: string;
                bookingNumber: string;
                checkIn: string;
                checkOut: string;
                suite: string;
                subtotal: number;
                tax: number;
                total: number;
                currency: string;
                petNames: string[];
                customerEmail: string;
              };
            };

            if (payload.receipt) {
              setBooking((current) => ({
                id: payload.receipt?.bookingId || current?.id || bookingId,
                bookingNumber:
                  payload.receipt?.bookingNumber ||
                  current?.bookingNumber ||
                  bookingId,
                checkIn: payload.receipt?.checkIn || current?.checkIn || "",
                checkOut: payload.receipt?.checkOut || current?.checkOut || "",
                suite: payload.receipt?.suite || current?.suite || "standard",
                total: payload.receipt?.total || current?.total || 0,
                pricing: {
                  subtotal:
                    payload.receipt?.subtotal || current?.pricing?.subtotal || 0,
                  tax: payload.receipt?.tax || current?.pricing?.tax || 0,
                  total: payload.receipt?.total || current?.pricing?.total || 0,
                  currency:
                    payload.receipt?.currency ||
                    current?.pricing?.currency ||
                    "USD",
                },
                petNames: payload.receipt?.petNames || current?.petNames || [],
                email:
                  payload.receipt?.customerEmail || current?.email || "unknown",
              }));
              setClaimEmail(payload.receipt.customerEmail || "");
              setClaimBookingNumber(payload.receipt.bookingNumber || "");
            }
          }
        } catch {
          // Keep sessionStorage fallback for recovery and offline browsing.
        }
      }
      setIsLoading(false);
    };

    void loadAndApplyBookingData();
  }, [searchParams]);

  const downloadReceiptHtml = async () => {
    if (!booking?.id) return;

    setIsDownloadingReceipt(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/receipt?format=html`);
      if (!response.ok) {
        throw new Error("Unable to download receipt");
      }

      const html = await response.text();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `invoice-${booking.bookingNumber || booking.id}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const openPrintableInvoice = async () => {
    if (!booking?.id) return;

    setIsPreparingPdf(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/receipt?format=html`);
      if (!response.ok) {
        throw new Error("Unable to load printable invoice");
      }

      const html = await response.text();
      const printWindow = window.open("", "_blank", "noopener,noreferrer");

      if (!printWindow) {
        throw new Error("Popup blocked");
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
            <CardDescription>
              We couldn&apos;t find your booking information. Please check your
              email for confirmation details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDownloadCalendar = () => {
    downloadICSFile({
      bookingNumber: booking.bookingNumber || booking.id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      petNames: booking.petNames,
      suiteName: booking.suite,
    });
  };

  const subtotal = booking.pricing?.subtotal ?? booking.total;
  const tax = booking.pricing?.tax ?? 0;
  const total = booking.pricing?.total ?? booking.total;
  const packageCredit = booking.pricing?.packageCredit ?? 0;
  const holidaySurchargeTotal = booking.pricing?.holidaySurchargeTotal ?? 0;
  const currency = booking.pricing?.currency || "USD";
  const shouldShowClaimBooking = status === "unauthenticated";
  const shouldShowLinkedBookingMessage = status === "authenticated";

  const requestClaimLink = async () => {
    setClaimMessage(null);

    if (!claimEmail || !claimBookingNumber) {
      setClaimMessage("Enter your booking number and email to request a claim link.");
      return;
    }

    setClaimRequesting(true);
    try {
      const response = await fetch('/api/auth/claim-booking/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingNumber: claimBookingNumber,
          email: claimEmail,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        claimUrl?: string;
      };

      if (!response.ok) {
        setClaimMessage(payload.message || 'Unable to request booking claim link right now.');
        return;
      }

      setClaimMessage(
        payload.claimUrl
          ? `Claim link sent. Dev link: ${payload.claimUrl}`
          : 'If your booking details match, a secure claim link has been sent to your email.',
      );
    } finally {
      setClaimRequesting(false);
    }
  };

  return (
    <Card className="border-green-500 bg-green-50">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        <CardTitle className="text-center text-2xl">
          Booking Confirmed!
        </CardTitle>
        <CardDescription className="text-center">
          Thank you for choosing Zaine&apos;s Stay & Play
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-white p-6 space-y-3">
          <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking Number:</span>
              <span className="font-semibold">
                {booking.bookingNumber || booking.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dates:</span>
              <span className="font-medium">
                {new Date(booking.checkIn).toLocaleDateString()} to{" "}
                {new Date(booking.checkOut).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suite:</span>
              <span className="font-medium capitalize">{booking.suite}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">
                {currency} ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax:</span>
              <span className="font-medium">
                {currency} ${tax.toFixed(2)}
              </span>
            </div>
            {packageCredit > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package Credit:</span>
                <span className="font-medium text-emerald-600">
                  -{currency} ${packageCredit.toFixed(2)}
                </span>
              </div>
            ) : null}
            {holidaySurchargeTotal > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Holiday Surcharge:</span>
                <span className="font-medium text-amber-700">
                  {currency} ${holidaySurchargeTotal.toFixed(2)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-green-600">
                {currency} ${total.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pets:</span>
              <span className="font-medium">{booking.petNames.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact:</span>
              <span className="font-medium">{booking.email}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            📧 A confirmation email has been sent to{" "}
            <strong>{booking.email}</strong>
          </p>
          <p className="mt-2 text-sm text-blue-900">
            📱 You can view and manage your booking in your dashboard.
          </p>
          <p className="mt-2 text-sm text-blue-900">
            Need help? Visit our <Link href="/contact" className="underline font-medium">support page</Link> or call the front desk.
          </p>
        </div>
        {shouldShowClaimBooking ? (
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-semibold">Claim this booking to your account</h4>
            <p className="text-sm text-muted-foreground">
              Continue as guest now and claim account access afterward with a secure email link.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={claimBookingNumber}
                onChange={(event) => setClaimBookingNumber(event.target.value)}
                placeholder="Booking number"
              />
              <input
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={claimEmail}
                onChange={(event) => setClaimEmail(event.target.value)}
                placeholder="Email"
                type="email"
              />
            </div>
            <Button variant="outline" onClick={() => { void requestClaimLink(); }} disabled={claimRequesting}>
              {claimRequesting ? 'Sending...' : 'Send Claim Link'}
            </Button>
            {claimMessage ? <p className="text-xs text-muted-foreground">{claimMessage}</p> : null}
          </div>
        ) : shouldShowLinkedBookingMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h4 className="font-semibold text-emerald-900">Booking linked to your account</h4>
            <p className="mt-1 text-sm text-emerald-800">
              You are signed in, so this reservation is already managed from your dashboard.
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button onClick={handleDownloadCalendar} variant="outline">
            <CalendarDays className="mr-2 h-4 w-4" />
            Add to Calendar
          </Button>
          <Button
            onClick={() => {
              void downloadReceiptHtml();
            }}
            variant="outline"
            disabled={isDownloadingReceipt}
          >
            {isDownloadingReceipt ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Premium Receipt (HTML)
          </Button>
          <Button
            onClick={() => {
              void openPrintableInvoice();
            }}
            variant="outline"
            disabled={isPreparingPdf}
          >
            {isPreparingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Save PDF Invoice
          </Button>
          <Button asChild>
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
