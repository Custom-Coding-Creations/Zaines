import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Wifi,
  Camera,
  Bed,
  Tv,
  Music,
  Thermometer,
  Home,
  Sparkles,
  Crown,
} from "lucide-react";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { getConfiguredSuiteCount, getTotalConfiguredSuiteCapacity } from "@/lib/site/service-tiers";

// Metadata - note: using 'use client' requires export at module level if needed
export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "Luxury Dog Boarding Suites Syracuse NY | Zaine's Stay & Play",
    description:
      "Discover our premium Standard, Deluxe, and Luxury boarding suites. Each suite features climate control, 24/7 monitoring, and individualized care for your beloved companion.",
    keywords: [
      "dog boarding suites",
      "luxury dog boarding",
      "private dog suites",
      "Syracuse NY dog boarding",
      "climate controlled suites",
    ],
    canonicalPath: "/suites",
  });
}

// Static marketing content for each suite type
// This content is matched to configured service tiers by name
const suiteMetadata: Record<string, {
  size: string;
  icon: typeof Home;
  features: string[];
  bestFor: string;
}> = {
  "Standard Suite": {
    size: "6' x 8'",
    icon: Home,
    features: [
      "Comfortable raised bed with washable linens",
      "Climate controlled environment",
      "Daily professional cleaning",
      "2 supervised potty breaks",
      "2 group play sessions",
      "Meal service (2x daily)",
      "Basic enrichment toys",
    ],
    bestFor: "Perfect for dogs who love routine and comfort",
  },
  "Deluxe Suite": {
    size: "8' x 10'",
    icon: Sparkles,
    features: [
      "Luxury orthopedic bedding",
      "Climate controlled with air purification",
      "Live webcam access (24/7)",
      "3 supervised potty breaks",
      "3 group play sessions + 1 solo enrichment",
      "Meal service (3x daily, custom options)",
      "Calming music & ambient sounds",
      "Premium puzzle toys & Kong collection",
      "Weekly photo updates",
    ],
    bestFor: "Most dogs & families seeking peace of mind",
  },
  "Luxury Suite": {
    size: "10' x 12'",
    icon: Crown,
    features: [
      "Private outdoor patio with shade structure",
      "Luxury orthopedic memory foam bed",
      "Climate controlled with humidity control",
      "24/7 HD webcam access + live chat",
      "4 supervised potty breaks + on-demand access",
      "4 customized play sessions",
      "Meal service (custom schedule, premium options)",
      "Dog-friendly TV & calming content",
      "Premium toy rotation & spa services",
      "Luxury turndown service & bedtime routine",
      "Daily video updates & photo album",
      "Direct access to owner (priority support)",
    ],
    bestFor: "Discerning pet parents who want the absolute best",
  },
};

const amenities = [
  {
    icon: Camera,
    title: "24/7 Live Webcams",
    description: "Monitor your pup anytime, from anywhere in the world",
  },
  {
    icon: Wifi,
    title: "Smart Monitoring",
    description: "Real-time temperature, humidity, and air quality sensors",
  },
  {
    icon: Thermometer,
    title: "Climate Control",
    description: "Perfect temperature and humidity year-round for comfort",
  },
  {
    icon: Music,
    title: "Calming Environment",
    description: "Curated playlists and ambient sounds for relaxation",
  },
  {
    icon: Bed,
    title: "Premium Bedding",
    description: "Orthopedic beds with hypoallergenic, washable covers",
  },
  {
    icon: Tv,
    title: "Enrichment Content",
    description: "Dog-friendly TV programs and calming videos (Deluxe+)",
  },
];

export default async function SuitesPage() {
  const settings = await getAdminSettings();
  const configuredSuiteCount = getConfiguredSuiteCount(settings.serviceSettings.serviceTiers);
  const totalCapacity = getTotalConfiguredSuiteCapacity(settings.serviceSettings.serviceTiers);
  
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: settings.pricingSettings.currency || "USD",
    maximumFractionDigits: 0,
  });

  // Get active suite-related service tiers from admin settings
  const suiteTiers = settings.serviceSettings.serviceTiers
    .filter((tier) => tier.isActive && tier.name.toLowerCase().includes("suite"))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <FadeUp>
        <section className="relative bg-gradient-to-br from-primary/5 via-primary/2 to-secondary/3 py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                Luxury Accommodations
              </Badge>
              <h1 className="mb-6 font-display text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
                Your Dog&apos;s Home Away From Home
              </h1>
              <p className="mb-8 text-lg md:text-xl text-foreground/70">
                Choose from our thoughtfully designed suites, each offering premium comfort, individualized attention, and the security of knowing your beloved companion is in the best possible hands.
              </p>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* Suites Showcase */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-16 text-center">
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-semibold">
                {suiteTiers.length > 0 ? "Three Levels of Luxury" : "Luxury Suites"}
              </h2>
              <p className="text-lg text-foreground/60">
                All suites include daily activities, professional supervision, and premium amenities
              </p>
            </div>
          </FadeUp>

          {suiteTiers.length > 0 ? (
            <StaggerContainer className="flex flex-wrap justify-center gap-8 items-stretch">
              {suiteTiers.map((tier, index) => {
                const metadata = suiteMetadata[tier.name] || {
                  size: "Contact us for details",
                  icon: Home,
                  features: tier.description.split('.').filter(s => s.trim()),
                  bestFor: "Contact us for more information",
                };
                const SuiteIcon = metadata.icon;
                const isPopular = suiteTiers.length > 1 && index === 1;
                const imageUrl = tier.imageUrl || "/images/suites/standard-suite-default.webp";
                
                return (
                  <StaggerItem key={tier.id} className="h-full w-full md:w-[calc(50%-1rem)] xl:w-[calc(33.333%-1.333rem)]">
                    <div className={`relative group h-full transition-all duration-300 ${
                      isPopular ? "md:scale-[1.02]" : ""
                    }`}>
                      {isPopular && (
                        <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      )}
                      <Card
                        className={`relative flex h-full flex-col overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/30 ${
                          isPopular ? "border-primary/50 shadow-lg" : ""
                        }`}
                      >
                        {isPopular && (
                          <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground shadow-lg">
                            Most Popular
                          </Badge>
                        )}
                        <CardHeader className={`pb-2 ${isPopular ? "pt-6" : ""}`}>
                          <div className="mb-4 flex items-start justify-between">
                            <div>
                              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <SuiteIcon className="h-6 w-6 text-primary" />
                              </div>
                              <CardTitle className="font-display text-2xl md:text-3xl">
                                {tier.name}
                              </CardTitle>
                              <CardDescription className="mt-2 line-clamp-2 text-base">
                                {tier.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1 mb-4">
                            <span className="font-display text-4xl font-semibold text-primary">
                              {formatter.format(tier.baseNightlyRate)}
                            </span>
                            <span className="text-sm text-foreground/60">
                              / night
                            </span>
                          </div>
                          <div className="text-sm text-foreground/50 font-medium">
                            Suite Size: {metadata.size}
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col pt-0 pb-6">
                          <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                            <Image
                              src={imageUrl}
                              alt={`${tier.name} suite image`}
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              className="object-cover"
                            />
                          </div>
                          <ul className="space-y-3 flex-1 mb-6">
                            {metadata.features.map((feature) => (
                              <li
                                key={feature}
                                className="flex items-start gap-3"
                              >
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary flex-shrink-0" />
                                <span className="text-sm text-foreground/70">
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-auto">
                            <Button
                              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                              size="lg"
                              asChild
                            >
                              <Link href="/book?fresh=true">Reserve This Suite</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          ) : (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground mb-4">
                Our luxury suites are being configured.
              </p>
              <p className="text-sm text-muted-foreground">
                Please contact us for current availability and rates.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Amenities Section */}
      <section className="bg-secondary/40 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-16 text-center">
              <h2 className="mb-4 font-display text-3xl md:text-4xl font-semibold">
                Thoughtful Amenities
              </h2>
              <p className="text-lg text-foreground/60">
                Premium features designed for your dog&apos;s comfort and well-being
              </p>
            </div>
          </FadeUp>

          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => (
              <StaggerItem key={amenity.title}>
                <Card className="border-border/30 bg-background/50 backdrop-blur-sm hover:bg-background transition-colors duration-300">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <amenity.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-display text-lg">
                          {amenity.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {amenity.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Trust & Transparency */}
      <FadeUp>
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-xl border border-primary/20 bg-primary/5 p-8 md:p-12 text-center">
              <h3 className="mb-4 font-display text-2xl font-semibold">
                What&apos;s Included in Every Suite
              </h3>
              <ul className="space-y-2 text-foreground/70">
                <li>✓ Professional care from trained, certified staff</li>
                <li>✓ 24/7 owner on-site supervision</li>
                <li>✓ Individualized care plans for all dogs</li>
                <li>✓ Regular communication & photo updates</li>
                <li>✓ Emergency veterinary care protocol</li>
                <li>✓ Complete vaccination verification</li>
              </ul>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* CTA Section */}
      <FadeUp>
        <section className="bg-gradient-to-r from-primary/90 to-primary py-16 md:py-24 text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 font-display text-3xl md:text-4xl font-semibold">
              Limited Capacity — Reserve Early
            </h2>
            <p className="mb-8 text-lg opacity-90 max-w-2xl mx-auto">
              {configuredSuiteCount > 0
                ? `Zaine's currently offers ${configuredSuiteCount} configured suite option${configuredSuiteCount === 1 ? '' : 's'}${totalCapacity > 0 ? ` with ${totalCapacity} total guest spots` : ''}. Availability fills quickly during peak seasons.`
                : "Zaine's maintains an intentionally small capacity so each guest receives personalized attention. Availability fills quickly during peak seasons."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <Link href="/book">Check Availability</Link>
              </Button>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* Schema.org Structured Data */}
      {suiteTiers.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: "Luxury Dog Boarding Suites",
              description:
                "Three levels of luxury dog boarding accommodations with 24/7 care and monitoring",
              mainEntity: suiteTiers.map((tier) => {
                const metadata = suiteMetadata[tier.name];
                return {
                  "@type": "Accommodation",
                  name: tier.name,
                  description: tier.description,
                  priceRange: `$${tier.baseNightlyRate}`,
                  petsAllowed: true,
                  amenityFeature: [
                    {
                      "@type": "Text",
                      text: "Climate Control",
                    },
                    {
                      "@type": "Text",
                      text: "24/7 Supervision",
                    },
                    {
                      "@type": "Text",
                      text: "Premium Bedding",
                    },
                    {
                      "@type": "Text",
                      text: "Daily Activities",
                    },
                  ],
                  floorSize: metadata ? {
                    "@type": "QuantitativeValue",
                    value: metadata.size,
                    unitCode: "FTK",
                  } : undefined,
                };
              }),
            }),
          }}
        />
      )}
    </div>
  );
}
