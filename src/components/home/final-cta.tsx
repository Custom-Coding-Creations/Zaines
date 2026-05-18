"use client";

import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function FinalCTASection() {
  return (
    <section
      className="relative overflow-hidden section-padding-tight"
      style={{
        background: "linear-gradient(135deg, var(--color-sky) 0%, var(--color-deep-sky) 100%)",
      }}
    >
      {/* Decorative wave top */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-background" style={{
        clipPath: "ellipse(70% 100% at 50% 0%)",
        transform: "translateY(-50%)",
      }}></div>

      {/* Decorative paw prints */}
      <div className="absolute left-10 top-20 text-6xl opacity-10 animate-pulse" style={{ animationDuration: "4s" }}>
        🐾
      </div>
      <div className="absolute right-20 bottom-20 text-8xl opacity-10 animate-pulse" style={{ animationDuration: "5s" }}>
        🐾
      </div>

      <div className="container relative z-10 px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left: Image */}
          <FadeUp>
            <div className="relative aspect-square lg:aspect-[3/4] overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1558788353-f76d92427f16?w=600&h=800&fit=crop"
                alt="Happy golden retriever ready for a fun day"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </FadeUp>

          {/* Right: Content */}
          <div className="text-white text-center lg:text-left">
            <FadeUp delay={0.1}>
              <h2 className="font-display text-4xl font-bold leading-tight mb-6 md:text-5xl">
                Ready to Reserve Your Dog&apos;s Stay?
              </h2>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="text-lg text-white/90 mb-8 leading-relaxed">
                Check live availability or schedule a tour today. We&apos;ll help you choose the right suite and add-ons.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="font-bold text-base shadow-xl"
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
          </div>
        </div>
      </div>
    </section>
  );
}
