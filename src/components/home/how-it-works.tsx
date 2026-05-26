"use client";

import { FadeUp } from "@/components/motion";
import { ClipboardList, Heart, Calendar, Sparkles } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: ClipboardList,
    title: "Book Online",
    description: "Submit your boarding request and choose your dates.",
  },
  {
    number: 2,
    icon: Heart,
    title: "Booking Review & Approval",
    description: "We review your dog's information and confirm availability.",
  },
  {
    number: 3,
    icon: Calendar,
    title: "Secure Your Spot",
    description: "Pay your deposit to officially confirm your booking.",
  },
  {
    number: 4,
    icon: Sparkles,
    title: "Stay Connected",
    description: "Receive updates, photos, and communication during your dog's stay.",
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
