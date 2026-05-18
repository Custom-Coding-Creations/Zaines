"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion";
import { CheckCircle2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export function SuiteShowcase() {
  const { serviceSettings, pricingSettings } = useSiteSettings();

  const activeSuites = serviceSettings.serviceTiers
    .filter((suite) => suite.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricingSettings.currency || "USD",
    maximumFractionDigits: 0,
  });

  const suiteCountLabel =
    activeSuites.length === 1
      ? "One Private Suite."
      : `${activeSuites.length} Private Suites.`;

  return (
    <section
      className="section-padding bg-background"
      aria-labelledby="suites-heading"
    >
      <div className="container mx-auto px-4">
        <FadeUp>
          <div className="mb-16 text-center">
            <p className="eyebrow mb-4">Accommodations</p>
            <h2
              id="suites-heading"
              className="headline-display mb-4 text-4xl font-semibold text-foreground text-balance md:text-5xl"
            >
              {suiteCountLabel}
              <br />
              <em className="text-primary not-italic">Zero Overcrowding.</em>
            </h2>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
              Every suite is private, climate-controlled, and cleaned between
              each guest. Your dog shares space with no one but you.
            </p>
          </div>
        </FadeUp>

        {activeSuites.length === 0 ? (
          <div className="playful-card border-dashed text-center text-muted-foreground">
            No active service types are currently configured. Update Services & Pricing in Admin Settings.
          </div>
        ) : (
          <StaggerContainer className="grid gap-8 md:grid-cols-2 xl:grid-cols-3 md:items-stretch">
            {activeSuites.map((suite, index) => (
              <StaggerItem key={suite.name} className="h-full">
                <article
                  id={`suite-${suite.id}`}
                  className={`playful-card relative flex h-full flex-col ${index === 1 ? "border-primary" : "border-border"}`}
                >
                  {index === 1 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary px-4 py-1 text-xs uppercase tracking-wider text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <div className="relative mb-6 flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-muted to-accent">
                    <Image
                      src={suite.imageUrl || "/images/suites/standard-suite-default.webp"}
                      alt={`${suite.name} preview`}
                      fill
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="mb-2">
                    <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
                      Private Suite · Configured in Admin
                    </p>
                    <h3 className="font-display text-2xl font-semibold text-foreground">
                      {suite.name}
                    </h3>
                  </div>

                  <div className="mb-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-primary">
                      {formatter.format(suite.baseNightlyRate)}
                    </span>
                    <span className="text-sm text-muted-foreground">per night</span>
                  </div>

                  <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                    {suite.description}
                  </p>

                  <ul className="mb-8 flex-1 space-y-2.5">
                    {[
                      "Private suite environment",
                      "Structured care and routines",
                      "Daily updates during stay",
                      "Configured and managed in real time",
                    ].map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <Button
                      variant={index === 1 ? "default" : "outline"}
                      className="focus-ring w-full"
                      asChild
                    >
                      <Link href="/book?fresh=true">Book This Suite</Link>
                    </Button>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        <FadeUp delay={0.2}>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Multi-dog family?{" "}
            <Link href="/pricing#multi-dog-discounts" className="font-medium text-primary hover:underline">
              View our multi-dog discounts
            </Link>{" "}
            — {pricingSettings.twoPetDiscountPercent}% off the second dog, {pricingSettings.threePlusPetsDiscountPercent}% off the third.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
