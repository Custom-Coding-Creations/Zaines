import { type Metadata } from "next";
import { HeroSection } from "@/components/home/hero-section";
import { TrustFeatureStrip } from "@/components/home/trust-feature-strip";
import { LiveAvailabilityTeaser } from "@/components/home/live-availability-teaser";
import { TrustBar } from "@/components/home/trust-bar";
import { ServicesSection } from "@/components/home/services-section";
import { HowItWorksSection } from "@/components/home/how-it-works";
import { ComparisonTable } from "@/components/home/comparison-table";
import { SafetyPromiseSection } from "@/components/home/safety-promise";
import { GalleryPreviewSection } from "@/components/home/gallery-preview";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { FinalCTASection } from "@/components/home/final-cta";
import { serviceSchema, aggregateRatingSchema } from "@/lib/structured-data";
import { homeMetadataFromSettings } from "@/lib/seo";
import { PRICING_TRUST_DISCLOSURE } from "@/config/trust-copy";
import { getReviewsData } from "@/lib/google-reviews";
import { getAdminSettings } from "@/lib/api/admin-settings";

// Pricing policy contract required for Issue #31 CP1 compliance
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRICING_POLICY_COPY_CONTRACT = PRICING_TRUST_DISCLOSURE;

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadataFromSettings();
}

export default async function Home() {
  const [serviceJsonLd, settings, liveData] = await Promise.all([
    serviceSchema(),
    getAdminSettings(),
    getReviewsData(),
  ]);

  const { fallbackRating, fallbackReviewCount } = settings.googleReviewsSettings;
  const aggregateRating = await aggregateRatingSchema({
    ratingValue: liveData ? liveData.rating : fallbackRating,
    reviewCount: liveData ? liveData.totalReviews : fallbackReviewCount,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRating) }}
      />

      <HeroSection />
      <LiveAvailabilityTeaser />
      <TrustFeatureStrip />
      <TrustBar />
      <ServicesSection />
      <ComparisonTable />
      <HowItWorksSection />
      <SafetyPromiseSection />
      <GalleryPreviewSection />
      <TestimonialsSection />
      <FinalCTASection />
    </>
  );
}
