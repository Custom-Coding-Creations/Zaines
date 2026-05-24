"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import SignaturePad from "signature_pad";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import {
  stepWaiverSchema,
  type StepWaiverData,
} from "@/lib/validations/booking-wizard";
import { BOOKING_POLICY_ACKNOWLEDGMENT } from "@/config/trust-copy";
import { toast } from "sonner";

interface StepWaiverProps {
  data: Partial<StepWaiverData>;
  onUpdate: (data: Partial<StepWaiverData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel?: () => void;
}

export function StepWaiver({
  data,
  onUpdate,
  onNext,
  onBack,
  onCancel,
}: StepWaiverProps) {
  const { data: session } = useSession();
  const [savedWaiverTypes, setSavedWaiverTypes] = useState<string[]>([]);
  const [isLoadingSavedWaivers, setIsLoadingSavedWaivers] = useState(false);
  const [reuseExistingWaivers, setReuseExistingWaivers] = useState(
    data.reuseExistingWaivers ?? false,
  );
  const [liabilityAccepted, setLiabilityAccepted] = useState(
    data.liabilityAccepted || false,
  );
  const [medicalAuthorizationAccepted, setMedicalAuthorizationAccepted] =
    useState(data.medicalAuthorizationAccepted || false);
  const [photoReleaseAccepted, setPhotoReleaseAccepted] = useState(
    data.photoReleaseAccepted || false,
  );
  const [policyAcknowledgmentAccepted, setPolicyAcknowledgmentAccepted] =
    useState(data.policyAcknowledgmentAccepted || false);
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const signaturePadInstanceRef = useRef<SignaturePad | null>(null);
  const [signature, setSignature] = useState(data.signature || "");

  useEffect(() => {
    let isCancelled = false;

    const loadSavedWaivers = async () => {
      if (!session?.user?.id) {
        if (!isCancelled) {
          setIsLoadingSavedWaivers(false);
        }
        return;
      }

      setIsLoadingSavedWaivers(true);

      try {
        const response = await fetch("/api/account-records");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          accountWaivers?: Array<{
            type: string;
            expiresAt: string | null;
          }>;
        };

        const activeWaivers = (payload.accountWaivers || []).filter(
          (waiver) => !waiver.expiresAt || new Date(waiver.expiresAt) > new Date(),
        );

        if (!isCancelled && activeWaivers.length > 0) {
          setSavedWaiverTypes(activeWaivers.map((waiver) => waiver.type));
          setReuseExistingWaivers(true);
          // Don't call onUpdate here to avoid re-render loop; data persists from checkbox handler
        }
      } catch (error) {
        console.error("Failed to load saved waivers:", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingSavedWaivers(false);
        }
      }
    };

    void loadSavedWaivers();

    return () => {
      isCancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const canvas = signaturePadRef.current;

    if (!canvas) {
      return;
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth || 400;
    const height = 150;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);

    const signaturePad = new SignaturePad(canvas);

    if (data.signature) {
      signaturePad.fromDataURL(data.signature);
    }

    signaturePadInstanceRef.current = signaturePad;

    return () => {
      signaturePadInstanceRef.current?.off();
      signaturePadInstanceRef.current = null;
    };
  }, [data.signature]);

  const handleClearSignature = () => {
    signaturePadInstanceRef.current?.clear();
    setSignature("");
    onUpdate({ signature: "" });
  };

  const handleSaveSignature = () => {
    const signaturePad = signaturePadInstanceRef.current;

    if (signaturePad) {
      if (signaturePad.isEmpty()) {
        toast.error("Please provide a signature before proceeding");
        return;
      }

      const dataUrl = signaturePad.toDataURL();
      setSignature(dataUrl);
      onUpdate({ signature: dataUrl });
    }
  };

  const handleNext = () => {
    const waiverData = {
      liabilityAccepted,
      medicalAuthorizationAccepted,
      photoReleaseAccepted,
      policyAcknowledgmentAccepted,
      reuseExistingWaivers,
      signature,
    };

    const validation = stepWaiverSchema.safeParse(waiverData);

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    onUpdate(validation.data);
    onNext();
  };

  return (
    <Card className="border-border/70 bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Waivers & E-Signature
        </CardTitle>
        <CardDescription>
          Please review and accept the waivers below. Your signature is required
          to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoadingSavedWaivers && (
          <p className="text-sm text-muted-foreground">
            Checking for saved waiver records...
          </p>
        )}

        {savedWaiverTypes.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
            <p className="font-medium">Saved waivers on file</p>
            <p className="mt-1">
              We found current waiver records for this account. They will be reused automatically unless you choose to sign again.
            </p>
          </div>
        )}

        {savedWaiverTypes.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-4">
            <Checkbox
              id="reuse-waivers"
              checked={reuseExistingWaivers}
              onCheckedChange={(checked) => {
                const nextValue = checked === true;
                setReuseExistingWaivers(nextValue);
                onUpdate({ reuseExistingWaivers: nextValue });
                if (nextValue) {
                  setSignature("");
                  onUpdate({ signature: undefined });
                }
              }}
            />
            <Label htmlFor="reuse-waivers" className="cursor-pointer text-sm font-medium">
              Use my saved waivers on file
            </Label>
          </div>
        )}

        {/* Liability Waiver */}
        <div className="flex items-start gap-3 rounded-xl border border-border/70 p-4">
          <Checkbox
            id="liability"
            checked={liabilityAccepted}
            onCheckedChange={(checked) =>
              setLiabilityAccepted(checked === true)
            }
          />
          <Label htmlFor="liability" className="text-sm">
            I accept the <strong>liability waiver</strong> and understand that supervised dogs may still experience normal dog-behavior risks such as scratches, scrapes, or property damage.
          </Label>
        </div>

        {/* Medical Authorization */}
        <div className="flex items-start gap-3 rounded-xl border border-border/70 p-4">
          <Checkbox
            id="medical"
            checked={medicalAuthorizationAccepted}
            onCheckedChange={(checked) =>
              setMedicalAuthorizationAccepted(checked === true)
            }
          />
          <Label htmlFor="medical" className="text-sm">
            I authorize Zaine&apos;s Stay & Play to seek emergency medical
            treatment for my pet if necessary, and I agree to cover all
            associated costs.
          </Label>
        </div>

        {/* Photo Release */}
        <div className="flex items-start gap-3 rounded-xl border border-border/70 p-4">
          <Checkbox
            id="photo"
            checked={photoReleaseAccepted}
            onCheckedChange={(checked) =>
              setPhotoReleaseAccepted(checked === true)
            }
          />
          <Label htmlFor="photo" className="text-sm">
            I consent to the use of photos/videos of my pet for promotional
            purposes.
          </Label>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border/70 p-4">
          <Checkbox
            id="policy-acknowledgment"
            checked={policyAcknowledgmentAccepted}
            onCheckedChange={(checked) =>
              setPolicyAcknowledgmentAccepted(checked === true)
            }
          />
          <Label htmlFor="policy-acknowledgment" className="text-sm">
            {BOOKING_POLICY_ACKNOWLEDGMENT}
          </Label>
        </div>

        {!reuseExistingWaivers && (
          <div className="space-y-2">
            <Label htmlFor="signature">E-Signature *</Label>
            <div className="rounded-lg border p-4">
              <canvas
                id="signature"
                ref={signaturePadRef}
                width={400}
                height={150}
                aria-label="Signature pad"
                data-testid="booking-signature-pad"
                className="w-full rounded-md border"
              />
              <div className="mt-2 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="focus-ring"
                  onClick={handleClearSignature}
                >
                  Clear
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="focus-ring"
                  onClick={handleSaveSignature}
                >
                  Save Signature
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            <Button variant="outline" className="focus-ring" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {onCancel && (
              <Button variant="destructive" className="focus-ring" onClick={onCancel}>
                Cancel Booking
              </Button>
            )}
          </div>
          <Button
            className="focus-ring"
            onClick={handleNext}
            disabled={reuseExistingWaivers ? false : (!liabilityAccepted ||
              !medicalAuthorizationAccepted ||
              !photoReleaseAccepted ||
              !policyAcknowledgmentAccepted ||
              !signature)}
          >
            Continue to Payment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
