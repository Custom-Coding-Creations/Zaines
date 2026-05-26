"use client";

import { Button } from "@/components/ui/button";
import { FadeUp, ScaleIn } from "@/components/motion";
import { Calendar, Shield, Camera, Home } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const trustBadges = [
  { icon: Shield, label: "Owner-Led Care", color: "var(--color-sky)" },
  { icon: Home, label: "Private Suites", color: "var(--color-green)" },
  { icon: Camera, label: "Photo Updates", color: "var(--color-coral)" },
];

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--color-deep-sky) 0%, var(--color-sky) 100%)",
      }}
    >
      {/* Decorative wave bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-background" style={{
        clipPath: "ellipse(70% 100% at 50% 100%)",
        transform: "translateY(50%)",
      }}></div>

      <div className="container relative z-10 px-4 py-16 md:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="text-white">
            <FadeUp>
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl lg:text-6xl mb-6">
                A Home Away From Home for Your{" "}
                <span className="relative inline-block">
                  Best Friend
                  {/* Decorative doodle */}
                  <svg
                    className="absolute -right-8 -top-6 h-12 w-12 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="6" cy="6" r="1.5" />
                    <circle cx="18" cy="8" r="1" />
                    <circle cx="16" cy="16" r="1.5" />
                  </svg>
                </span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.1}>
              <p className="text-lg leading-relaxed text-white/90 mb-8 max-w-xl">
                Private, small-capacity dog boarding in Syracuse, NY with owner-led care, real-time photo updates,
                and thoughtful routines tailored to each dog's comfort.
              </p>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="flex flex-wrap gap-4 mb-10">
                <Button
                  asChild
                  size="lg"
                  className="font-bold text-base shadow-lg transition-all hover:shadow-xl"
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
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="font-semibold text-base bg-white/10 border-2 border-white text-white hover:bg-white hover:text-primary backdrop-blur-sm"
                >
                  <Link href="/contact">
                    <Calendar className="mr-2 h-5 w-5" aria-hidden="true" />
                    Schedule a Tour
                  </Link>
                </Button>
              </div>
            </FadeUp>

            {/* Trust micro-badges */}
            <FadeUp delay={0.3}>
              <div className="flex flex-wrap gap-4 items-center">
                {trustBadges.map((badge, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm font-medium text-white/80"
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
                      style={{ color: badge.color }}
                    >
                      <badge.icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="hidden sm:inline">{badge.label}</span>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Right: Dog Image */}
          <ScaleIn delay={0.2}>
            <div className="relative">
              {/* Decorative paw prints */}
              <div className="absolute -left-4 top-8 text-6xl opacity-20 animate-bounce" style={{ animationDelay: "0s", animationDuration: "3s" }}>
                🐾
              </div>
              <div className="absolute -right-2 top-20 text-4xl opacity-20 animate-bounce" style={{ animationDelay: "1s", animationDuration: "2.5s" }}>
                🐾
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop"
                  alt="Happy dogs playing outdoors"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Floating heart doodle */}
              <svg
                className="absolute -bottom-4 -left-6 h-16 w-16 text-yellow-300 opacity-60"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </ScaleIn>
        </div>
      </div>
    </section>
  );
}
