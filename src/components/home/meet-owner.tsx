"use client";

import Link from "next/link";
import Image from "next/image";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Button } from "@/components/ui/button";
import { SlideInLeft, SlideInRight } from "@/components/motion";
import {
  getConfiguredSuiteCount,
  getTotalConfiguredSuiteCapacity,
} from "@/lib/site/service-tiers";

export function MeetOwner() {
  const { serviceSettings, websiteProfile } = useSiteSettings();
  const activeSuiteCount = getConfiguredSuiteCount(serviceSettings.serviceTiers);
  const totalCapacity = getTotalConfiguredSuiteCapacity(serviceSettings.serviceTiers);
  const stats = [
    {
      value: activeSuiteCount > 0 ? String(activeSuiteCount) : "Live",
      label: "Suite options configured in admin",
    },
    {
      value: totalCapacity > 0 ? String(totalCapacity) : "24/7",
      label:
        totalCapacity > 0
          ? "Total guest spots, intentionally limited"
          : "On-site presence, no exceptions",
    },
    { value: "100%", label: "Owner-led care, every stay" },
  ];

  return (
    <section
      id="owner-section"
      className="section-padding bg-background overflow-hidden"
      aria-labelledby="owner-heading"
    >
      <div className="container mx-auto px-4">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center max-w-6xl mx-auto">
          <SlideInLeft>
            <div className="relative">
              <div className="relative h-[520px] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-accent flex items-center justify-center">
                <Image
                  src={websiteProfile.ownerImageUrl || '/images/owner-placeholder.svg'}
                  alt="Owner portrait"
                  fill
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Decorative amber accent */}
              <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-2xl bg-primary/15 -z-10" />
              <div className="absolute -top-4 -left-4 h-20 w-20 rounded-xl bg-secondary/40 -z-10" />
            </div>
          </SlideInLeft>

          {/* Copy */}
          <SlideInRight delay={0.1}>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-primary font-semibold mb-6">
                Meet the Owner
              </p>
              <h2
                id="owner-heading"
                className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-tight text-balance"
              >
                Built by a Dog Person,
                <br />
                <em className="text-primary not-italic">for Dog People.</em>
              </h2>

              <div className="space-y-4 text-muted-foreground leading-relaxed mb-8">
                <p>
                  I started Zaine&apos;s Stay &amp; Play because when I searched
                  for boarding for my own dog, I couldn&apos;t find what I
                  actually wanted: a small, calm, owner-run place where I could
                  trust that my dog would be treated like family — not a number.
                </p>
                <p>
                  So I built it. We keep capacity intentionally limited and plan
                  every stay around the live suite settings you see on the site,
                  which means I know every dog by name, routine, and quirk. I
                  never leave the property. I send updates because I genuinely
                  want you to feel good while you&apos;re away.
                </p>
                <p className="font-medium text-foreground">
                  This is your dog&apos;s home away from home. I take that
                  seriously.
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mb-8 py-6 border-y border-border">
                {stats.map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <p className="font-display text-3xl font-bold text-primary mb-1">
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <Button asChild variant="outline" className="mr-4">
                <Link href="/about">Our Full Story</Link>
              </Button>
              <Button asChild>
                <Link href="/book">Reserve a Suite</Link>
              </Button>
            </div>
          </SlideInRight>
        </div>
      </div>
    </section>
  );
}
