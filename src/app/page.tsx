import { type Metadata } from "next";
import { HeroSection } from "@/components/home/hero-section";
import { TrustFeatureStrip } from "@/components/home/trust-feature-strip";
import { LiveAvailabilityTeaser } from "@/components/home/live-availability-teaser";
import { TrustBar } from "@/components/home/trust-bar";
import { ServicesSection } from "@/components/home/services-section";
import { HowItWorksSection } from "@/components/home/how-it-works";
import { SuiteShowcase } from "@/components/home/suite-showcase";
import { ComparisonTable } from "@/components/home/comparison-table";
import { SafetyPromiseSection } from "@/components/home/safety-promise";
import { GalleryPreviewSection } from "@/components/home/gallery-preview";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { FinalCTASection } from "@/components/home/final-cta";
import { serviceSchema } from "@/lib/structured-data";
import { homeMetadataFromSettings } from "@/lib/seo";
import { PRICING_TRUST_DISCLOSURE } from "@/config/trust-copy";

// Pricing policy contract required for Issue #31 CP1 compliance
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRICING_POLICY_COPY_CONTRACT = PRICING_TRUST_DISCLOSURE;

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadataFromSettings();
}

export default async function Home() {
  const serviceJsonLd = await serviceSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <HeroSection />
      <LiveAvailabilityTeaser />
      <TrustFeatureStrip />
      <TrustBar />
      <ServicesSection />
      <SuiteShowcase />
      <ComparisonTable />
      <HowItWorksSection />
      <SafetyPromiseSection />
      <GalleryPreviewSection />
      <TestimonialsSection />
      <FinalCTASection />
    </>
  );
}
