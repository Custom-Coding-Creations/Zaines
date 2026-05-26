"use client";

import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const promises = [
  "Dogs are separated by household for safety and comfort",
  "Calm, structured home environment",
  "Supervised indoor and outdoor time throughout the day",
  "Secure fenced yard for potty breaks and enrichment",
  "Vaccination requirements help protect all dogs in our care",
  "Small-scale boarding focused on quality, not volume",
  "Plenty of love, attention, and personalized care",
];

export function SafetyPromiseSection() {
  return (
    <section className="section-padding-tight bg-muted/30">
      <div className="container px-4">
        <div className="paw-card overflow-hidden p-0 max-w-5xl mx-auto" style={{ backgroundColor: "var(--color-sky)" }}>
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left: Content */}
            <div className="p-8 md:p-12 text-white">
              <FadeUp>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl" aria-hidden="true">❤️</span>
                  <h2 className="heading-playful text-3xl font-bold">
                    Our Safety Promise
                  </h2>
                </div>
              </FadeUp>

              <FadeUp delay={0.1}>
                <ul className="space-y-3 mb-8">
                  {promises.map((promise, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 flex-shrink-0 mt-0.5">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className="text-base leading-relaxed">{promise}</span>
                    </li>
                  ))}
                </ul>
              </FadeUp>

              <FadeUp delay={0.2}>
                <Button
                  asChild
                  size="lg"
                  className="font-bold shadow-lg"
                  style={{
                    background: "var(--color-yellow)",
                    color: "var(--color-navy)",
                  }}
                >
                  <Link href="/about">Learn More About Our Care</Link>
                </Button>
              </FadeUp>
            </div>

            {/* Right: Image */}
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full">
              <Image
                src="/images/zainesimage.png"
                alt="Happy dog enjoying safe care at Zaine's Stay & Play"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
