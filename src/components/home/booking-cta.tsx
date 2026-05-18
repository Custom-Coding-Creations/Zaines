'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeUp } from "@/components/motion";
import { Phone } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import {
  getConfiguredSuiteCount,
  getTotalConfiguredSuiteCapacity,
} from "@/lib/site/service-tiers";

export function BookingCTA() {
  const { contactInfo, serviceSettings, trustCopy } = useSiteSettings();
  const activeSuiteCount = getConfiguredSuiteCount(serviceSettings.serviceTiers);
  const totalCapacity = getTotalConfiguredSuiteCapacity(serviceSettings.serviceTiers);

  return (
    <section
      className="section-padding overflow-hidden relative"
      aria-labelledby="booking-cta-heading"
    >
      {/* Warm amber gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-[oklch(0.52_0.15_52)] to-[oklch(0.48_0.16_48)]" />

      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.4) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <FadeUp>
            <p className="text-sm uppercase tracking-[0.3em] text-primary-foreground/70 font-semibold mb-6">
              Reserve Your Spot
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h2
              id="booking-cta-heading"
              className="font-display text-4xl md:text-6xl font-semibold text-primary-foreground leading-tight mb-6 text-balance"
            >
              Limited Capacity.
              <br />
              Reserve Early.
            </h2>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-xl text-primary-foreground/80 leading-relaxed mb-10 font-light max-w-xl mx-auto">
              {activeSuiteCount > 0
                ? `Current admin settings show ${activeSuiteCount} suite options${totalCapacity > 0 ? ` and ${totalCapacity} total guest spots` : ""}. Availability can tighten quickly around travel dates.`
                : "Availability can tighten quickly around travel dates. Check your dates now with no payment required to start."}
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                size="lg"
                className="text-base px-10 py-7 h-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl shadow-black/20 hover:-translate-y-0.5 transition-all duration-300"
                asChild
              >
                <Link href="/book">Check Availability</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-10 py-7 h-auto bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground hover:-translate-y-0.5 transition-all duration-300"
                asChild
              >
                <Link href={`tel:${contactInfo.phone}`}>
                  <Phone className="h-4 w-4 mr-2" aria-hidden="true" />
                  {contactInfo.phone}
                </Link>
              </Button>
            </div>
          </FadeUp>

          <FadeUp delay={0.4}>
            <p className="text-sm text-primary-foreground/60">
              {trustCopy.pricingDisclosure}
            </p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
