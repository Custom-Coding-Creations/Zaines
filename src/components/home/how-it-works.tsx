"use client";

import { FadeUp } from "@/components/motion";
import { ClipboardList, Heart, Calendar, Sparkles } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: ClipboardList,
    title: "Book Online",
    description: "Easy online booking with instant availability and transparent pricing.",
  },
  {
    number: 2,
    icon: Heart,
    title: "Meet & Greet",
    description: "Quick temperament assessment to ensure the best match for your pup.",
  },
  {
    number: 3,
    icon: Calendar,
    title: "First Day",
    description: "Supervised play with real-time photo updates sent directly to you.",
  },
  {
    number: 4,
    icon: Sparkles,
    title: "Stay Connected",
    description: "Track your pup's happiness through our app with updates and activity summaries.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="section-padding bg-background">
      <div className="container px-4">
        <FadeUp>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl" aria-hidden="true">👉</span>
              <h2 className="heading-playful text-3xl font-bold text-foreground md:text-4xl">
                How It Works
              </h2>
              <span className="text-3xl" aria-hidden="true">👈</span>
            </div>
          </div>
        </FadeUp>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <FadeUp key={index} delay={index * 0.1}>
              <div className="text-center">
                <div className="relative mb-6">
                  <div
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full shadow-lg"
                    style={{ backgroundColor: "var(--color-sky)" }}
                  >
                    <step.icon className="h-10 w-10 text-white" aria-hidden="true" />
                  </div>
                  <div
                    className="absolute -top-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full font-display text-xl font-bold text-white shadow-md"
                    style={{ backgroundColor: "var(--color-yellow)", color: "var(--color-navy)" }}
                  >
                    {step.number}
                  </div>
                </div>
                <h3 className="heading-playful text-xl font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
