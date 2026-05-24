"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StepDates } from "@/app/book/components/StepDates";
import { StepSuites } from "@/app/book/components/StepSuites";
import { StepAccount } from "@/app/book/components/StepAccount";
import { StepPets } from "@/app/book/components/StepPets";
import { StepWaiver } from "@/app/book/components/StepWaiver";
import { StepPayment } from "@/app/book/components/StepPayment";
import { useBookingWizard } from "@/hooks/useBookingWizard";
import { EnhancedStepper } from "@/components/EnhancedStepper";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, Clock3, Sparkles, RotateCcw } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { PRICING_TRUST_DISCLOSURE } from "@/config/trust-copy";
import { 
  saveBookingProgress, 
  loadBookingProgress, 
  clearBookingProgress
} from "@/lib/booking/progress-saver";

// Pricing policy contract required for Issue #31 CP1 compliance
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRICING_POLICY_COPY_CONTRACT = PRICING_TRUST_DISCLOSURE;

type BookingValidationPricing = {
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
};

type BookingValidationResponse = {
  valid: boolean;
  pricing: BookingValidationPricing;
};

function BookPageContent() {
  const searchParams = useSearchParams();
  const { trustCopy } = useSiteSettings();
  const {
    currentStep,
    wizardData,
    nextStep,
    prevStep,
    updateStepData,
    resetWizard,
  } = useBookingWizard();

  // Reset wizard if coming from a fresh "Reserve a Suite" click
  useEffect(() => {
    if (searchParams.get("fresh") === "true") {
      resetWizard();
      clearBookingProgress();
    }
  }, [searchParams, resetWizard]);

  // Pre-fill wizard when rebooking a previous stay
  useEffect(() => {
    const rebookId = searchParams.get("rebook");
    if (!rebookId) return;

    resetWizard();
    clearBookingProgress();

    fetch(`/api/bookings/${rebookId}/summary`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { suiteType?: string; petIds?: string[] } | null) => {
        if (!data) return;
        if (data.suiteType) {
          updateStepData("suites", { suiteType: data.suiteType as "standard" | "deluxe" | "luxury" });
        }
        if (data.petIds?.length) {
          updateStepData("pets", { selectedPetIds: data.petIds });
        }
      })
      .catch(() => { /* silent fallback — user can select manually */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save progress on wizard data changes (Phase 5: Progress Saving)
  useEffect(() => {
    // Only save if user has started filling out the wizard
    if (wizardData.dates?.checkIn || wizardData.suites?.suiteType || wizardData.account?.email) {
      saveBookingProgress(wizardData, currentStep);
    }
  }, [wizardData, currentStep]);

  // Check for saved progress on mount (Phase 5: Progress Recovery)
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  const [savedProgress, setSavedProgress] = useState<ReturnType<typeof loadBookingProgress>>(null);

  useEffect(() => {
    const saved = loadBookingProgress();
    if (saved && !hasRestoredProgress) {
      setSavedProgress(saved);
    }
  }, [hasRestoredProgress]);

  // Exit intent detection - save progress before user leaves (Phase 5: Exit Intent)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if user has started filling out data but hasn't completed payment
      const hasData = wizardData.dates?.checkIn || wizardData.suites?.suiteType || wizardData.account?.email;
      const hasNotCompleted = currentStep !== "payment" || !wizardData.payment?.bookingId;

      if (hasData && hasNotCompleted) {
        // Save progress automatically
        saveBookingProgress(wizardData, currentStep);
        
        // Show browser warning
        e.preventDefault();
        e.returnValue = "You have unsaved progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [wizardData, currentStep]);
  const [pricingQuote, setPricingQuote] =
    useState<BookingValidationPricing | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteRetryNonce, setQuoteRetryNonce] = useState(0);

  const hasQuoteInputs = useMemo(() => {
    return Boolean(
      wizardData.dates?.checkIn &&
        wizardData.dates?.checkOut &&
        wizardData.suites?.suiteType &&
        wizardData.dates?.petCount,
    );
  }, [
    wizardData.dates?.checkIn,
    wizardData.dates?.checkOut,
    wizardData.suites?.suiteType,
    wizardData.dates?.petCount,
  ]);

  const visiblePricingQuote = hasQuoteInputs ? pricingQuote : null;
  const visibleQuoteError = hasQuoteInputs ? quoteError : null;

  const nights = useMemo(() => {
    const checkIn = wizardData.dates?.checkIn;
    const checkOut = wizardData.dates?.checkOut;

    if (!checkIn || !checkOut) {
      return 1;
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    return Math.max(1, diffDays);
  }, [wizardData.dates?.checkIn, wizardData.dates?.checkOut]);

  const bookingPayload = useMemo(() => {
    const checkIn = wizardData.dates?.checkIn;
    const checkOut = wizardData.dates?.checkOut;
    const petCount = wizardData.dates?.petCount;
    const suiteType = wizardData.suites?.suiteType;

    if (!checkIn || !checkOut || !petCount || !suiteType) {
      return null;
    }

    const selectedPetCount =
      (wizardData.pets?.selectedPetIds?.length || 0) +
      (wizardData.pets?.newPets?.length || 0);
    const petNames =
      wizardData.pets?.newPets?.map((pet) => pet.name).join(", ") ||
      `${Math.max(selectedPetCount, petCount)} pet(s)`;

    return {
      checkIn,
      checkOut,
      dropoffTimeSlot: wizardData.dates?.dropoffTimeSlot,
      pickupTimeSlot: wizardData.dates?.pickupTimeSlot,
      suiteType,
      petCount,
      petIds: wizardData.pets?.selectedPetIds || [],
      firstName: wizardData.account?.firstName || "Guest",
      lastName: wizardData.account?.lastName || "Customer",
      email: wizardData.account?.email || "guest@example.com",
      phone: wizardData.account?.phone || "0000000000",
      petNames,
      specialRequests: "",
      addOns: wizardData.suites?.addOns || [],
      newPets: wizardData.pets?.newPets || [],
      vaccines: wizardData.pets?.vaccines || [],
      reuseExistingWaivers: wizardData.waiver?.reuseExistingWaivers ?? true,
      waiver: {
        liabilityAccepted: Boolean(wizardData.waiver?.liabilityAccepted),
        medicalAuthorizationAccepted: Boolean(
          wizardData.waiver?.medicalAuthorizationAccepted,
        ),
        photoReleaseAccepted: Boolean(wizardData.waiver?.photoReleaseAccepted),
        policyAcknowledgmentAccepted: Boolean(
          wizardData.waiver?.policyAcknowledgmentAccepted,
        ),
        signature: wizardData.waiver?.signature,
      },
    };
  }, [wizardData]);

  useEffect(() => {
    const checkIn = wizardData.dates?.checkIn;
    const checkOut = wizardData.dates?.checkOut;
    const suiteType = wizardData.suites?.suiteType;
    const petCount = wizardData.dates?.petCount;

    if (!checkIn || !checkOut || !suiteType || !petCount) {
      return;
    }

    let isCancelled = false;

    const validatePricing = async () => {
      setQuoteError(null);
      setIsQuoteLoading(true);

      try {
        const response = await fetch("/api/bookings/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkIn,
            checkOut,
            suiteType,
            petCount,
          }),
        });

        const payload = (await response.json()) as
          | BookingValidationResponse
          | { message?: string };

        if (!response.ok || !("pricing" in payload)) {
          throw new Error(
            "message" in payload && payload.message
              ? payload.message
              : "Unable to validate pricing right now.",
          );
        }

        if (!isCancelled) {
          setPricingQuote(payload.pricing);
        }
      } catch (error) {
        if (!isCancelled) {
          setPricingQuote(null);
          setQuoteError(
            error instanceof Error
              ? error.message
              : "Unable to validate pricing right now.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsQuoteLoading(false);
        }
      }
    };

    void validatePricing();

    return () => {
      isCancelled = true;
    };
  }, [
    wizardData.dates?.checkIn,
    wizardData.dates?.checkOut,
    wizardData.dates?.petCount,
    wizardData.suites?.suiteType,
    quoteRetryNonce,
  ]);

  const steps = [
    { id: "dates", label: "Dates" },
    { id: "suites", label: "Suites" },
    { id: "account", label: "Account" },
    { id: "pets", label: "Pets" },
    { id: "waiver", label: "Waiver" },
    { id: "payment", label: "Payment" },
  ];

  const handleCancelBooking = () => {
    const shouldCancel = window.confirm(
      "Cancel this booking and start over from the first step?",
    );

    if (!shouldCancel) {
      return;
    }

    // Use requestAnimationFrame to defer heavy state operations
    // to avoid blocking UI thread (INP optimization)
    requestAnimationFrame(() => {
      const bookingId = wizardData.payment?.bookingId;
      if (bookingId) {
        sessionStorage.removeItem(`booking-${bookingId}`);
      }

      resetWizard();
      setPricingQuote(null);
      setQuoteError(null);
      setQuoteRetryNonce(0);
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[oklch(0.93_0.04_212)] via-[oklch(0.99_0.008_90)] to-white py-12">
      <div className="container mx-auto px-4 max-w-full">
        {/* Progress Restoration Banner (Phase 5: Progress Recovery) */}
        {savedProgress && !hasRestoredProgress && (
          <Alert className="mx-auto mb-6 max-w-5xl border-primary/30 bg-primary/5">
            <RotateCcw className="h-4 w-4 text-primary" />
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">Welcome back!</p>
                <p className="text-sm text-muted-foreground break-words">
                  You have a saved booking in progress from{" "}
                  {new Date(savedProgress.savedAt).toLocaleDateString()}.
                  Would you like to continue where you left off?
                </p>
              </div>
              <div className="flex gap-2 shrink-0 sm:ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    clearBookingProgress();
                    resetWizard();
                    setSavedProgress(null);
                  }}
                >
                  Start Fresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Restore progress by updating wizard data
                    Object.entries(savedProgress.wizardData).forEach(([step, data]) => {
                      if (data) {
                        updateStepData(step as keyof typeof wizardData, data);
                      }
                    });
                    setHasRestoredProgress(true);
                    setSavedProgress(null);
                  }}
                >
                  Continue Booking
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="paw-card mx-auto mb-8 max-w-5xl p-6 md:p-8">
          <div className="mb-6 text-center">
            <p className="mb-3 inline-flex items-center rounded-full border border-[oklch(0.78_0.13_208)] bg-[oklch(0.93_0.04_212)] px-3 py-1 text-xs font-semibold tracking-wide text-[oklch(0.78_0.13_208)]">
              🐾 Reserve a Stay
            </p>
            <h1 className="heading-playful mb-2 text-4xl md:text-5xl">Reserve Your Pup's Stay</h1>
            <p className="text-lg text-muted-foreground">
              A guided, step-by-step booking path with transparent pricing before confirmation.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{trustCopy.trustEvidenceClaim}</p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground md:grid-cols-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Owner-on-site supervision</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Fast, guided checkout flow</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>No hidden fee surprises</span>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {trustCopy.pricingDisclosure}
          </p>
        </div>

        <div className="mx-auto mb-8 max-w-5xl rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm md:p-6">
          <EnhancedStepper
            steps={steps}
            currentStepIndex={steps.findIndex((s) => s.id === currentStep)}
          />
        </div>

        <div id="booking-wizard" className="mx-auto max-w-2xl rounded-2xl border border-border/70 bg-background/85 p-2 shadow-sm md:p-3">
          {currentStep === "dates" && (
            <StepDates
              data={wizardData.dates || {}}
              onUpdate={(data) => updateStepData("dates", data)}
              onNext={nextStep}
              onCancel={handleCancelBooking}
            />
          )}

          {currentStep === "suites" && (
            <StepSuites
              data={wizardData.suites || {}}
              onUpdate={(data) => updateStepData("suites", data)}
              onNext={nextStep}
              onBack={prevStep}
              onCancel={handleCancelBooking}
              nights={nights}
            />
          )}

          {currentStep === "account" && (
            <StepAccount
              data={wizardData.account || {}}
              onUpdate={(data) => updateStepData("account", data)}
              onNext={nextStep}
              onBack={prevStep}
              onCancel={handleCancelBooking}
            />
          )}

          {currentStep === "pets" && (
            <StepPets
              data={wizardData.pets || {}}
              onUpdate={(data) => updateStepData("pets", data)}
              onNext={nextStep}
              onBack={prevStep}
              onCancel={handleCancelBooking}
              petCount={wizardData.dates?.petCount || 1}
            />
          )}

          {currentStep === "waiver" && (
            <StepWaiver
              key="waiver-step"
              data={wizardData.waiver || {}}
              onUpdate={(data) => updateStepData("waiver", data)}
              onNext={nextStep}
              onBack={prevStep}
              onCancel={handleCancelBooking}
            />
          )}

          {currentStep === "payment" && (
            <>
              {isQuoteLoading ? (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Validating your final pricing before payment...
                  </AlertDescription>
                </Alert>
              ) : null}

              {visibleQuoteError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    <div className="flex flex-col gap-2">
                      <span>{visibleQuoteError}</span>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setQuoteRetryNonce(
                              (currentValue) => currentValue + 1,
                            )
                          }
                        >
                          Retry pricing validation
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <StepPayment
                data={wizardData.payment || {}}
                onUpdate={(data) => updateStepData("payment", data)}
                onNext={nextStep}
                onBack={prevStep}
                onCancel={handleCancelBooking}
                totalAmount={visiblePricingQuote?.total || 0}
                pricingQuote={visiblePricingQuote}
                bookingPayload={bookingPayload}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <BookPageContent />
    </Suspense>
  );
}
