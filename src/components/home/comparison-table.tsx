"use client";

import { FadeUp } from "@/components/motion";
import { X, Check } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import {
  getConfiguredSuiteCount,
  getTotalConfiguredSuiteCapacity,
} from "@/lib/site/service-tiers";

export function ComparisonTable() {
  const { serviceSettings, trustCopy } = useSiteSettings();
  const suiteOptionCount = getConfiguredSuiteCount(serviceSettings.serviceTiers);
  const totalCapacity = getTotalConfiguredSuiteCapacity(serviceSettings.serviceTiers);
  const rows = [
    {
      feature: "Capacity",
      traditional: "20–100+ dogs at one time",
      zaines:
        suiteOptionCount > 0
          ? `${totalCapacity || suiteOptionCount} guest spots across ${suiteOptionCount} configured suite options`
          : "Capacity set directly from live admin settings",
    },
    {
      feature: "Owner presence",
      traditional: "Staff rotations, rarely the owner",
      zaines: "Owner on-site 24/7, every stay",
    },
    {
      feature: "Sleep environment",
      traditional: "Shared kennels or rows of crates",
      zaines: "Private, climate-controlled suite",
    },
    {
      feature: "Individual attention",
      traditional: "Divided across many dogs",
      zaines: "Focused, personal care all day",
    },
    {
      feature: "Cleaning products",
      traditional: "Industrial chemicals (often harsh)",
      zaines: "Pet-safe, non-toxic only",
    },
    {
      feature: "Updates",
      traditional: "Generic check-in messages",
      zaines: "Real photos & personal messages",
    },
    {
      feature: "Pricing",
      traditional: "Base rate + hidden add-ons",
      zaines: trustCopy.pricingDisclosure.includes("No hidden fees")
        ? "Clear nightly rate, tax, and selected add-ons before payment"
        : trustCopy.pricingDisclosure,
    },
    {
      feature: "Emergency response",
      traditional: "Staff calls owner — if reachable",
      zaines: "Owner responds immediately, always",
    },
  ];

  return (
    <section
      className="section-padding bg-background"
      aria-labelledby="comparison-heading"
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <FadeUp>
          <div className="text-center mb-14">
            <p className="eyebrow mb-4">
              Side by Side
            </p>
            <h2
              id="comparison-heading"
              className="headline-display mb-4 text-4xl font-semibold text-foreground text-balance md:text-5xl"
            >
              Why Not a
              <br />
              <em className="text-primary not-italic">Traditional Kennel?</em>
            </h2>
            <p className="mx-auto max-w-lg text-lg text-muted-foreground">
              See exactly how boutique private boarding compares to what most
              facilities actually offer.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="playful-shell overflow-hidden rounded-3xl border border-border/80">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto] bg-muted/60 md:grid-cols-[2fr_3fr_3fr]">
              <div className="p-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Feature
              </div>
              <div className="p-4 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground border-l border-border">
                Traditional Kennel
              </div>
              <div className="p-4 text-center text-xs font-semibold uppercase tracking-widest text-primary border-l border-border bg-primary/5">
                Zaine&apos;s Stay &amp; Play
              </div>
            </div>

            {/* Rows */}
            {rows.map(({ feature, traditional, zaines }, i) => (
              <div
                key={feature}
                className={`grid grid-cols-[1fr_auto_auto] md:grid-cols-[2fr_3fr_3fr] border-t border-border ${
                  i % 2 === 0 ? "bg-background" : "bg-muted/20"
                }`}
              >
                <div className="p-4 flex items-center">
                  <span className="text-sm font-medium text-foreground">
                    {feature}
                  </span>
                </div>
                <div className="p-4 border-l border-border flex items-start gap-2">
                  <X
                    className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-muted-foreground">
                    {traditional}
                  </span>
                </div>
                <div className="p-4 border-l border-border bg-primary/5 flex items-start gap-2">
                  <Check
                    className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-foreground font-medium">
                    {zaines}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
