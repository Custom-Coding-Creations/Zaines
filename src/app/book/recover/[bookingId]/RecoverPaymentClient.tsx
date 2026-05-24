"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStripe } from "@/lib/stripe-client";
import { toast } from "sonner";

type SetupResponse = {
  paymentMode: "payment_element" | "embedded_checkout";
  clientSecret: string;
};

type Props = {
  bookingId: string;
  bookingNumber: string;
  total: number;
};

function PaymentElementRecoveryForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError("Payment form is still loading. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // With Checkout Sessions (ui_mode: "elements"), confirmPayment works seamlessly
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/book/confirmation?bookingId=${bookingId}`,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message || "Unable to complete payment.");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to complete payment.",
      );
      setIsSubmitting(false);
      return;
    }

    router.push(`/book/confirmation?bookingId=${bookingId}`);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting || !stripe || !elements}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          "Complete Payment"
        )}
      </Button>
    </form>
  );
}

export default function RecoverPaymentClient({ bookingId, bookingNumber, total }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOneClickSubmitting, setIsOneClickSubmitting] = useState(false);
  const [oneClickEnabled, setOneClickEnabled] = useState(false);
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [autopayConsent, setAutopayConsent] = useState(false);
  const [allowIncidentals, setAllowIncidentals] = useState(false);
  const [isSavingAutopay, setIsSavingAutopay] = useState(false);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const hasRetriedInvalidSetup = useRef(false);

  const loadRecoverySession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/setup-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | SetupResponse
        | { error?: string; message?: string; errorCode?: string; code?: string };

      const paymentErrorCode =
        "errorCode" in payload ? payload.errorCode : "code" in payload ? payload.code : undefined;
      if (!response.ok && paymentErrorCode === "PAYMENT_ALREADY_COMPLETED") {
        toast.success("Payment already completed. Redirecting to confirmation.");
        router.push(`/book/confirmation?bookingId=${bookingId}`);
        router.refresh();
        return;
      }

      if (!response.ok || !("clientSecret" in payload)) {
        throw new Error(
          ("error" in payload && payload.error) ||
            ("message" in payload && payload.message) ||
            "Unable to prepare payment recovery session.",
        );
      }

      setSetup(payload);
    } catch (setupError) {
      setSetup(null);
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Unable to prepare payment recovery session.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
     
    void loadRecoverySession();
  }, [loadRecoverySession]);

  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        const settingsResponse = await fetch("/api/settings");
        const settingsPayload = (await settingsResponse.json()) as {
          data?: {
            stripeCapabilityFlags?: {
              oneClickRebookingEnabled?: boolean;
              autopayEnabled?: boolean;
            };
          };
        };

        const flags = settingsPayload.data?.stripeCapabilityFlags;
        setOneClickEnabled(Boolean(flags?.oneClickRebookingEnabled));
        setAutopayEnabled(Boolean(flags?.autopayEnabled));

        if (flags?.autopayEnabled) {
          const consentResponse = await fetch("/api/payments/autopay");
          if (consentResponse.ok) {
            const consentPayload = (await consentResponse.json()) as {
              consent?: {
                enabled?: boolean;
                allowIncidentals?: boolean;
              };
            };
            setAutopayConsent(Boolean(consentPayload.consent?.enabled));
            setAllowIncidentals(Boolean(consentPayload.consent?.allowIncidentals));
          }
        }
      } catch {
        // Keep defaults when capabilities fail to load.
      }
    };

    void loadCapabilities();
  }, []);

  const hasValidSetupSecret = setup
    ? setup.paymentMode === "embedded_checkout"
      ? setup.clientSecret.startsWith("cs_")
      : setup.clientSecret.startsWith("pi_")
    : false;

  useEffect(() => {
    if (!setup || hasValidSetupSecret || hasRetriedInvalidSetup.current) {
      return;
    }

    hasRetriedInvalidSetup.current = true;
    setError("Refreshing payment session...");
     
    void loadRecoverySession();
  }, [hasValidSetupSecret, loadRecoverySession, setup]);

  const stripePromise = useMemo(() => getStripe(), []);

  const submitOneClickPayment = async () => {
    setIsOneClickSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/one-click-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        succeeded?: boolean;
        status?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Unable to process one-click payment.");
      }

      if (payload.succeeded || payload.status === "succeeded") {
        toast.success("One-click payment completed.");
        router.push(`/book/confirmation?bookingId=${bookingId}`);
        router.refresh();
        return;
      }

      toast.success("Payment is processing. Redirecting to confirmation...");
      router.push(`/book/confirmation?bookingId=${bookingId}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to process one-click payment.",
      );
    } finally {
      setIsOneClickSubmitting(false);
    }
  };

  const saveAutopayConsent = async () => {
    setIsSavingAutopay(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/autopay", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: autopayConsent,
          allowIncidentals,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Unable to save autopay consent.");
      }

      toast.success("Autopay preferences saved.");
    } catch (consentError) {
      setError(
        consentError instanceof Error
          ? consentError.message
          : "Unable to save autopay consent.",
      );
    } finally {
      setIsSavingAutopay(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Recover Payment For Booking {bookingNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">Amount due: ${total}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your secure payment form...
            </div>
          ) : null}

          {!isLoading && error ? (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-3">
                  <p>{error}</p>
                  <Button type="button" variant="outline" onClick={() => void loadRecoverySession()}>
                    Retry
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {!isLoading && setup && !hasValidSetupSecret ? (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-3">
                  <p>Payment session is invalid. Please refresh and retry.</p>
                  <Button type="button" variant="outline" onClick={() => void loadRecoverySession()}>
                    Retry
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {!isLoading && setup && hasValidSetupSecret && setup.paymentMode === "embedded_checkout" ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret: async () => setup.clientSecret,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : null}

          {!isLoading && setup && hasValidSetupSecret && setup.paymentMode === "payment_element" ? (
            <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret }}>
              <PaymentElementRecoveryForm bookingId={bookingId} />
            </Elements>
          ) : null}

          {oneClickEnabled ? (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Returning guest one-click checkout</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use your default saved card to confirm this booking instantly.
              </p>
              <Button
                type="button"
                className="mt-3"
                onClick={() => {
                  void submitOneClickPayment();
                }}
                disabled={isOneClickSubmitting}
              >
                {isOneClickSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Charging Default Card...
                  </>
                ) : (
                  "Pay With Default Card"
                )}
              </Button>
            </div>
          ) : null}

          {autopayEnabled ? (
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Autopay authorization</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Authorize automatic charging for upcoming balances and optional incidentals.
              </p>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autopayConsent}
                  onChange={(event) => setAutopayConsent(event.target.checked)}
                />
                Enable autopay for future booking balances
              </label>

              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowIncidentals}
                  onChange={(event) => setAllowIncidentals(event.target.checked)}
                  disabled={!autopayConsent}
                />
                Allow incidentals auto-charge (meds, extra walks, late pickup)
              </label>

              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  void saveAutopayConsent();
                }}
                disabled={isSavingAutopay}
              >
                {isSavingAutopay ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Autopay Preferences"
                )}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
