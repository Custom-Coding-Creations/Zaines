"use client";

import { SlideInLeft, SlideInRight } from "@/components/motion";
import { X, Check } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import {
  getConfiguredSuiteCount,
  getTotalConfiguredSuiteCapacity,
} from "@/lib/site/service-tiers";

const differentiators = [
  {
    theirs: "20–100+ dogs sharing one facility",
    ours: "A maximum of 3 guests at any time",
  },
  {
    theirs: "Unfamiliar staff rotations, no continuity",
    ours: "The same owner, every single day",
  },
  {
    theirs: "Noise, commotion, and group kennels",
    ours: "Quiet, private suites with structured calm",
  },
  {
    theirs: "Automated check-ins, template updates",
    ours: "Genuine daily messages with real photos",
  },
];

export function PositioningSection() {
  const { businessName, serviceSettings } = useSiteSettings();
  const suiteOptionCount = getConfiguredSuiteCount(serviceSettings.serviceTiers);
  const totalCapacity = getTotalConfiguredSuiteCapacity(serviceSettings.serviceTiers);

  return (
    <section
      className="bg-foreground section-padding overflow-hidden"
      aria-labelledby="positioning-heading"
    >
      <div className="container mx-auto px-4">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 items-center max-w-6xl mx-auto">
          {/* Left: Emotional copy */}
          <SlideInLeft>
            <p className="text-sm uppercase tracking-[0.25em] text-primary font-semibold mb-6">
              A Different Kind of Care
            </p>
            <h2
              id="positioning-heading"
              className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-background leading-[1.05] mb-8 text-balance"
            >
              This Is Not
              <br />
              <em className="text-primary not-italic">a Kennel.</em>
            </h2>
            <div className="space-y-5 text-background/75 text-lg leading-relaxed font-light">
              <p>
                When you drop your dog off at a traditional facility, they become
                one of many — a number in a system designed for volume, not
                individuals.
              </p>
              <p>
                {businessName} was built from the opposite
                philosophy. We intentionally keep capacity limited
                {suiteOptionCount > 0
                  ? ` to ${suiteOptionCount} configured suite option${suiteOptionCount === 1 ? "" : "s"}${
                      totalCapacity > 0 ? ` and ${totalCapacity} total guest spots` : ""
                    }`
                  : ""}
                so that every guest receives focused attention, a consistent routine,
                and genuine care.
              </p>
              <p className="font-medium text-background/90">
                Your dog is a member of your family. We treat them that way.
              </p>
            </div>
          </SlideInLeft>

          {/* Right: Differentiator grid */}
          <SlideInRight delay={0.15}>
            <div className="space-y-4">
              {differentiators.map(({ theirs, ours }, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-background/10 bg-background/5 p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 mt-0.5">
                      <X className="h-3 w-3 text-red-400" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-background/50 line-through">{theirs}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/30 mt-0.5">
                      <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-background/90 font-medium">{ours}</p>
                  </div>
                </div>
              ))}
            </div>
          </SlideInRight>
        </div>
      </div>
    </section>
  );
}
