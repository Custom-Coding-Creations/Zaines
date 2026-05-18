"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Home,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Tv,
  Camera,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import {
  stepSuitesSchema,
  type StepSuitesData,
} from "@/lib/validations/booking-wizard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSmartRecommendations, getBundleSavingsMessage } from "@/lib/booking/smart-recommendations";
import { ScaleIn } from "@/components/motion";
import { useSiteSettings } from "@/hooks/use-site-settings";
import {
  getActiveCanonicalSuiteEntries,
  type CanonicalSuiteTier,
} from "@/lib/site/service-tiers";

interface StepSuitesProps {
  data: Partial<StepSuitesData>;
  onUpdate: (data: Partial<StepSuitesData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel?: () => void;
  nights?: number; // From dates step for pricing calculation
}

export function StepSuites({
  data,
  onUpdate,
  onNext,
  onBack,
  onCancel,
  nights = 1,
}: StepSuitesProps) {
  const [, startTransition] = useTransition();
  const { addOnsSettings, pricingSettings, serviceSettings } = useSiteSettings();
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(
    data.addOns?.map((a) => a.id) || [],
  );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: pricingSettings.currency || "USD",
        maximumFractionDigits: 0,
      }),
    [pricingSettings.currency],
  );

  const suites = useMemo(() => {
    const iconByKey: Record<CanonicalSuiteTier, typeof Home> = {
      standard: Home,
      deluxe: Tv,
      luxury: Camera,
    };

    return getActiveCanonicalSuiteEntries(serviceSettings.serviceTiers).map(
      ({ key, tier }, index) => ({
        value: key,
        label: tier.name,
        pricePerNight: tier.baseNightlyRate,
        size:
          tier.capacity && tier.capacity > 0
            ? `${tier.capacity} guest spot${tier.capacity === 1 ? "" : "s"}`
            : "Private suite",
        amenities: [
          tier.description,
          tier.capacity && tier.capacity > 0
            ? `${tier.capacity} configured guest spot${tier.capacity === 1 ? "" : "s"}`
            : "Configured in admin settings",
        ],
        icon: iconByKey[key],
        badge:
          index === 1 ? "Most Popular" : key === "luxury" ? "Premium" : undefined,
      }),
    );
  }, [serviceSettings.serviceTiers]);

  const addOns = useMemo(
    () =>
      addOnsSettings.addOns.filter((addOn) => addOn.isActive).map((addOn) => ({
        id: addOn.id,
        name: addOn.name,
        description: addOn.description,
        price: addOn.price,
      })),
    [addOnsSettings.addOns],
  );

  // Smart recommendations based on context
  const recommendations = useMemo(() => {
    return getSmartRecommendations(
      {
        suiteType: data.suiteType,
        nights,
        petCount: 1, // Could be passed from dates step
      },
      addOns
    );
  }, [addOns, data.suiteType, nights]);

  // Bundle savings message
  const savingsMessage = useMemo(() => {
    return getBundleSavingsMessage(selectedAddOns, nights);
  }, [selectedAddOns, nights]);

  const handleSuiteSelect = (suiteValue: CanonicalSuiteTier) => {
    // Defer the parent state update so the selected style paints first
    startTransition(() => {
      onUpdate({ suiteType: suiteValue });
    });
  };

  const handleAddOnToggle = (addOnId: string, checked: boolean) => {
    const newSelectedAddOns = checked
      ? [...selectedAddOns, addOnId]
      : selectedAddOns.filter((id) => id !== addOnId);

    // Update local state immediately for visual feedback
    setSelectedAddOns(newSelectedAddOns);

    // Defer the expensive parent update (triggers wizard re-render + useMemo)
    startTransition(() => {
      onUpdate({
        addOns: newSelectedAddOns.map((id) => ({ id, quantity: 1 })),
      });
    });
  };

  const calculateTotal = () => {
    if (!data.suiteType) return 0;

    const suite = suites.find((s) => s.value === data.suiteType);
    if (!suite) return 0;

    const suiteTotal = suite.pricePerNight * nights;
    const addOnsTotal = selectedAddOns.reduce((sum, addOnId) => {
      const addOn = addOns.find((a) => a.id === addOnId);
      return sum + (addOn?.price || 0);
    }, 0);

    return suiteTotal + addOnsTotal;
  };

  const handleNext = () => {
    // Validate with Zod
    const validation = stepSuitesSchema.safeParse({
      suiteType: data.suiteType,
      addOns: data.addOns || [],
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    onNext();
  };

  return (
    <Card className="border-border/70 bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Choose Your Suite
        </CardTitle>
        <CardDescription>
          Select the perfect accommodation for your pet
          {nights > 1 && ` (${nights} nights)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {suites.length === 0 ? (
          <Alert>
            <AlertDescription>
              No active suite options are currently configured. Please contact support before continuing.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Suite Selection */}
        <div className="space-y-3">
          <Label>Suite Type *</Label>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:items-stretch">
            {suites.map((suite) => {
              const Icon = suite.icon;
              const isSelected = data.suiteType === suite.value;

              return (
                <button
                  type="button"
                  key={suite.value}
                  onClick={() => handleSuiteSelect(suite.value)}
                  className={cn(
                    "relative flex h-full flex-col rounded-xl border-2 p-5 text-left transition-all hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-muted bg-background",
                  )}
                >
                  {/* Badge */}
                  {suite.badge && (
                    <Badge
                      className="absolute right-2 top-2 text-xs"
                      variant="secondary"
                    >
                      {suite.badge}
                    </Badge>
                  )}

                  {/* Icon */}
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {isSelected && (
                      <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />
                    )}
                  </div>

                  {/* Title & Price */}
                  <div className="mb-2">
                    <div className="font-semibold">{suite.label}</div>
                    <div className="text-lg font-bold text-primary">
                      {formatter.format(suite.pricePerNight)}/night
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {suite.size}
                    </div>
                  </div>

                  {/* Amenities */}
                  <ul className="mt-1 flex-1 space-y-1 text-sm text-muted-foreground">
                    {suite.amenities.map((amenity, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="mt-0.5">•</span>
                        <span>{amenity}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Care Selection */}
        <div className="space-y-3">
          <Label>Optional Care Selections</Label>
          <p className="text-sm text-muted-foreground">
            Select only what you want added to your quote. No surprise add-ons
            are applied automatically.
          </p>
          <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-4">
            {addOns.length > 0 ? addOns.map((addOn) => {
              const isChecked = selectedAddOns.includes(addOn.id);

              return (
                <div
                  key={addOn.id}
                  className="flex items-start space-x-3 rounded-md p-2 hover:bg-accent"
                >
                  <Checkbox
                    id={addOn.id}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleAddOnToggle(addOn.id, checked as boolean)
                    }
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={addOn.id}
                      className="flex items-center justify-between text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <span>{addOn.name}</span>
                      <span className="font-semibold text-primary">
                        {formatter.format(addOn.price)}
                      </span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {addOn.description}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-muted-foreground">
                No add-ons are currently active. Your booking will include just the selected suite unless new options are configured.
              </p>
            )}
          </div>
        </div>

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <ScaleIn delay={0.2}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label>Recommended for You</Label>
              </div>
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                {recommendations.map((rec) => {
                  const isAlreadySelected = selectedAddOns.includes(rec.id);

                  return (
                    <div
                      key={rec.id}
                      className="flex items-start justify-between gap-3 rounded-lg bg-background p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">{rec.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            ${rec.price}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.reason}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isAlreadySelected ? "outline" : "default"}
                        className="shrink-0"
                        onClick={() => handleAddOnToggle(rec.id, !isAlreadySelected)}
                      >
                        {isAlreadySelected ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScaleIn>
        )}

        {/* Bundle Savings Alert */}
        {savingsMessage && (
          <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {savingsMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Summary */}
        {data.suiteType && (
          <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Suite ({nights} {nights === 1 ? "night" : "nights"})
                </span>
                <span>
                  $
                  {(suites.find((s) => s.value === data.suiteType)
                    ?.pricePerNight || 0) * nights}
                </span>
              </div>

              {selectedAddOns.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Add-ons</span>
                  <span>
                    $
                    {selectedAddOns.reduce((sum, id) => {
                      const addOn = addOns.find((a) => a.id === id);
                      return sum + (addOn?.price || 0);
                    }, 0)}
                  </span>
                </div>
              )}

              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span className="text-lg text-primary">
                    ${calculateTotal()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Subtotal is shown now. Tax and final total are shown before
                  confirmation with no hidden fees or surprise add-ons.
                </p>
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
          <Button className="focus-ring" onClick={handleNext} disabled={!data.suiteType}>
            Continue to Account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
