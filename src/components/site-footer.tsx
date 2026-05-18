'use client';

import { type FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getActiveSuiteTiers } from "@/lib/site/service-tiers";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const { addOnsSettings, contactInfo, businessHours, businessName, serviceSettings, socialLinks, websiteProfile } = useSiteSettings();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const activeSuites = getActiveSuiteTiers(serviceSettings.serviceTiers);
  const featuredLinks = [
    ...activeSuites.map((tier) => ({ label: tier.name, href: `/suites#${tier.id}` })),
    ...addOnsSettings.addOns
      .filter((addOn) => addOn.isActive)
      .slice(0, Math.max(0, 6 - activeSuites.length))
      .map((addOn) => ({ label: addOn.name, href: "/pricing#add-ons" })),
  ];

  const weekdayHours = businessHours?.monday?.isClosed
    ? "Closed"
    : `${businessHours?.monday?.openTime ?? "06:00"} - ${businessHours?.monday?.closeTime ?? "20:00"}`;
  const weekendHours = businessHours?.saturday?.isClosed
    ? "Closed"
    : `${businessHours?.saturday?.openTime ?? "08:00"} - ${businessHours?.saturday?.closeTime ?? "18:00"}`;

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = newsletterEmail.trim();

    if (!trimmedEmail) {
      setNewsletterMessage("Please enter your email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setNewsletterMessage("Please enter a valid email address.");
      return;
    }

    const subject = encodeURIComponent("Newsletter Signup");
    const body = encodeURIComponent(`Please add ${trimmedEmail} to newsletter updates.`);
    window.location.href = `mailto:${contactInfo.email}?subject=${subject}&body=${body}`;

    setNewsletterMessage("Opening your email app to confirm subscription.");
    setNewsletterEmail("");
  };

  return (
    <footer id="site-footer" style={{ backgroundColor: "var(--color-navy)" }} className="text-background/85">
      <div className="container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="focus-ring group mb-5 flex w-fit items-center gap-2.5 rounded-md"
              aria-label={`${businessName} — Home`}
            >
              {websiteProfile.logoImageUrl ? (
                <Image
                  src={websiteProfile.logoImageUrl}
                  alt={`${businessName} logo`}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center text-2xl">
                  🐾
                </span>
              )}
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold text-white tracking-tight leading-none">
                  {businessName || "Zaine's Stay & Play"}
                </span>
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-background/50">
                  Private Dog Boarding
                </span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed mb-6 max-w-xs text-background/70">
              {websiteProfile.siteDescription || "Private, small-capacity dog boarding with admin-managed suites, add-ons, and transparent pricing."}
            </p>
            <div className="flex gap-4 mb-6">
              <Link
                href={socialLinks.facebook}
                aria-label={`${businessName} on Facebook`}
                className="focus-ring rounded-sm text-background/50 hover:text-white transition-colors"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Facebook className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href={socialLinks.instagram}
                aria-label={`${businessName} on Instagram`}
                className="focus-ring rounded-sm text-background/50 hover:text-white transition-colors"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href={socialLinks.twitter}
                aria-label={`${businessName} on X (Twitter)`}
                className="focus-ring rounded-sm text-background/50 hover:text-white transition-colors"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Twitter className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-5">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                ["Home", "/"],
                ["About Us", "/about"],
                ["Reviews", "/reviews"],
                ["Gallery", "/gallery"],
                ["FAQ", "/faq"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="focus-ring rounded-sm text-background/70 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-5">
              Stay Options
            </h3>
            <ul className="space-y-3 text-sm">
              {featuredLinks.map(({ label, href }) => (
                <li key={`${label}-${href}`}>
                  <Link
                    href={href}
                    className="focus-ring rounded-sm text-background/70 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-5">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm mb-6">
              <li className="flex items-center gap-2">
                <MapPin
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--color-yellow)" }}
                  aria-hidden="true"
                />
                <span className="text-background/70">
                  {`${contactInfo.address}, ${contactInfo.city}, ${contactInfo.state} ${contactInfo.zip}`}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--color-yellow)" }}
                  aria-hidden="true"
                />
                <a
                  href={`tel:${contactInfo.phone.replace(/\D/g, '')}`}
                  className="focus-ring rounded-sm text-background/70 hover:text-white transition-colors"
                >
                  {contactInfo.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--color-yellow)" }}
                  aria-hidden="true"
                />
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="focus-ring break-all rounded-sm text-background/70 hover:text-white transition-colors"
                >
                  {contactInfo.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Clock
                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                  style={{ color: "var(--color-yellow)" }}
                  aria-hidden="true"
                />
                <span className="text-background/70">
                  Mon-Fri: {weekdayHours}
                  <br />
                  Sat-Sun: {weekendHours}
                </span>
              </li>
            </ul>

            {/* Newsletter */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3">
                Stay Connected!
              </h4>
              <p className="text-xs text-background/60 mb-3">
                Get special offers, fun updates, and photo highlights!
              </p>
              <form className="flex gap-2" onSubmit={handleNewsletterSubmit}>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="h-9 text-sm bg-white/10 border-white/20 text-white placeholder:text-background/40 focus:border-white/40"
                  aria-label="Email address for newsletter"
                  value={newsletterEmail}
                  onChange={(event) => {
                    setNewsletterEmail(event.target.value);
                    if (newsletterMessage) {
                      setNewsletterMessage("");
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 px-4 text-xs font-bold"
                  style={{
                    background: "var(--color-yellow)",
                    color: "var(--color-navy)",
                  }}
                >
                  Subscribe
                </Button>
              </form>
              {newsletterMessage ? (
                <p className="mt-2 text-xs text-background/70" aria-live="polite">
                  {newsletterMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-14 border-t border-background/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-background/40">
          <p>
            &copy; {currentYear} {businessName}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="focus-ring rounded-sm hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="focus-ring rounded-sm hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

