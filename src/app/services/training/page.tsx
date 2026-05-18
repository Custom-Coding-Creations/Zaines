import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeUp, ScaleIn } from "@/components/motion";
import { Puzzle, Brain, Target, Zap, Calendar } from "lucide-react";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "Enrichment Activities | Zaine's Stay & Play",
    description:
      "Fun mental and physical enrichment activities for dogs in Syracuse. Puzzle games, scent work, agility, and more to keep tails wagging!",
    canonicalPath: "/services/training",
  });
}

export default function TrainingPage() {
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
                🧩 Brain Games
              </div>
              <h1 className="font-display mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Enrichment{" "}
                <span className="relative inline-block">
                  Activities
                  <svg
                    className="absolute -right-4 -top-3 h-8 w-8 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-white/90 md:text-xl">
                Keep your pup's mind sharp and tail wagging with fun mental and physical challenges that complement a calm, attentive stay.
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
                  <Link href="/pricing#add-ons">View Add-Ons</Link>
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

      {/* Enrichment Activities */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                What We Offer
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Brain & Body Challenges
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Enrichment can be paired with stays when those care options are active in the admin dashboard.
              </p>
            </div>
          </FadeUp>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <ScaleIn delay={0.05}>
              <div className="paw-card p-6">
                <div className="badge-icon mb-4 bg-primary/10">
                  <Puzzle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                  Puzzle Games
                </h3>
                <p className="text-sm text-muted-foreground">
                  Interactive treat-dispensing puzzles and brain teasers that challenge your dog to think and problem-solve for rewards.
                </p>
              </div>
            </ScaleIn>

            <ScaleIn delay={0.1}>
              <div className="paw-card p-6">
                <div className="badge-icon mb-4 bg-green-100">
                  <Brain className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                  Scent Work
                </h3>
                <p className="text-sm text-muted-foreground">
                  Let your pup's nose do the work! Hide-and-seek games with treats and toys that engage their natural hunting instincts.
                </p>
              </div>
            </ScaleIn>

            <ScaleIn delay={0.15}>
              <div className="paw-card p-6">
                <div
                  className="badge-icon mb-4"
                  style={{ background: "oklch(0.88 0.17 90 / 20%)" }}
                >
                  <Target className="h-7 w-7" style={{ color: "var(--color-navy)" }} />
                </div>
                <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                  Agility Fun
                </h3>
                <p className="text-sm text-muted-foreground">
                  Mini obstacle courses with tunnels, jumps, and weave poles that build confidence and burn energy.
                </p>
              </div>
            </ScaleIn>

            <ScaleIn delay={0.2}>
              <div className="paw-card p-6">
                <div className="badge-icon mb-4 bg-coral/20">
                  <Zap className="h-7 w-7 text-coral" />
                </div>
                <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                  Interactive Play
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fetch, tug, and other supervised games that strengthen bonds and provide healthy physical exercise.
                </p>
              </div>
            </ScaleIn>
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
              Enrichment Included Every Day!
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Review current care options and start booking when you're ready.
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
                <Link href="/contact">
                  <Calendar className="mr-2 h-5 w-5" aria-hidden="true" />
                  Schedule a Tour
                </Link>
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
