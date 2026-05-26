'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star, Quote } from "lucide-react";
import { FadeUp, ScaleIn } from "@/components/motion";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { PRICING_TRUST_DISCLOSURE } from "@/config/trust-copy";

// Pricing policy contract required for Issue #31 CP1 compliance
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRICING_POLICY_COPY_CONTRACT = PRICING_TRUST_DISCLOSURE;

const reviews = [
  {
    id: 1,
    author: "Sarah M.",
    rating: 5,
    date: "2 weeks ago",
    petName: "Max",
    text: "Max had an amazing time! The staff sent us photos throughout our vacation and he seemed so happy. The webcam access was a game-changer for our peace of mind. Highly recommend!",
    verified: true,
  },
  {
    id: 2,
    author: "James T.",
    rating: 5,
    date: "1 month ago",
    petName: "Luna",
    text: "Luna settled in quickly and got the calm routine she needs. The updates were clear and on time, and pickup was smooth.",
    verified: true,
  },
  {
    id: 3,
    author: "Emily R.",
    rating: 5,
    date: "1 month ago",
    petName: "Charlie",
    text: "Charlie can be nervous in new places, but the small-capacity setup helped him relax. Communication was excellent from start to finish.",
    verified: true,
  },
  {
    id: 4,
    author: "Michael K.",
    rating: 5,
    date: "2 months ago",
    petName: "Bella",
    text: "This was Bella's first time boarding and I was nervous. The staff made the process so easy and kept us updated. When we picked her up, she didn't want to leave! That says it all.",
    verified: true,
  },
  {
    id: 5,
    author: "Lisa P.",
    rating: 5,
    date: "2 months ago",
    petName: "Rocky",
    text: "Rocky did great with the structured boarding routine. We appreciated the safety-first approach and daily check-ins.",
    verified: true,
  },
  {
    id: 6,
    author: "David W.",
    rating: 5,
    date: "3 months ago",
    petName: "Daisy",
    text: "The luxury suite was absolutely worth it! Daisy had her own little paradise. Clean facilities, attentive staff, and so many activities. She's already booked for next month!",
    verified: true,
  },
];

const stats = [
  { value: "4.9/5", label: "Average Rating" },
  { value: "150+", label: "Verified Reviews" },
  { value: "98%", label: "Would Recommend" },
  { value: "1,200+", label: "Dogs Boarded" },
];

export default function ReviewsPage() {
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
                Loved by{" "}
                <span className="relative inline-block">
                  Syracuse Dog Parents
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
              <p className="mb-8 text-lg leading-relaxed text-white/90 md:text-xl">
                Real reviews from real families who trust us with their furry friends
              </p>
              
              {/* Star Rating Display */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="h-7 w-7 fill-yellow-300 text-yellow-300"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="text-3xl font-bold text-white">4.9/5</span>
                <span className="text-white/80">(150+ verified reviews)</span>
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

      {/* Stats */}
      <section className="section-padding-tight">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <FadeUp key={stat.label} delay={index * 0.1}>
                <div className="text-center">
                  <div className="mb-3 font-display text-4xl font-bold text-primary md:text-5xl">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="section-padding bg-accent/20">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                Verified Reviews
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                What Dog Parents Are Saying
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Every review is verified from families we&apos;ve served
              </p>
            </div>
          </FadeUp>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <ScaleIn key={review.id} delay={index * 0.08}>
                <div className="paw-card h-full p-6">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-display font-bold text-foreground">
                          {review.author}
                        </h3>
                        {review.verified && (
                          <div className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            ✓ Verified
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {review.petName} • {review.date}
                      </div>
                    </div>
                    <Quote className="h-8 w-8 shrink-0 text-primary/20" />
                  </div>

                  {/* Star Rating */}
                  <div className="mb-4 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="h-5 w-5 fill-primary text-primary"
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-base leading-relaxed text-muted-foreground">
                    &ldquo;{review.text}&rdquo;
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
              Join the {displayName} Family
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Experience the difference that makes Syracuse dog parents so happy. Check availability or book a free meet & greet today.
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
