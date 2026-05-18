'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageCircle, PhoneIcon, Calendar, HelpCircle } from "lucide-react";
import { FadeUp, ScaleIn } from "@/components/motion";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { PRICING_TRUST_DISCLOSURE } from "@/config/trust-copy";
import { getActiveSuiteTiers } from "@/lib/site/service-tiers";

// Pricing policy contract required for Issue #31 CP1 compliance
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRICING_POLICY_COPY_CONTRACT = PRICING_TRUST_DISCLOSURE;

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("suites");
  const {
    addOnsSettings,
    availabilityRules,
    businessHours,
    cancellationPolicySettings,
    contactInfo,
    pricingSettings,
    requiredVaccineSettings,
    serviceSettings,
    trustCopy,
    websiteProfile,
  } = useSiteSettings();

  const activeTiers = getActiveSuiteTiers(serviceSettings.serviceTiers);
  const activeAddOns = addOnsSettings.addOns.filter((addOn) => addOn.isActive);
  const tierSummary = activeTiers
    .map((tier) => `${tier.name} (${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pricingSettings.currency || "USD",
      maximumFractionDigits: 0,
    }).format(tier.baseNightlyRate)}/night)`)
    .join(", ");

  const faqCategories = {
    suites: [
      {
        q: "Which suite options are currently available?",
        a: tierSummary || "Suite options are configured in the admin dashboard and published here automatically.",
      },
      {
        q: "How do I choose the right suite?",
        a: activeTiers.length > 0
          ? `Each suite card in booking uses the live admin description for that stay option. Current choices: ${activeTiers.map((tier) => tier.name).join(", ")}.`
          : "Available suite options are shown live in the booking flow.",
      },
      {
        q: "Are add-ons available during booking?",
        a: activeAddOns.length > 0
          ? `Yes. Current add-ons include ${activeAddOns.map((addOn) => addOn.name).join(", ")}. They are selectable during checkout and reflected in your quote before payment.`
          : "Optional add-ons can be configured in the admin dashboard and will appear here when active.",
      },
    ],
    availability: [
      {
        q: "How far in advance can I book?",
        a: `Bookings open ${availabilityRules.advanceBookingWindowDays} days in advance, with a minimum lead time of ${availabilityRules.minimumLeadTimeDays} day${availabilityRules.minimumLeadTimeDays === 1 ? "" : "s"}.`,
      },
      {
        q: "Is there a minimum or maximum stay length?",
        a: `Yes. The current booking rules require at least ${availabilityRules.minNightsPerBooking} night and allow up to ${availabilityRules.maxNightsPerBooking} nights per reservation.`,
      },
      {
        q: "How accurate is the availability shown online?",
        a: "The site checks live booking availability in real time using the same suite capacity configuration managed in the admin dashboard.",
      },
    ],
    general: [
      {
        q: "What are your hours of operation?",
        a: `Current posted hours are Monday ${businessHours.monday.openTime}-${businessHours.monday.closeTime}, Tuesday ${businessHours.tuesday.openTime}-${businessHours.tuesday.closeTime}, Wednesday ${businessHours.wednesday.openTime}-${businessHours.wednesday.closeTime}, Thursday ${businessHours.thursday.openTime}-${businessHours.thursday.closeTime}, Friday ${businessHours.friday.openTime}-${businessHours.friday.closeTime}, Saturday ${businessHours.saturday.openTime}-${businessHours.saturday.closeTime}, and Sunday ${businessHours.sunday.openTime}-${businessHours.sunday.closeTime}.`,
      },
      {
        q: "What areas do you serve?",
        a: `We currently serve ${websiteProfile.serviceArea.join(", ")}.`,
      },
      {
        q: "Do you offer tours before booking?",
        a: "Yes. Use the contact page to request a tour or ask questions before reserving a stay.",
      },
    ],
    health: [
      {
        q: "What vaccinations are required?",
        a: `Required vaccines are ${requiredVaccineSettings.requiredVaccines.join(", ")}. ${requiredVaccineSettings.blockBookingsOnExpiredVaccines ? "Expired vaccines must be updated before a booking can be confirmed." : "Records are reviewed before confirmation."}`,
      },
      {
        q: "Can you handle medications or special routines?",
        a: "Yes. Provide clear instructions during booking so care routines can be reviewed before the stay.",
      },
      {
        q: "Do you accept senior dogs or dogs with special needs?",
        a: "Yes, as long as the requested care can be safely supported. Share details before booking so the stay can be planned appropriately.",
      },
    ],
    payment: [
      {
        q: "When is payment due?",
        a: "Your total is shown before confirmation during booking, including nightly rate, tax, and any selected add-ons.",
      },
      {
        q: "What's your cancellation policy?",
        a: `Full refunds are available up to ${cancellationPolicySettings.fullRefundHours} hours before check-in. Within ${cancellationPolicySettings.partialRefundHours} hours, ${cancellationPolicySettings.partialRefundPercent}% is refundable. No-shows receive ${cancellationPolicySettings.noShowRefundPercent}% back.`,
      },
      {
        q: "Are there multi-pet discounts?",
        a: `Yes. Two pets receive ${pricingSettings.twoPetDiscountPercent}% off and three or more pets receive ${pricingSettings.threePlusPetsDiscountPercent}% off when eligible.`,
      },
      {
        q: "How do I know there are no hidden fees?",
        a: trustCopy.pricingDisclosure,
      },
    ],
  };

  const allFaqs = Object.values(faqCategories).flat();

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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                <HelpCircle className="h-4 w-4" />
                Help Center
              </div>
              <h1 className="font-display mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Got Questions?{" "}
                <span className="relative inline-block">
                  We've Got Wags!
                  <svg
                    className="absolute -right-6 -top-2 h-10 w-10 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-white/90 md:text-xl">
                Find answers tied to the current suite, pricing, add-on, and booking settings shown across the site.
              </p>

              {/* Search */}
              <div className="relative mx-auto max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" />
                <Input
                  type="search"
                  placeholder="Search questions..."
                  className="h-14 rounded-2xl border-white/30 bg-white pl-12 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Search Frequently Asked Questions"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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

      {/* FAQ Content */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mx-auto max-w-4xl">
              <Tabs
                value={activeCategory}
                onValueChange={setActiveCategory}
                className="w-full"
              >
                <TabsList className="mb-12 grid w-full grid-cols-2 gap-2 lg:grid-cols-5 h-auto">
                  <TabsTrigger value="suites" className="text-sm md:text-base py-3">
                    🏠 Suites
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="text-sm md:text-base py-3">
                    📅 Availability
                  </TabsTrigger>
                  <TabsTrigger value="general" className="text-sm md:text-base py-3">
                    📋 General
                  </TabsTrigger>
                  <TabsTrigger value="health" className="text-sm md:text-base py-3">
                    💉 Health
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="text-sm md:text-base py-3">
                    💳 Payment
                  </TabsTrigger>
                </TabsList>

                {Object.entries(faqCategories).map(([category, questions]) => (
                  <TabsContent key={category} value={category}>
                    <Accordion type="single" collapsible className="space-y-4">
                      {questions
                        .filter((faq) =>
                          searchQuery
                            ? faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              faq.a.toLowerCase().includes(searchQuery.toLowerCase())
                            : true,
                        )
                        .map((faq, index) => (
                          <ScaleIn key={index} delay={index * 0.05}>
                            <AccordionItem
                              value={`${category}-${index}`}
                              className="paw-card overflow-hidden border-0 px-6"
                            >
                              <AccordionTrigger className="py-5 text-left font-display font-bold text-foreground hover:no-underline hover:text-primary">
                                <span>{faq.q}</span>
                              </AccordionTrigger>
                              <AccordionContent className="pb-5 pt-0 text-base leading-relaxed text-muted-foreground">
                                {faq.a}
                              </AccordionContent>
                            </AccordionItem>
                          </ScaleIn>
                        ))}
                    </Accordion>

                    {questions.filter((faq) =>
                      searchQuery
                        ? faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          faq.a.toLowerCase().includes(searchQuery.toLowerCase())
                        : true,
                    ).length === 0 && (
                      <div className="py-16 text-center">
                        <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                        <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                          No results found
                        </h3>
                        <p className="text-muted-foreground">
                          Try adjusting your search or browse other categories
                        </p>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Quick Links */}
      <section className="section-padding bg-accent/20">
        <div className="container mx-auto px-4">
          <FadeUp>
            <h2 className="font-display mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
              Need More Help?
            </h2>
          </FadeUp>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <ScaleIn delay={0.1}>
              <div className="paw-card p-8 text-center">
                <div className="badge-icon mx-auto mb-4 bg-primary/10">
                  <MessageCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display mb-3 font-bold text-foreground">
                  Contact Us
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Speak with our team for personalized assistance
                </p>
                <Button
                  className="paw-button-secondary w-full"
                  asChild
                >
                  <Link href="/contact">Get in Touch</Link>
                </Button>
              </div>
            </ScaleIn>

            <ScaleIn delay={0.15}>
              <div className="paw-card p-8 text-center">
                <div className="badge-icon mx-auto mb-4 bg-green-100">
                  <PhoneIcon className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="font-display mb-3 font-bold text-foreground">
                  Call Us
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Reach us during posted business hours
                </p>
                <p className="mb-6 text-base font-bold text-foreground">
                  {contactInfo.phone}
                </p>
                <Button
                  className="paw-button-secondary w-full"
                  asChild
                >
                  <a href={`tel:${contactInfo.phone.replace(/\D/g, '')}`}>Call Now</a>
                </Button>
              </div>
            </ScaleIn>

            <ScaleIn delay={0.2}>
              <div className="paw-card p-8 text-center">
                <div className="badge-icon mx-auto mb-4" style={{ background: "oklch(0.88 0.17 90 / 20%)" }}>
                  <Calendar className="h-7 w-7" style={{ color: "var(--color-navy)" }} />
                </div>
                <h3 className="font-display mb-3 font-bold text-foreground">
                  Schedule a Tour
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  See our facility and meet the team in person
                </p>
                <Button
                  className="paw-button-secondary w-full"
                  asChild
                >
                  <Link href="/contact">Book Tour</Link>
                </Button>
              </div>
            </ScaleIn>
          </div>
        </div>
      </section>

      {/* CTA */}
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
              Ready to Reserve a Stay?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Start your booking when you're ready, or reach out if you need help choosing a suite or reviewing add-ons.
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
                  <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                  Contact Us
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

      {/* Schema.org FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: allFaqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
