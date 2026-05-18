import { getAdminSettings } from "@/lib/api/admin-settings";

export async function localBusinessSchema() {
  const settings = await getAdminSettings();
  const businessName = settings.businessProfileSettings.businessName;
  const socialLinks = settings.businessProfileSettings.socialLinks;
  const websiteProfile = settings.websiteProfileSettings;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${websiteProfile.siteUrl}/#business`,
    name: businessName,
    description: websiteProfile.siteDescription,
    url: websiteProfile.siteUrl,
    telephone: settings.contactPhone,
    email: settings.contactEmail,
    priceRange: "$$",
    image: websiteProfile.ogImageUrl,
    logo: websiteProfile.logoImageUrl || `${websiteProfile.siteUrl}/logo.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 43.048,
      longitude: -76.147,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "06:00",
        closes: "20:00",
      },
    ],
    sameAs: [socialLinks.facebook, socialLinks.instagram, socialLinks.twitter],
    areaServed: websiteProfile.serviceArea.map((city) => ({
      "@type": "City",
      name: city,
      containedInPlace: {
        "@type": "State",
        name: "New York",
      },
    })),
    hasMap: `https://maps.google.com/?q=${encodeURIComponent(
      `${settings.address}, ${settings.city}, ${settings.state} ${settings.zip}`
    )}`,
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Private Suites", value: true },
      { "@type": "LocationFeatureSpecification", name: "Owner On-Site Care", value: true },
      { "@type": "LocationFeatureSpecification", name: "Enrichment Activities", value: true },
      { "@type": "LocationFeatureSpecification", name: "24/7 Supervision", value: true },
      { "@type": "LocationFeatureSpecification", name: "Daily Photo Updates", value: true },
      { "@type": "LocationFeatureSpecification", name: "Vaccination Verification", value: true },
      { "@type": "LocationFeatureSpecification", name: "Overnight Boarding", value: true },
    ],
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

export async function serviceSchema() {
  const settings = await getAdminSettings();
  const businessName = settings.businessProfileSettings.businessName;
  const websiteProfile = settings.websiteProfileSettings;
  const serviceTiers = settings.serviceSettings.serviceTiers.filter((t) => t.isActive);
  const pricing = settings.pricingSettings;

  // Build offers from configured service tiers, sorted by display order
  const offers = serviceTiers
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      description: tier.description,
      price: tier.baseNightlyRate.toFixed(2),
      priceCurrency: pricing.currency,
      unitText: "per night",
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Private Dog Boarding",
    provider: {
      "@type": "LocalBusiness",
      name: businessName,
      url: websiteProfile.siteUrl,
    },
    serviceType: "Dog Boarding",
    areaServed: {
      "@type": "City",
      name: "Syracuse",
      containedInPlace: { "@type": "State", name: "New York" },
    },
    description:
      "Boutique private dog boarding with limited suite capacity, owner always on-site, camera monitoring, and daily photo updates. Serving Syracuse and surrounding areas.",
    offers,
  };
}

// ── Organization Schema ─────────────────────────────────────────
export async function organizationSchema() {
  const settings = await getAdminSettings();
  const businessName = settings.businessProfileSettings.businessName;
  const socialLinks = settings.businessProfileSettings.socialLinks;
  const websiteProfile = settings.websiteProfileSettings;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${websiteProfile.siteUrl}/#organization`,
    name: businessName,
    url: websiteProfile.siteUrl,
    logo: websiteProfile.logoImageUrl || `${websiteProfile.siteUrl}/logo.svg`,
    description: websiteProfile.siteDescription,
    email: settings.contactEmail,
    telephone: settings.contactPhone,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address,
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.zip,
      addressCountry: "US",
    },
    sameAs: [
      socialLinks.facebook,
      socialLinks.instagram,
      socialLinks.twitter,
    ].filter(Boolean),
  };
}

// ── Breadcrumb Schema ───────────────────────────────────────────
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export async function breadcrumbSchema(items: BreadcrumbItem[]) {
  const settings = await getAdminSettings();
  const siteUrl = settings.websiteProfileSettings.siteUrl;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}

// ── Aggregate Rating Schema ────────────────────────────────────
export interface AggregateRatingData {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export async function aggregateRatingSchema(rating: AggregateRatingData) {
  const settings = await getAdminSettings();
  const businessName = settings.businessProfileSettings.businessName;
  const websiteProfile = settings.websiteProfileSettings;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${websiteProfile.siteUrl}/#business`,
    name: businessName,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: rating.ratingValue.toFixed(1),
      reviewCount: rating.reviewCount,
      bestRating: rating.bestRating || 5,
      worstRating: rating.worstRating || 1,
    },
  };
}

// ── Review Schema ───────────────────────────────────────────────
export interface ReviewData {
  author: string;
  datePublished: string;
  reviewRating: number;
  reviewBody: string;
}

export async function reviewSchema(reviews: ReviewData[]) {
  const settings = await getAdminSettings();
  const businessName = settings.businessProfileSettings.businessName;
  const websiteProfile = settings.websiteProfileSettings;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${websiteProfile.siteUrl}/#business`,
    name: businessName,
    review: reviews.map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.author,
      },
      datePublished: review.datePublished,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.reviewRating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.reviewBody,
    })),
  };
}

// ── Website Schema ──────────────────────────────────────────────
export async function websiteSchema() {
  const settings = await getAdminSettings();
  const businessName = settings.businessProfileSettings.businessName;
  const websiteProfile = settings.websiteProfileSettings;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${websiteProfile.siteUrl}/#website`,
    name: businessName,
    url: websiteProfile.siteUrl,
    description: websiteProfile.siteDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${websiteProfile.siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
