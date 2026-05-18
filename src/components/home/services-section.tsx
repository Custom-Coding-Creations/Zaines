"use client";

import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BedDouble, Bone } from "lucide-react";
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
  const { serviceSettings, addOnsSettings } = useSiteSettings();

  const activeTiers = serviceSettings.serviceTiers
    .filter((tier) => tier.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((tier, index) => ({
      id: tier.id,
      title: tier.name,
      description: tier.description,
      image: tier.imageUrl,
      href: `/suites#${tier.id}`,
      icon: BedDouble,
      badge: "Suite",
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

  return (
    <section className="section-padding bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="heading-playful text-3xl font-bold text-foreground md:text-4xl mb-4">
              Stay Options & Extras
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every card below is pulled from the live admin configuration for suites and optional add-ons.
            </p>
          </div>
        </FadeUp>

        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {activeTiers.map((item, index) => (
            <FadeUp key={index} delay={index * 0.08}>
              <Link href={item.href} className="group block">
                <div className="paw-card overflow-hidden p-0">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.65),_transparent_35%),linear-gradient(135deg,var(--color-sky),var(--color-deep-sky))]" />
                    )}
                    <div
                      className="absolute top-4 right-4 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
                      style={{ backgroundColor: item.accent }}
                    >
                      <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm">
                      {item.badge}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="heading-playful text-xl font-bold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>

        {activeAddOns.length > 0 ? (
          <FadeUp delay={0.25}>
            <div className="mx-auto mb-10 w-full max-w-4xl rounded-3xl border border-border/70 bg-background/70 p-6 md:p-8">
              <h3 className="heading-playful mb-2 text-2xl font-bold text-foreground text-center">
                Optional Add-Ons
              </h3>
              <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-muted-foreground">
                Add-ons are configured separately from suites and can be updated in admin at any time.
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
                        ${addOn.price}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        ) : null}

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
