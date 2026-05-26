'use client';

import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Star,
  Users,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  FadeUp,
  ScaleIn,
} from "@/components/motion";
import { useSiteSettings } from "@/hooks/use-site-settings";

const values = [
  {
    icon: Heart,
    title: "Every Dog Matters",
    description:
      "We treat every pup as an individual with unique needs, personality, and preferences.",
  },
  {
    icon: Shield,
    title: "Safety Above All",
    description:
      "Certified staff, temperament screening, supervised play groups, and clean facilities you can trust.",
  },
  {
    icon: Star,
    title: "Innovation Through Technology",
    description:
      "Thoughtful enrichment programs, real-time updates, and clear communication that keeps you connected.",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "We're dog people serving dog people. Local, family-owned, and deeply invested in our Syracuse community.",
  },
];

export default function AboutPageContent() {
  const { businessName } = useSiteSettings();
  const displayName = businessName || "Zaine's Stay & Play";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-16 md:py-20"
        style={{
          background:
            "linear-gradient(135deg, var(--color-deep-sky) 0%, var(--color-sky) 100%)",
        }}
      >
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mx-auto max-w-3xl text-center text-white">
              <h1 className="font-display mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Where Every Dog{" "}
                <span className="relative inline-block">
                  Feels at Home
                  <svg
                    className="absolute -right-4 -top-3 h-8 w-8 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </span>
              </h1>
              <p className="mb-2 text-lg leading-relaxed text-white/90 md:text-xl">
                Syracuse's most innovative dog daycare — combining genuine love for dogs
                with modern care systems and experienced supervision.
              </p>
            </div>
          </FadeUp>
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

      {/* Our Story Section */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
            <FadeUp>
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop"
                  alt="Happy dogs playing at daycare"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                  Our Philosophy
                </p>
                <h2 className="font-display mb-6 text-3xl font-bold text-foreground md:text-4xl">
                  Innovation Meets Heart
                </h2>
                <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
                  <p>
                    At {displayName}, we believe every dog deserves a day filled with joy, exercise, socialization, and rest — not just supervision in a kennel.
                  </p>
                  <p>
                    That's why we've built Syracuse's first <strong className="text-foreground">tech-forward daycare</strong> with
                    supervised play groups, real-time photo updates, and enrichment-first daily routines
                    designed to reduce stress and keep dogs engaged.
                  </p>
                  <p>
                    From puppies learning social skills to senior dogs enjoying gentle playtime, we tailor the experience using both
                    technology and human care — tracking engagement, reducing stress, and giving you unprecedented visibility into your dog's day.
                  </p>
                  <p className="text-primary font-semibold">
                    We don't just watch dogs. We're redefining what modern pet care means.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="section-padding bg-accent/30">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                What We Stand For
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Our Values
              </h2>
            </div>
          </FadeUp>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {values.map((value, index) => (
              <ScaleIn key={value.title} delay={index * 0.1}>
                <div className="paw-card flex gap-4 p-6">
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--color-sky)" }}
                  >
                    <value.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                      {value.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                The Difference
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Why Families Choose Us
              </h2>
            </div>
          </FadeUp>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                title: "Enrichment-Focused Care",
                description: "Structured routines and supervised engagement designed for comfort and confidence.",
              },
              {
                icon: Calendar,
                title: "Real-Time Updates",
                description: "Photo updates, activity reports, and instant messaging through our app.",
              },
              {
                icon: Star,
                title: "Certified & Tech-Trained",
                description: "Staff trained in behavior, safety, and innovative care technology.",
              },
            ].map((item, index) => (
              <ScaleIn key={item.title} delay={index * 0.1}>
                <div className="text-center">
                  <div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--color-yellow)" }}
                  >
                    <item.icon className="h-8 w-8" style={{ color: "var(--color-navy)" }} aria-hidden="true" />
                  </div>
                  <h3 className="font-display mb-2 text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="section-padding relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-deep-sky) 0%, var(--color-sky) 100%)",
        }}
      >
        <div className="container relative z-10 mx-auto px-4 text-center">
          <FadeUp>
            <h2 className="font-display mb-6 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Ready to Give Your Dog{" "}
              <span className="relative inline-block">
                the Best Day Ever?
                <svg
                  className="absolute -right-4 -top-3 h-8 w-8 text-yellow-300 opacity-80"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Join the {displayName} family. Check availability or schedule a free tour of our facility.
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
                  <span className="mr-2 text-xl" aria-hidden="true">🐾</span>
                  Check Availability
                </Link>
              </Button>
            </div>
          </FadeUp>
        </div>

        {/* Decorative paw prints */}
        <div className="absolute left-8 top-8 text-6xl opacity-10">🐾</div>
        <div className="absolute bottom-12 right-12 text-5xl opacity-10">🐾</div>
      </section>
    </div>
  );
}
