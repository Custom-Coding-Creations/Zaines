import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Camera,
  Utensils,
  Shield,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { FadeUp, ScaleIn } from "@/components/motion";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "Overnight Dog Boarding | Zaine's Stay & Play",
    description:
      "Overnight dog boarding in Syracuse with 24/7 supervision, daily photo updates, and comfortable accommodations. Book your pup's overnight stay today!",
    canonicalPath: "/services/boarding",
  });
}

export default function BoardingPage() {
  return (
    <div className="flex flex-col bg-background">
      {/* Hero */}
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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                🌙 Overnight Care
              </div>
              <h1 className="font-display mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Overnight Boarding{" "}
                <span className="relative inline-block">
                  for Peace of Mind
                  <svg
                    className="absolute -right-4 -top-3 h-8 w-8 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-white/90 md:text-xl">
                Overnight care with 24/7 supervision, personalized enrichment, real-time updates, and all the comforts of home.
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
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
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

      {/* What's Included */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                Boarding Essentials
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                What's Included
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Everything your pup needs for a comfortable overnight stay
              </p>
            </div>
          </FadeUp>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Shield className="h-7 w-7" />,
                title: "24/7 Supervision",
                description:
                  "Staff on-site around the clock for safety and comfort",
                color: "bg-primary/10",
                iconColor: "text-primary",
              },
              {
                icon: <Camera className="h-7 w-7" />,
                title: "Daily Photo Updates",
                description: "See how your pup's doing with daily photo texts",
                color: "bg-green-100",
                iconColor: "text-green-600",
              },
              {
                icon: <Utensils className="h-7 w-7" />,
                title: "Meal Service",
                description: "Bring your dog's food and we'll serve on schedule",
                color: "oklch(0.88 0.17 90 / 20%)",
                iconColor: "var(--color-navy)",
              },
              {
                icon: <Heart className="h-7 w-7" />,
                title: "Daily Playtime",
                description: "Group play and individual attention every day",
                color: "bg-coral/20",
                iconColor: "text-coral",
              },
              {
                icon: <Clock className="h-7 w-7" />,
                title: "Flexible Hours",
                description: "Drop-off and pick-up times that fit your schedule",
                color: "bg-primary/10",
                iconColor: "text-primary",
              },
              {
                icon: <CheckCircle2 className="h-7 w-7" />,
                title: "Medication Admin",
                description: "We'll administer meds at no extra charge",
                color: "bg-green-100",
                iconColor: "text-green-600",
              },
            ].map((feature, index) => (
              <ScaleIn key={feature.title} delay={index * 0.05}>
                <div className="paw-card p-6">
                  <div
                    className="badge-icon mb-4"
                    style={{ background: feature.color }}
                  >
                    <div style={{ color: feature.iconColor }}>
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="font-display mb-2 font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
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
              Ready to Book Your Pup's Stay?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Check availability and reserve your spot for overnight boarding with caring, attentive staff.
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
          </FadeUp>
        </div>

        {/* Decorative paw prints */}
        <div className="absolute left-8 top-8 text-6xl opacity-10">🐾</div>
        <div className="absolute bottom-12 right-12 text-5xl opacity-10">
          🐾
        </div>
      </section>
    </div>
  );
}
