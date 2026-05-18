import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeUp, ScaleIn } from "@/components/motion";
import {
  Shield,
  Heart,
  Camera,
  Clock,
  Home,
  Zap,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";
import { getAdminSettings } from "@/lib/api/admin-settings";

export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "Daily Care & Enrichment Syracuse NY | Zaine's Stay & Play",
    description:
      "Owner-led daily care, enrichment, photo updates, and private-suite routines for dogs staying with Zaine's Stay & Play in Syracuse.",
    canonicalPath: "/services/daycare",
    keywords: [
      "dog care Syracuse",
      "dog enrichment Syracuse",
      "private dog boarding Syracuse",
      "dog photo updates Syracuse",
      "dog routines Syracuse",
    ],
  });
}

const daycareFeatures = [
  {
    icon: Shield,
    title: "Supervised Play Groups",
    description:
      "All play is monitored by certified staff who understand dog body language and group dynamics.",
    color: "var(--color-sky)",
  },
  {
    icon: Heart,
    title: "Temperament Screening",
    description:
      "Every dog is evaluated to ensure they're a good fit for group play and matched with compatible playmates.",
    color: "var(--color-coral)",
  },
  {
    icon: Home,
    title: "Safe & Clean Facility",
    description:
      "Climate-controlled indoor and outdoor play areas, cleaned and sanitized daily for your pup's health.",
    color: "var(--color-green)",
  },
  {
    icon: Camera,
    title: "Photo Updates",
    description:
      "Get pictures and updates throughout the day so you can see your dog having a blast.",
    color: "var(--color-yellow)",
  },
  {
    icon: Zap,
    title: "Enrichment Activities",
    description:
      "Beyond basic play — we include puzzle games, training exercises, and sensory activities.",
    color: "var(--color-sky)",
  },
  {
    icon: Clock,
    title: "Rest & Downtime",
    description:
      "Scheduled quiet time ensures dogs don't get overstimulated and stay happy all day.",
    color: "var(--color-green)",
  },
];

export default async function DaycarePage() {
  const settings = await getAdminSettings();
  
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: settings.pricingSettings.currency || "USD",
    maximumFractionDigits: 0,
  });

  const careTiers = settings.serviceSettings.serviceTiers
    .filter((tier) => tier.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-16 md:py-24"
        style={{
          background:
            "linear-gradient(135deg, var(--color-deep-sky) 0%, var(--color-sky) 100%)",
        }}
      >
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Content */}
            <FadeUp>
              <div className="text-white">
                <h1 className="font-display mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                  Daily Care Done{" "}
                  <span className="relative inline-block">
                    Right.
                    <svg
                      className="absolute -right-6 -top-4 h-10 w-10 text-yellow-300 opacity-80"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="6" cy="6" r="1.5" />
                      <circle cx="18" cy="8" r="1" />
                    </svg>
                  </span>
                </h1>
                <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/90">
                  Owner-led routines, enrichment, rest breaks, and photo updates
                  are built into every stay so your dog gets attentive care in a
                  calm, private setting.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="font-bold text-base shadow-lg"
                    style={{
                      background: "var(--color-yellow)",
                      color: "var(--color-navy)",
                    }}
                  >
                    <Link href="/book">
                      <span className="mr-2 text-xl" aria-hidden="true">
                        🐾
                      </span>
                      Check Availability
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="font-semibold text-base border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-primary"
                  >
                    <Link href="/pricing">View Pricing</Link>
                  </Button>
                </div>
              </div>
            </FadeUp>

            {/* Right: Image */}
            <ScaleIn delay={0.2}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600&fit=crop"
                  alt="Dog receiving attentive daily care"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </ScaleIn>
          </div>
        </div>

        {/* Wave bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-background"
          style={{
            clipPath: "ellipse(70% 100% at 50% 100%)",
            transform: "translateY(50%)",
          }}
        ></div>
      </section>

      {/* Features Section */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                Included in Every Stay
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Thoughtful Care Throughout the Day
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                The same care model shown here supports the suite, pricing, and booking experiences across the site.
              </p>
            </div>
          </FadeUp>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {daycareFeatures.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <ScaleIn key={feature.title} delay={index * 0.08}>
                  <div className="paw-card group h-full p-6 transition-all hover:shadow-lg">
                    <div
                      className="badge-icon mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110"
                      style={{ backgroundColor: feature.color, color: "white" }}
                    >
                      <FeatureIcon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </ScaleIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="section-padding bg-accent/30">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                Current Stay Options
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Live Suite Rates
              </h2>
            </div>
          </FadeUp>

          {careTiers.length > 0 ? (
            <div className={`mx-auto grid max-w-5xl gap-6 ${
              careTiers.length === 1 ? 'md:grid-cols-1 max-w-md' :
              careTiers.length === 2 ? 'md:grid-cols-2' :
              'md:grid-cols-3'
            }`}>
              {careTiers.map((tier, index) => {
                const isPopular = careTiers.length > 1 && index === 1;
                
                return (
                  <ScaleIn key={tier.id} delay={index * 0.1}>
                    <div
                      className={`paw-card relative h-full p-6 ${
                        isPopular ? "border-2 border-primary shadow-lg" : ""
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-bold text-white">
                          Most Popular
                        </div>
                      )}
                      <div className="mb-4 text-center">
                        <h3 className="font-display mb-2 text-2xl font-bold text-foreground">
                          {tier.name}
                        </h3>
                        <p className="text-sm text-muted-foreground min-h-[20px]">
                          {tier.description.substring(0, 50)}
                        </p>
                        <p className="mt-4 text-4xl font-bold text-primary">
                          {formatter.format(tier.baseNightlyRate)}
                        </p>
                      </div>
                      <ul className="mb-6 space-y-2 min-h-[120px]">
                        {tier.description.split('.').filter(s => s.trim()).slice(0, 3).map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle2
                              className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
                              aria-hidden="true"
                            />
                            <span>{feature.trim()}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        asChild
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                      >
                        <Link href="/book">Book Now</Link>
                      </Button>
                    </div>
                  </ScaleIn>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground mb-4">
                Stay options are being configured.
              </p>
              <p className="text-sm text-muted-foreground">
                Please contact us for current rates or check back soon.
              </p>
            </div>
          )}

          <FadeUp delay={0.3}>
            <div className="mt-8 text-center">
              <Link
                href="/pricing"
                className="text-base font-semibold text-primary hover:underline"
              >
                View full pricing & add-ons →
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div
              className="mx-auto max-w-4xl overflow-hidden rounded-3xl p-10 text-center md:p-12"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-deep-sky) 0%, var(--color-sky) 100%)",
              }}
            >
              <h2 className="font-display mb-4 text-3xl font-bold text-white md:text-4xl">
                Ready to Plan Your Dog's Stay?
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
                Start with availability, compare current suites, and contact us if you want help choosing the right stay option.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="font-bold text-base shadow-lg"
                  style={{
                    background: "var(--color-yellow)",
                    color: "var(--color-navy)",
                  }}
                >
                  <Link href="/book">
                    <span className="mr-2 text-xl" aria-hidden="true">
                      🐾
                    </span>
                    Check Availability
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="font-semibold text-base border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-primary"
                >
                  <Link href="/contact">Schedule a Tour</Link>
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
