"use client";

import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bone, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSiteSettings } from "@/hooks/use-site-settings";

const cardAccents = [
  "var(--color-yellow)",
  "var(--color-coral)",
  "var(--color-deep-sky)",
  "var(--color-green)",
  "var(--color-sky)",
  "var(--color-navy)",
];

export function ServicesSection() {
  const { serviceSettings, addOnsSettings, pricingSettings } = useSiteSettings();

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricingSettings.currency || "USD",
    maximumFractionDigits: 0,
  });

  const suiteFeatures = [
    "Private suite environment",
    "Structured care and routines",
    "Daily updates during stay",
    "Configured and managed in real time",
  ];

  const activeTiers = serviceSettings.serviceTiers
    .filter((tier) => tier.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((tier, index) => ({
      id: tier.id,
      title: tier.name,
      description: tier.description,
      nightlyRate: tier.baseNightlyRate,
      image: tier.imageUrl,
      href: "/book?fresh=true",
      accent: cardAccents[index % cardAccents.length],
    }));

  const activeAddOns = addOnsSettings.addOns
    .filter((addOn) => addOn.isActive)
    .slice(0, 6)
    .map((addOn, index) => ({
      id: addOn.id,
      title: addOn.name,
      description: addOn.description,
      price: addOn.price,
      href: "/pricing#add-ons",
      icon: Bone,
      accent: cardAccents[(index + activeTiers.length) % cardAccents.length],
    }));

  const allAddOnsIncluded = activeAddOns.length > 0 && activeAddOns.every((addOn) => addOn.price <= 0);

  return (
    <section className="section-padding bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="heading-playful text-3xl font-bold text-foreground md:text-4xl mb-4">
              Private Suites & Optional Add-Ons
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              All suites and extras below are pulled from live admin configuration and update in real time.
            </p>
          </div>
        </FadeUp>

        <div className="mx-auto mb-10 grid w-full max-w-6xl justify-center gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),22rem))]">
          {activeTiers.map((item, index) => (
            <FadeUp key={index} delay={index * 0.08}>
              <article className="playful-card relative flex h-full flex-col border-border">
                <div className="relative mb-6 flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-muted to-accent">
                  <Link href={item.href} className="group block h-full w-full" aria-label={`Book ${item.title}`}>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={`${item.title} preview`}
                        fill
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 22rem"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.65),_transparent_35%),linear-gradient(135deg,var(--color-sky),var(--color-deep-sky))]" />
                    )}
                  </Link>
                </div>

                <div className="mb-2">
                  <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
                    Private Suite · Configured in Admin
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                </div>

                <div className="mb-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">{formatter.format(item.nightlyRate)}</span>
                  <span className="text-sm text-muted-foreground">per night</span>
                </div>

                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

                <ul className="mb-8 flex-1 space-y-2.5">
                  {suiteFeatures.map((feature) => (
                    <li key={`${item.id}-${feature}`} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Button className="focus-ring w-full" asChild variant="outline">
                    <Link href={item.href}>Book This Suite</Link>
                  </Button>
                </div>
              </article>
            </FadeUp>
          ))}
        </div>

        {activeAddOns.length > 0 ? (
          <FadeUp delay={0.25}>
            <div className="mx-auto mb-10 w-full max-w-4xl rounded-3xl border border-border/70 bg-background/70 p-6 md:p-8">
              <h3 className="heading-playful mb-2 text-2xl font-bold text-foreground text-center">
                {allAddOnsIncluded ? "Included Add-Ons" : "Optional Add-Ons"}
              </h3>
              <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-muted-foreground">
                {allAddOnsIncluded
                  ? "These care extras are currently included at no additional charge. Pricing can still be adjusted in admin settings anytime."
                  : "Add-ons are configured separately from suites and can be updated in admin at any time."}
              </p>
              <ul className="divide-y divide-border/60">
                {activeAddOns.map((addOn) => (
                  <li key={addOn.id}>
                    <Link
                      href={addOn.href}
                      className="group flex items-start justify-between gap-4 py-4 transition-colors hover:text-foreground"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: addOn.accent }}
                        >
                          <addOn.icon className="h-4 w-4 text-white" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-base font-semibold text-foreground">
                            {addOn.title}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            {addOn.description}
                          </span>
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {addOn.price > 0 ? formatter.format(addOn.price) : "Included"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        ) : null}

        <FadeUp delay={0.32}>
          <p className="mb-10 text-center text-sm text-muted-foreground">
            Multi-dog family?{" "}
            <Link href="/pricing#multi-dog-discounts" className="font-medium text-primary hover:underline">
              View our multi-dog discounts
            </Link>{" "}
            — Additional dogs from the same household receive $10 off nightly boarding.
          </p>
        </FadeUp>

        <FadeUp delay={0.4}>
          <div className="text-center">
            <Button
              asChild
              size="lg"
              style={{
                background: "var(--color-sky)",
                color: "white",
              }}
              className="font-bold shadow-lg"
            >
              <Link href="/pricing">
                View Suites & Pricing
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
