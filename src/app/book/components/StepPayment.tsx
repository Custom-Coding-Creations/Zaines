"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import {
  stepPaymentSchema,
  type StepPaymentData,
} from "@/lib/validations/booking-wizard";
import {
  BOOKING_PRICING_DISCLOSURE,
  BOOKING_PRICING_MODEL_LABEL,
} from "@/lib/booking/pricing";
import { getStripe } from "@/lib/stripe-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSettings } from "@/providers/settings-provider";
import { CheckoutReassurancePanel } from "@/components/checkout/CheckoutReassurancePanel";

interface StepPaymentProps {
  data: Partial<StepPaymentData> & {
    clientSecret?: string;
    paymentMode?: "payment_element" | "embedded_checkout";
    pricingDisclosureAccepted?: boolean;
    bookingId?: string;
  };
  onUpdate: (
    data: Partial<StepPaymentData> & {
      clientSecret?: string;
      paymentMode?: "payment_element" | "embedded_checkout";
      pricingDisclosureAccepted?: boolean;
      bookingId?: string;
    },
  ) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  totalAmount: number; // From previous steps
  pricingQuote: {
    subtotal: number;
    tax: number;
    total: number;
    packageCredit?: number;
    holidaySurchargeTotal?: number;
    appliedHolidaySurcharges?: Array<{
      id: string;
      name: string;
      amount: number;
      surchargeType: 'flat' | 'percentage';
    }>;
    appliedPackage?: {
      packageId: string;
      packageName: string;
      customerPackageId: string;
    } | null;
    currency: string;
    pricingModelLabel: string;
    disclosure: string;
  } | null;
  bookingPayload: {
    checkIn: string;
    checkOut: string;
    suiteType: "standard" | "deluxe" | "luxury";
    petCount: number;
    petIds?: string[];
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    petNames: string;
    specialRequests?: string;
    addOns?: Array<{ id: string; quantity: number }>;
    newPets?: Array<{
      name: string;
      breed: string;
      age: number;
      weight: number;
      gender: "male" | "female";
      temperament?: "friendly" | "shy" | "energetic" | "calm" | "anxious";
      specialNeeds?: string;
      feedingInstructions?: string;
    }>;
    vaccines?: Array<{
      petId: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
    }>;
    reuseExistingWaivers?: boolean;
    waiver: {
      liabilityAccepted: boolean;
      medicalAuthorizationAccepted: boolean;
      photoReleaseAccepted: boolean;
      policyAcknowledgmentAccepted: boolean;
      signature?: string;
    };
  } | null;
}

type VaccineBookingIssue = {
  id: string;
  name?: string;
  missingRequiredVaccines?: string[];
  expiredRequiredVaccines?: string[];
};

type BookingErrorDetailsState = {
  pets: VaccineBookingIssue[];
  requiredVaccines: string[];
  resolutionPath: string;
  resolutionMessage?: string;
};

type BookingCreateErrorPayload = {
  error?: string;
  message?: string;
  errorCode?: string;
  code?: string;
  details?: {
    pets?: VaccineBookingIssue[];
    requiredVaccines?: string[];
    resolutionPath?: string;
    resolutionMessage?: string;
  };
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseBookingCreateError(payload: BookingCreateErrorPayload): {
  message: string;
  details: BookingErrorDetailsState | null;
} {
  const fallbackMessage =
    payload.error || payload.message || "Failed to initialize booking payment.";
  const errorCode = payload.errorCode || payload.code;

  if (errorCode !== "BOOKING_REQUIRES_CURRENT_VACCINES") {
    return {
      message: fallbackMessage,
      details: null,
    };
  }

  const pets = Array.isArray(payload.details?.pets)
    ? payload.details?.pets.filter((pet): pet is VaccineBookingIssue =>
        Boolean(pet && typeof pet.id === "string"),
      )
    : [];

  const requiredVaccines = normalizeStringArray(payload.details?.requiredVaccines);
  const resolutionPath =
    typeof payload.details?.resolutionPath === "string" &&
    payload.details.resolutionPath.startsWith("/")
      ? payload.details.resolutionPath
      : "/dashboard/records";

  const details: BookingErrorDetailsState = {
    pets,
    requiredVaccines,
    resolutionPath,
    resolutionMessage:
      typeof payload.details?.resolutionMessage === "string"
        ? payload.details.resolutionMessage
        : undefined,
  };

  return {
    message: fallbackMessage,
    details,
  };
}

function PricingDisclosureCard({
  subtotal,
  tax,
  totalWithTax,
  packageCredit,
  appliedPackageName,
  appliedHolidaySurcharges,
  disclosure,
  pricingDisclosureAccepted,
  onPricingDisclosureChange,
}: {
  subtotal: number;
  tax: number;
  totalWithTax: number;
  packageCredit: number;
  appliedPackageName?: string | null;
  appliedHolidaySurcharges: Array<{ id: string; name: string; amount: number }>;
  disclosure: string;
  pricingDisclosureAccepted: boolean;
  onPricingDisclosureChange: (accepted: boolean) => void;
}) {
  return (
    <>
      <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {packageCredit > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>{appliedPackageName || 'Package credit'}</span>
              <span>-${packageCredit.toFixed(2)}</span>
            </div>
          ) : null}
          {appliedHolidaySurcharges.map((surcharge) => (
            <div key={surcharge.id} className="flex justify-between text-amber-700">
              <span>{surcharge.name}</span>
              <span>${surcharge.amount.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total before confirmation</span>
            <span>${totalWithTax.toFixed(2)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{disclosure}</p>
      </div>

      <div className="flex items-start space-x-3 rounded-xl border border-border/70 p-4">
        <Checkbox
          id="pricing-disclosure"
          checked={pricingDisclosureAccepted}
          onCheckedChange={(checked) =>
            onPricingDisclosureChange(Boolean(checked))
          }
        />
        <Label
          htmlFor="pricing-disclosure"
          className="cursor-pointer text-sm leading-relaxed"
        >
          I reviewed this pre-confirmation estimate and understand no hidden
          fees, no surprise add-ons, or other undisclosed charges are introduced
          at checkout.
        </Label>
      </div>
    </>
  );
}

function PaymentForm({
  onSuccess,
  onBack,
  onRecover,
  disclosureAccepted,
  totalWithTax,
  actionLabel,
  premiumLoadingEnabled,
}: {
  onSuccess: () => void;
  onBack: () => void;
  onRecover: () => void;
  disclosureAccepted: boolean;
  totalWithTax: number;
  actionLabel: string;
  premiumLoadingEnabled: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setSubmitError("");

    try {
      // With Checkout Sessions (ui_mode: "elements"), confirmPayment works seamlessly
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        const message = error.message || "Payment failed";
        setSubmitError(message);
        toast.error(message);
        setIsProcessing(false);
      } else if (
        paymentIntent &&
        ["succeeded", "processing", "requires_capture"].includes(
          paymentIntent.status,
        )
      ) {
        toast.success("Payment successful!");
        onSuccess();
      } else {
        const statusLabel = paymentIntent?.status || "unknown";
        const message = `Payment status is ${statusLabel}. Please retry or refresh your payment session.`;
        setSubmitError(message);
        toast.error(message);
        setIsProcessing(false);
      }
    } catch {
      const message = "An error occurred during payment";
      setSubmitError(message);
      toast.error(message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: {
            type: "tabs",
            defaultCollapsed: false,
          },
        }}
      />
      {isProcessing && premiumLoadingEnabled ? (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {actionLabel}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifying your payment details and securing your reservation.
          </p>
        </div>
      ) : null}
      {submitError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">Payment needs attention</p>
          <p className="text-xs text-muted-foreground">{submitError}</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRecover}>
              Refresh Payment Session
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSubmitError("")}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          className="focus-ring"
          onClick={onBack}
          disabled={isProcessing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="submit"
          className="focus-ring"
          disabled={!stripe || isProcessing || !disclosureAccepted}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {actionLabel} ${totalWithTax.toFixed(2)}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function StepPayment({
  data,
  onUpdate,
  onNext,
  onBack,
  onCancel,
  totalAmount,
  pricingQuote,
  bookingPayload,
}: StepPaymentProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const [clientSecret, setClientSecret] = useState(data.clientSecret || "");
  const [paymentMode, setPaymentMode] = useState<
    "payment_element" | "embedded_checkout"
  >(data.paymentMode || "payment_element");
  const [bookingId, setBookingId] = useState(data.bookingId || "");
  const [pricingDisclosureAccepted, setPricingDisclosureAccepted] = useState(
    Boolean(data.pricingDisclosureAccepted),
  );
  const [bookingError, setBookingError] = useState<string>("");
  const [bookingErrorDetails, setBookingErrorDetails] =
    useState<BookingErrorDetailsState | null>(null);
  const [quickPayError, setQuickPayError] = useState<string>("");
  const [quickPayHint, setQuickPayHint] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveringPayment, setIsRecoveringPayment] = useState(false);
  const [isOneClickSubmitting, setIsOneClickSubmitting] = useState(false);
  const [isLoadingDefaultSavedMethod, setIsLoadingDefaultSavedMethod] = useState(false);
  const [defaultSavedMethod, setDefaultSavedMethod] = useState<{
    id: string;
    brand: string | null;
    last4: string | null;
  } | null>(null);
  const hasAutoInitAttempted = useRef(Boolean(data.bookingId));
  const hasAutoRecoveryAttempted = useRef(false);
  const shouldSyncSeededPaymentState = useRef(Boolean(data.bookingId));
  const hasSyncedSeededPaymentState = useRef(false);
  const subtotal = Math.round((pricingQuote?.subtotal || 0) * 100) / 100;
  const tax = Math.round((pricingQuote?.tax || 0) * 100) / 100;
  const packageCredit = Math.round((pricingQuote?.packageCredit || 0) * 100) / 100;
  const appliedHolidaySurcharges = pricingQuote?.appliedHolidaySurcharges || [];
  const totalWithTax =
    Math.round((pricingQuote?.total || totalAmount) * 100) / 100;
  const disclosure = pricingQuote?.disclosure || BOOKING_PRICING_DISCLOSURE;
  const supportPhone = settings?.contactPhone || "(315) 657-1332";
  const supportEmail = settings?.contactEmail || "jgibbs@zainesstayandplay.com";
  const activeTestimonials =
    settings?.testimonialsSettings?.testimonials
      ?.filter((testimonial) => testimonial.isActive)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .slice(0, 2)
      .map((testimonial) => ({
        id: testimonial.id,
        author: testimonial.author,
        petName: testimonial.petName,
        text: testimonial.text,
        rating: testimonial.rating,
      })) || [];

  const stripeFlags = settings?.stripeCapabilityFlags;
  const premiumReassuranceEnabled =
    stripeFlags?.premiumCheckoutReassuranceEnabled ?? false;
  const premiumCopyEnabled = stripeFlags?.premiumCheckoutCopyEnabled ?? false;
  const premiumTrustIndicatorsEnabled =
    stripeFlags?.premiumCheckoutTrustIndicatorsEnabled ?? false;
  const premiumLoadingExperienceEnabled =
    stripeFlags?.premiumCheckoutLoadingExperienceEnabled ?? false;
  const oneClickRebookingEnabled =
    (stripeFlags?.savedPaymentMethodsEnabled ?? false) &&
    (stripeFlags?.oneClickRebookingEnabled ?? false);
  const leadPetName = bookingPayload?.petNames
    ?.split(",")
    ?.map((name) => name.trim())
    ?.find((name) => name.length > 0);
  const personalizedActionLabel = premiumCopyEnabled
    ? leadPetName
      ? `Reserve ${leadPetName}'s Stay`
      : "Secure Your Stay"
    : "Confirm & Pay";

  const handleDisclosureChange = (accepted: boolean) => {
    setPricingDisclosureAccepted(accepted);
    onUpdate({ pricingDisclosureAccepted: accepted });
  };

  const finalizeBooking = () => {
    if (!bookingId || !bookingPayload) {
      toast.error("Booking details are incomplete. Please retry.");
      return;
    }

    if (!pricingDisclosureAccepted) {
      toast.error("Please acknowledge pricing disclosure before confirming.");
      return;
    }

    const validation = stepPaymentSchema.safeParse({
      paymentOption: "full",
      amount: totalWithTax,
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    onUpdate({
      paymentOption: "full",
      amount: totalWithTax,
      pricingDisclosureAccepted,
      bookingId,
    });

    onNext();
    router.push(`/book/confirmation?bookingId=${bookingId}`);
  };

  const handleAlreadyCompletedPayment = useCallback(() => {
    if (!bookingId) {
      return;
    }

    toast.success("Payment already completed. Redirecting to confirmation.");
    onUpdate({ bookingId, pricingDisclosureAccepted });
    onNext();
    router.push(`/book/confirmation?bookingId=${bookingId}`);
  }, [bookingId, onNext, onUpdate, pricingDisclosureAccepted, router]);

  const initializeBookingAndPayment = useCallback(async () => {
    if (!bookingPayload) {
      setBookingError("Complete all previous steps before submitting payment.");
      return;
    }

    if (!pricingQuote) {
      setBookingError("Pricing validation is required before payment.");
      return;
    }

    setBookingError("");
    setBookingErrorDetails(null);
    setIsLoading(true);
    let hasStructuredBookingError = false;

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        const errorBody =
          (await response.json().catch(() => ({}))) as BookingCreateErrorPayload;
        const parsedError = parseBookingCreateError(errorBody);
        setBookingError(parsedError.message);
        setBookingErrorDetails(parsedError.details);
        hasStructuredBookingError = parsedError.details !== null;
        throw new Error(parsedError.message);
      }

      const payload = (await response.json()) as {
        booking: { id: string; bookingNumber?: string };
        pricing: {
          subtotal: number;
          tax: number;
          total: number;
          currency: string;
        };
        payment?: {
          clientSecret?: string;
          mode?: "payment_element" | "embedded_checkout";
        };
      };

      if (Math.abs(payload.pricing.total - pricingQuote.total) > 0.01) {
        throw new Error(
          "Pricing changed during booking. Please review and retry.",
        );
      }

      const nextBookingId = payload.booking.id;
      const nextClientSecret = payload.payment?.clientSecret || "";
      const nextPaymentMode = payload.payment?.mode || "payment_element";

      sessionStorage.setItem(
        `booking-${nextBookingId}`,
        JSON.stringify({
          id: nextBookingId,
          bookingNumber: payload.booking.bookingNumber || nextBookingId,
          checkIn: bookingPayload.checkIn,
          checkOut: bookingPayload.checkOut,
          suite: bookingPayload.suiteType,
          pricing: {
            subtotal: payload.pricing.subtotal,
            tax: payload.pricing.tax,
            total: payload.pricing.total,
            currency: payload.pricing.currency || "USD",
          },
          total: payload.pricing.total,
          petNames: bookingPayload.petNames
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name.length > 0),
          email: bookingPayload.email,
        }),
      );

      setBookingId(nextBookingId);
      setClientSecret(nextClientSecret);
      setPaymentMode(nextPaymentMode);
      onUpdate({
        bookingId: nextBookingId,
        clientSecret: nextClientSecret,
        paymentMode: nextPaymentMode,
      });
    } catch (error: unknown) {
      if (!hasStructuredBookingError) {
        setBookingErrorDetails(null);
      }
      const message =
        error instanceof Error
          ? error.message
          : "Failed to initialize payment. Please try again.";
      setBookingError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [bookingPayload, onUpdate, pricingQuote]);

  const setupPaymentForExistingBooking = useCallback(async () => {
    if (!bookingId) return;

    setIsRecoveringPayment(true);
    setBookingError("");

    try {
      const response = await fetch("/api/payments/setup-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          preferredFlow: paymentMode,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        clientSecret?: string;
        paymentMode?: "payment_element" | "embedded_checkout";
        message?: string;
        error?: string;
        errorCode?: string;
        code?: string;
      };

      const paymentErrorCode = payload.errorCode || payload.code;
      if (!response.ok && paymentErrorCode === "PAYMENT_ALREADY_COMPLETED") {
        handleAlreadyCompletedPayment();
        return;
      }

      if (!response.ok || !payload.clientSecret) {
        throw new Error(
          payload.error ||
            payload.message ||
            "Unable to initialize booking payment. Please retry.",
        );
      }

      const nextMode = payload.paymentMode || paymentMode;
      setClientSecret(payload.clientSecret);
      setPaymentMode(nextMode);
      onUpdate({
        bookingId,
        clientSecret: payload.clientSecret,
        paymentMode: nextMode,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to initialize booking payment. Please retry.";
      setBookingError(message);
      toast.error(message);
    } finally {
      setIsRecoveringPayment(false);
    }
  }, [
    bookingId,
    handleAlreadyCompletedPayment,
    onUpdate,
    paymentMode,
  ]);

  const loadDefaultSavedMethod = useCallback(async () => {
    if (!oneClickRebookingEnabled) {
      setDefaultSavedMethod(null);
      setIsLoadingDefaultSavedMethod(false);
      return;
    }

    setIsLoadingDefaultSavedMethod(true);
    try {
      const response = await fetch("/api/payments/payment-methods", {
        method: "GET",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        paymentMethods?: Array<{
          id: string;
          brand: string | null;
          last4: string | null;
          isDefault: boolean;
        }>;
      };

      if (!response.ok || !payload.paymentMethods) {
        setDefaultSavedMethod(null);
        return;
      }

      const defaultMethod =
        payload.paymentMethods.find((method) => method.isDefault) || null;

      setDefaultSavedMethod(
        defaultMethod
          ? {
              id: defaultMethod.id,
              brand: defaultMethod.brand,
              last4: defaultMethod.last4,
            }
          : null,
      );
    } catch {
      setDefaultSavedMethod(null);
    } finally {
      setIsLoadingDefaultSavedMethod(false);
    }
  }, [oneClickRebookingEnabled]);

  const handleOneClickPayment = useCallback(async () => {
    if (!bookingId) return;

    if (!pricingDisclosureAccepted) {
      toast.error("Please acknowledge pricing disclosure before confirming.");
      return;
    }

    setQuickPayError("");
    setQuickPayHint("");
    setIsOneClickSubmitting(true);

    try {
      const response = await fetch("/api/payments/one-click-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        succeeded?: boolean;
        status?: string;
        paymentIntentId?: string;
        message?: string;
        error?: string;
        errorCode?: string;
        details?: {
          clientSecret?: string | null;
        };
      };

      if (!response.ok) {
        if (payload.errorCode === "PAYMENT_ALREADY_COMPLETED") {
          handleAlreadyCompletedPayment();
          return;
        }

        if (payload.errorCode === "ONE_CLICK_REQUIRES_ACTION") {
          const fallbackClientSecret = payload.details?.clientSecret;
          if (fallbackClientSecret && fallbackClientSecret.startsWith("pi_")) {
            setPaymentMode("payment_element");
            setClientSecret(fallbackClientSecret);
            onUpdate({
              bookingId,
              paymentMode: "payment_element",
              clientSecret: fallbackClientSecret,
            });
          } else {
            setBookingError("Refreshing payment session...");
            await setupPaymentForExistingBooking();
          }
          setQuickPayHint(
            "Card authentication required. Continue below in secure checkout.",
          );
          toast.error("Additional verification required for your saved card.");
          return;
        }

        if (payload.errorCode === "ONE_CLICK_CARD_DECLINED") {
          setQuickPayError(
            "Saved card was declined. Use secure checkout or update your default card.",
          );
          toast.error("Saved card was declined.");
          return;
        }

        if (payload.errorCode === "DEFAULT_PAYMENT_METHOD_REQUIRED") {
          setDefaultSavedMethod(null);
          setQuickPayHint(
            "Add a default card in Wallet, then return and retry one-click.",
          );
          setQuickPayError(
            "No default saved card is configured. Add one in your wallet, then retry one-click checkout.",
          );
          toast.error("Set a default saved card to use one-click.");
          return;
        }

        throw new Error(
          payload.message ||
            payload.error ||
            "Unable to process one-click payment.",
        );
      }

      if (payload.succeeded || payload.status === "succeeded") {
        toast.success("One-click payment successful!");
        finalizeBooking();
        return;
      }

      setQuickPayHint(
        "Payment is processing. We will continue confirming your reservation.",
      );
      toast.success("Payment is processing.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to process one-click payment.";
      setQuickPayError(message);
      toast.error(message);
    } finally {
      setIsOneClickSubmitting(false);
    }
  }, [
    bookingId,
    finalizeBooking,
    handleAlreadyCompletedPayment,
    onUpdate,
    pricingDisclosureAccepted,
    setupPaymentForExistingBooking,
  ]);

  const hasValidSecretForMode =
    paymentMode === "embedded_checkout"
      ? clientSecret.startsWith("cs_")
      : clientSecret.startsWith("pi_");

  const renderBookingError = () => {
    if (!bookingError) {
      return null;
    }

    return (
      <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <p className="whitespace-pre-line">{bookingError}</p>
        {bookingErrorDetails?.pets.length ? (
          <ul className="list-disc space-y-1 pl-5">
            {bookingErrorDetails.pets.map((pet) => {
              const missing = normalizeStringArray(pet.missingRequiredVaccines);
              const expired = normalizeStringArray(pet.expiredRequiredVaccines);
              const issueParts: string[] = [];

              if (missing.length > 0) {
                issueParts.push(`missing: ${missing.join(", ")}`);
              }

              if (expired.length > 0) {
                issueParts.push(`expired: ${expired.join(", ")}`);
              }

              return (
                <li key={pet.id}>
                  <strong>{pet.name?.trim() || "Unnamed pet"}</strong>
                  {issueParts.length > 0 ? ` (${issueParts.join("; ")})` : ""}
                </li>
              );
            })}
          </ul>
        ) : null}
        {bookingErrorDetails?.requiredVaccines.length ? (
          <p>
            Required vaccines: {bookingErrorDetails.requiredVaccines.join(", ")}.
          </p>
        ) : null}
        <p>
          {bookingErrorDetails?.resolutionMessage ||
            "Update vaccine records and retry checkout."}{" "}
          <a
            href={bookingErrorDetails?.resolutionPath || "/dashboard/records"}
            className="font-medium underline"
          >
            Open records
          </a>
          .
        </p>
      </div>
    );
  };

  useEffect(() => {
    if (!bookingId || !clientSecret || hasValidSecretForMode || isRecoveringPayment) {
      if (hasValidSecretForMode) {
        hasAutoRecoveryAttempted.current = false;
      }
      return;
    }

    if (hasAutoRecoveryAttempted.current) {
      return;
    }

    hasAutoRecoveryAttempted.current = true;
    setBookingError("Refreshing payment session...");
    void setupPaymentForExistingBooking();
  }, [
    bookingId,
    clientSecret,
    hasValidSecretForMode,
    isRecoveringPayment,
    setupPaymentForExistingBooking,
  ]);

  useEffect(() => {
    if (
      bookingId ||
      isLoading ||
      hasAutoInitAttempted.current ||
      !bookingPayload ||
      !pricingQuote
    ) {
      return;
    }

    hasAutoInitAttempted.current = true;
    void initializeBookingAndPayment();
  }, [
    bookingId,
    bookingPayload,
    isLoading,
    initializeBookingAndPayment,
    pricingQuote,
  ]);

  useEffect(() => {
    if (
      !shouldSyncSeededPaymentState.current ||
      hasSyncedSeededPaymentState.current ||
      !bookingId ||
      isRecoveringPayment
    ) {
      return;
    }

    hasSyncedSeededPaymentState.current = true;
    setBookingError("Refreshing payment session...");
    void setupPaymentForExistingBooking();
  }, [bookingId, isRecoveringPayment, setupPaymentForExistingBooking]);

  useEffect(() => {
    if (!bookingId || isRecoveringPayment || !oneClickRebookingEnabled) {
      return;
    }

    void loadDefaultSavedMethod();
  }, [
    bookingId,
    isRecoveringPayment,
    loadDefaultSavedMethod,
    oneClickRebookingEnabled,
  ]);

  if (!bookingId) {
    return (
      <Card className="border-border/70 bg-background">
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>
            {isLoading
              ? "Preparing your booking..."
              : "Preparing secure checkout..."}
          </p>
          {renderBookingError()}
          <Button
            className="focus-ring"
            onClick={initializeBookingAndPayment}
            disabled={isLoading && !bookingError}
          >
            Retry
          </Button>
          <Button variant="outline" className="focus-ring" onClick={onBack} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="focus-ring"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel Booking
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="border-border/70 bg-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Booking Ready
          </CardTitle>
          <CardDescription>{BOOKING_PRICING_MODEL_LABEL}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PricingDisclosureCard
            subtotal={subtotal}
            tax={tax}
            totalWithTax={totalWithTax}
            packageCredit={packageCredit}
            appliedPackageName={pricingQuote?.appliedPackage?.packageName || null}
            appliedHolidaySurcharges={appliedHolidaySurcharges}
            disclosure={disclosure}
            pricingDisclosureAccepted={pricingDisclosureAccepted}
            onPricingDisclosureChange={handleDisclosureChange}
          />
          <p className="text-sm text-muted-foreground">
            Your booking has been created. Payment processing is currently
            unavailable, and your reservation remains pending confirmation.
          </p>
          {renderBookingError()}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" className="focus-ring" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                className="focus-ring"
                onClick={onCancel}
                disabled={isRecoveringPayment}
              >
                Cancel Booking
              </Button>
              <Button
                type="button"
                variant="outline"
                className="focus-ring"
                onClick={setupPaymentForExistingBooking}
                disabled={!pricingDisclosureAccepted || isRecoveringPayment}
              >
                {isRecoveringPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying
                  </>
                ) : (
                  "Retry Payment"
                )}
              </Button>
              <Button
                className="focus-ring"
                onClick={finalizeBooking}
                disabled={!pricingDisclosureAccepted || isRecoveringPayment}
              >
                Complete Booking
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {premiumCopyEnabled ? "You're almost done" : "Payment Information"}
        </CardTitle>
        <CardDescription>
          {premiumCopyEnabled
            ? leadPetName
              ? `Secure ${leadPetName}'s suite with encrypted checkout.`
              : "Finalize your premium booking with encrypted checkout."
            : pricingQuote?.pricingModelLabel || BOOKING_PRICING_MODEL_LABEL}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PricingDisclosureCard
          subtotal={subtotal}
          tax={tax}
          totalWithTax={totalWithTax}
          packageCredit={packageCredit}
          appliedPackageName={pricingQuote?.appliedPackage?.packageName || null}
          appliedHolidaySurcharges={appliedHolidaySurcharges}
          disclosure={disclosure}
          pricingDisclosureAccepted={pricingDisclosureAccepted}
          onPricingDisclosureChange={handleDisclosureChange}
        />

        {premiumReassuranceEnabled ? (
          <CheckoutReassurancePanel
            supportPhone={supportPhone}
            supportEmail={supportEmail}
            showTrustIndicators={premiumTrustIndicatorsEnabled}
            testimonials={activeTestimonials}
          />
        ) : null}

        {oneClickRebookingEnabled && defaultSavedMethod ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium">One-click rebooking</p>
                <p className="text-xs text-muted-foreground">
                  Pay instantly with your default card {defaultSavedMethod.brand?.toUpperCase() || "CARD"} •••• {defaultSavedMethod.last4 || "----"}.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="focus-ring"
                onClick={() => {
                  void handleOneClickPayment();
                }}
                disabled={
                  !pricingDisclosureAccepted ||
                  isOneClickSubmitting ||
                  isRecoveringPayment
                }
              >
                {isOneClickSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Charging Saved Card...
                  </>
                ) : (
                  "Pay With Saved Card"
                )}
              </Button>
            </div>
            {quickPayHint ? (
              <p className="mt-2 text-xs text-muted-foreground">{quickPayHint}</p>
            ) : null}
            {quickPayError ? (
              <p className="mt-2 text-xs text-destructive">{quickPayError}</p>
            ) : null}
          </div>
        ) : null}

        {oneClickRebookingEnabled && isLoadingDefaultSavedMethod ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4">
            <p className="text-sm font-medium">Checking saved payment methods</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Loading your default card for one-click checkout...
            </p>
          </div>
        ) : null}

        {oneClickRebookingEnabled && !isLoadingDefaultSavedMethod && !defaultSavedMethod ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4">
            <p className="text-sm font-medium">One-click rebooking unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a default saved card in Wallet to unlock instant one-click payments.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="focus-ring"
                size="sm"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open("/dashboard/wallet", "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Open Wallet
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="focus-ring"
                size="sm"
                onClick={() => {
                  void loadDefaultSavedMethod();
                }}
              >
                Check Again
              </Button>
            </div>
          </div>
        ) : null}

        {!hasValidSecretForMode ? (
          <div className="space-y-4 rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              Refreshing your secure payment session before checkout.
            </p>
            <div className="flex justify-start gap-2">
              <Button
                type="button"
                variant="outline"
                className="focus-ring"
                onClick={setupPaymentForExistingBooking}
                disabled={isRecoveringPayment}
              >
                {isRecoveringPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  "Refresh Payment Session"
                )}
              </Button>
              <Button type="button" variant="outline" className="focus-ring" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="button" variant="destructive" className="focus-ring" onClick={onCancel}>
                Cancel Booking
              </Button>
            </div>
          </div>
        ) : paymentMode === "embedded_checkout" ? (
          pricingDisclosureAccepted ? (
            <div className="space-y-4">
              <EmbeddedCheckoutProvider
                stripe={getStripe()}
                options={{
                  fetchClientSecret: async () => clientSecret,
                  onComplete: finalizeBooking,
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="focus-ring" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="focus-ring"
                    onClick={onCancel}
                  >
                    Cancel Booking
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <p className="text-sm text-muted-foreground">
                Acknowledge pricing disclosure above to unlock secure checkout.
              </p>
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="focus-ring" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="focus-ring"
                    onClick={onCancel}
                  >
                    Cancel Booking
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : (
          <Elements
            stripe={getStripe()}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <PaymentForm
              onSuccess={finalizeBooking}
              onBack={onBack}
              onRecover={setupPaymentForExistingBooking}
              disclosureAccepted={pricingDisclosureAccepted}
              totalWithTax={totalWithTax}
              actionLabel={personalizedActionLabel}
              premiumLoadingEnabled={premiumLoadingExperienceEnabled}
            />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
}
