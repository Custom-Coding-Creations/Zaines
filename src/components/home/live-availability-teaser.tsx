"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Timer } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { safeJsonResponse } from "@/lib/safe-json-response";
import {
  getActiveCanonicalSuiteEntries,
  getConfiguredSuiteCount,
  getTotalConfiguredSuiteCapacity,
  type CanonicalSuiteTier,
} from "@/lib/site/service-tiers";

type AvailabilityPayload = {
  availability: Record<CanonicalSuiteTier, number>;
};

const defaultAvailability: Record<CanonicalSuiteTier, number> = {
  standard: 0,
  deluxe: 0,
  luxury: 0,
};

function isoDate(daysFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

export function LiveAvailabilityTeaser() {
  const { serviceSettings } = useSiteSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityPayload["availability"] | null>(null);
  const activeSuiteEntries = getActiveCanonicalSuiteEntries(serviceSettings.serviceTiers);
  const totalCapacity = getTotalConfiguredSuiteCapacity(serviceSettings.serviceTiers);
  const suiteOptionCount = getConfiguredSuiteCount(serviceSettings.serviceTiers);

  const checkIn = useMemo(() => isoDate(7), []);
  const checkOut = useMemo(() => isoDate(9), []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(
          `/api/availability?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setError(true);
          return;
        }

        const payload = await safeJsonResponse<AvailabilityPayload>(response, {
          availability: defaultAvailability,
        });
        setAvailability(payload.availability);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [checkIn, checkOut]);

  const hasData = availability !== null;

  return (
    <section className="section-padding-tight bg-muted/30" aria-label="Live booking availability">
      <div className="container mx-auto px-4">
        <FadeUp>
          <div className="playful-shell p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow mb-3">Live availability</p>
                <h2 className="headline-display mb-2 text-2xl font-semibold text-foreground md:text-3xl">
                  Weekend suites are limited
                </h2>
                <p className="text-sm text-muted-foreground md:text-base">
                  Snapshot for {checkIn} to {checkOut}. Availability updates in real time as bookings are confirmed.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/book">Reserve now</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-semibold">
                  <Link href="/pricing">View pricing</Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 grid justify-center gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),11rem))]">
              {loading ? (
                <div className="col-span-full flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading availability snapshot...
                </div>
              ) : null}

              {!loading && error ? (
                <div className="col-span-full flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Live availability is temporarily unavailable. You can still start booking and we will verify dates instantly.
                </div>
              ) : null}

              {!loading && !error && hasData ? (
                activeSuiteEntries.map(({ key, tier }) => (
                  <div key={tier.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tier.name}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{availability[key]} spots</p>
                  </div>
                ))
              ) : null}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              {suiteOptionCount > 0
                ? `Live suite inventory is synced to ${suiteOptionCount} configured options${totalCapacity > 0 ? ` and ${totalCapacity} total guest spots` : ""}. Early booking is recommended.`
                : "Availability is synced to the current admin-configured suite inventory. Early booking is recommended."}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
