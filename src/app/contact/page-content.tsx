'use client';

import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/use-site-settings";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react";
import { FacebookIcon, InstagramIcon, TwitterXIcon } from "@/components/ui/social-icons";
import Link from "next/link";
import { ContactSubmissionForm } from "@/app/contact/components/ContactSubmissionForm";
import { FadeUp, ScaleIn } from "@/components/motion";

export default function ContactPageContent() {
  const { contactInfo, businessHours, socialLinks } = useSiteSettings();

  return (
    <div className="flex flex-col bg-background">
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
                Come Meet{" "}
                <span className="relative inline-block">
                  the Pack
                  <svg
                    className="absolute -right-4 -top-3 h-8 w-8 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-white/90 md:text-xl">
                Have questions? We&apos;d love to hear from you! Schedule a tour, give us a call, or send a message.
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
                  <a href="tel:3157657297">
                    <Phone className="mr-2 h-5 w-5" aria-hidden="true" />
                    315-765-PAWS
                  </a>
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

      {/* Contact Information & Form */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Info Cards */}
            <div>
              <FadeUp>
                <h2 id="contact-information" className="font-display mb-8 text-3xl font-bold text-foreground">
                  Get in Touch
                </h2>
              </FadeUp>
              <div className="space-y-6">
                <ScaleIn delay={0.1}>
                  <div className="paw-card p-6">
                    <div className="flex items-start gap-4">
                      <div className="badge-icon bg-primary/10">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display mb-2 font-bold text-foreground">
                          Visit Us
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {contactInfo.address}
                          <br />
                          {contactInfo.city}, {contactInfo.state}{" "}
                          {contactInfo.zip}
                        </p>
                        <Button
                          variant="link"
                          className="mt-3 h-auto p-0 text-primary font-semibold"
                          asChild
                        >
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(`${contactInfo.address}, ${contactInfo.city}, ${contactInfo.state} ${contactInfo.zip}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Get Directions →
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScaleIn>

                <ScaleIn delay={0.15}>
                  <div className="paw-card p-6">
                    <div className="flex items-start gap-4">
                      <div className="badge-icon bg-green-100">
                        <Phone className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display mb-2 font-bold text-foreground">
                          Call Us
                        </h3>
                        <p className="text-base font-semibold text-foreground">
                          <a
                            href="tel:3157657297"
                            className="hover:text-primary"
                          >
                            315-765-PAWS
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground">(315) 765-7297</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Mon-Fri: 6am - 8pm
                          <br />
                          Sat-Sun: 8am - 6pm
                        </p>
                      </div>
                    </div>
                  </div>
                </ScaleIn>

                <ScaleIn delay={0.2}>
                  <div className="paw-card p-6">
                    <div className="flex items-start gap-4">
                      <div className="badge-icon" style={{ background: "oklch(0.88 0.17 90 / 20%)" }}>
                        <Mail className="h-6 w-6" style={{ color: "var(--color-navy)" }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display mb-2 font-bold text-foreground">
                          Email Us
                        </h3>
                        <p className="text-base font-medium text-foreground">
                          <a
                            href={`mailto:${contactInfo.email}`}
                            className="hover:text-primary"
                          >
                            {contactInfo.email}
                          </a>
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          We typically respond within 24 hours
                        </p>
                      </div>
                    </div>
                  </div>
                </ScaleIn>

                <ScaleIn delay={0.25}>
                  <div className="paw-card p-6" id="hours-of-operation">
                    <div className="flex items-start gap-4">
                      <div className="badge-icon bg-coral/20">
                        <Clock className="h-6 w-6 text-coral" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display mb-2 font-bold text-foreground">
                          Hours of Operation
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          <p>Monday - Friday: {businessHours.monday.openTime} - {businessHours.monday.closeTime}</p>
                          <p>Saturday - Sunday: {businessHours.saturday.openTime} - {businessHours.saturday.closeTime}</p>
                          <p className="mt-3 font-bold text-primary">
                            ✓ 24/7 Supervision Always
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScaleIn>

                <ScaleIn delay={0.3}>
                  <div>
                    <h3 className="font-display mb-4 font-bold text-foreground">
                      Follow the Pack 🐾
                    </h3>
                    <div className="flex gap-4">
                      <Link
                        href={socialLinks.facebook}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:scale-110 hover:bg-primary hover:text-white"
                      >
                        <span className="sr-only">Visit our Facebook page</span>
                        <FacebookIcon className="h-6 w-6" />
                      </Link>
                      <Link
                        href={socialLinks.instagram}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:scale-110 hover:bg-primary hover:text-white"
                      >
                        <span className="sr-only">Visit our Instagram page</span>
                        <InstagramIcon className="h-6 w-6" />
                      </Link>
                      <Link
                        href={socialLinks.twitter}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:scale-110 hover:bg-primary hover:text-white"
                      >
                        <span className="sr-only">Visit our X profile</span>
                        <TwitterXIcon className="h-6 w-6" />
                      </Link>
                    </div>
                  </div>
                </ScaleIn>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <FadeUp delay={0.1}>
                <ContactSubmissionForm />
              </FadeUp>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
