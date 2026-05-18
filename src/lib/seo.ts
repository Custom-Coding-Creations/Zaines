import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getAdminSettings } from "@/lib/api/admin-settings";

// Data, types, and constants live in seo.data.ts (kept under 300-line limit).
// All symbols are re-exported here so existing `@/lib/seo` imports remain stable.
export {
  seoBaseUrl,
  type LocalGrowthPage,
  type SeoRouteIntent,
  syracusePillarRoute,
  syracuseDaycareRoute,
  syracuseGroomingRoute,
  localGrowthPages,
  type LocalGrowthSlug,
  keywordRouteMap,
  seoRouteArchitecture,
  seoIntentRouteMap,
  publicSeoRoutes,
  robotsDisallowRoutes,
  conversionFunnelLinks,
  localFaqs,
} from "./seo.data";
import {
  seoBaseUrl,
  type LocalGrowthPage,
  syracusePillarRoute,
  syracuseDaycareRoute,
  syracuseGroomingRoute,
  localGrowthPages,
  localFaqs,
} from "./seo.data";

type SeoRuntimeConfig = {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  ogImageUrl: string;
};

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

function absoluteUrlFromBase(baseUrl: string, path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${stripTrailingSlash(baseUrl)}${normalizedPath}`;
}

export async function getSeoRuntimeConfig(): Promise<SeoRuntimeConfig> {
  try {
    const settings = await getAdminSettings();
    const siteUrl = settings.websiteProfileSettings.siteUrl || siteConfig.url;
    const configuredOgImage = settings.websiteProfileSettings.ogImageUrl || '';
    const legacyBrokenOgPattern = /\/og\.jpg$/i;
    const normalizedConfiguredOg = configuredOgImage.startsWith('/')
      ? absoluteUrlFromBase(siteUrl, configuredOgImage)
      : configuredOgImage;
    const ogImageUrl =
      !configuredOgImage || legacyBrokenOgPattern.test(configuredOgImage)
        ? siteConfig.ogImage
        : normalizedConfiguredOg;

    return {
      siteName: settings.businessProfileSettings.businessName || siteConfig.name,
      siteUrl,
      siteDescription:
        settings.websiteProfileSettings.siteDescription ||
        siteConfig.description,
      ogImageUrl,
    };
  } catch {
    return {
      siteName: siteConfig.name,
      siteUrl: siteConfig.url,
      siteDescription: siteConfig.description,
      ogImageUrl: siteConfig.ogImage,
    };
  }
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${seoBaseUrl}${normalizedPath}`;
}

export function findLocalGrowthPage(slug: string) {
  return localGrowthPages.find((page) => page.slug === slug);
}

export function localGrowthMetadata(page: LocalGrowthPage): Metadata {
  const url = absoluteUrl(page.route);

  return {
    title: page.title,
    description: page.metaDescription,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      title: page.title,
      description: page.metaDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} private dog boarding for ${page.city}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.metaDescription,
      images: [siteConfig.ogImage],
    },
  };
}

export async function localGrowthMetadataFromSettings(
  page: LocalGrowthPage,
): Promise<Metadata> {
  const seo = await getSeoRuntimeConfig();
  const url = absoluteUrlFromBase(seo.siteUrl, page.route);

  return {
    title: page.title,
    description: page.metaDescription,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      title: page.title,
      description: page.metaDescription,
      siteName: seo.siteName,
      images: [
        {
          url: seo.ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${seo.siteName} private dog boarding for ${page.city}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.metaDescription,
      images: [seo.ogImageUrl],
    },
  };
}

export async function rootMetadataFromSettings(): Promise<Metadata> {
  const seo = await getSeoRuntimeConfig();
  const baselineDescription =
    "Private boutique dog boarding in Syracuse, NY with limited suite capacity, owner always on-site, camera-monitored care, and transparent pricing. Serving Syracuse, Liverpool, Cicero, Baldwinsville & surrounding areas.";
  const requiredLocalIntentTerms = [
    "syracuse dog boarding",
    "private dog boarding syracuse",
    "small dog boarding syracuse",
  ];
  const candidateDescription = seo.siteDescription.trim();
  const normalizedCandidateDescription = candidateDescription.toLowerCase();
  const hasRequiredLocalIntentTerms = requiredLocalIntentTerms.every((term) =>
    normalizedCandidateDescription.includes(term),
  );
  const rootDescription = hasRequiredLocalIntentTerms
    ? candidateDescription
    : baselineDescription;

  return {
    title: {
      default: `Luxury Dog Boarding Syracuse NY | ${seo.siteName}`,
      template: `%s | ${seo.siteName}`,
    },
    description: rootDescription,
    keywords: [
      "dog boarding Syracuse NY",
      "luxury dog boarding Syracuse",
      "private dog boarding Syracuse",
      "overnight dog boarding Syracuse",
      "boutique dog boarding",
      "cage-free dog boarding",
      "dog boarding Clay NY",
      "dog boarding Cicero NY",
      "dog boarding Baldwinsville NY",
      "owner on site dog boarding",
      "small capacity dog boarding",
      "private dog boarding",
    ],
    authors: [{ name: seo.siteName, url: seo.siteUrl }],
    creator: seo.siteName,
    metadataBase: new URL(seo.siteUrl),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: seo.siteUrl,
      title: `Luxury Dog Boarding Syracuse NY | ${seo.siteName}`,
      description: rootDescription,
      siteName: seo.siteName,
      images: [
        {
          url: seo.ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${seo.siteName} — Private Dog Boarding Syracuse NY`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Luxury Dog Boarding Syracuse NY | ${seo.siteName}`,
      description: rootDescription,
      images: [seo.ogImageUrl],
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/icon.svg" }],
      shortcut: ["/icon.svg"],
    },
    manifest: "/manifest.webmanifest",
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export async function homeMetadataFromSettings(): Promise<Metadata> {
  const seo = await getSeoRuntimeConfig();

  return {
    title: `Luxury Private Dog Boarding Syracuse NY | ${seo.siteName}`,
    description:
      "Boutique private dog boarding in Syracuse, NY with limited suite capacity, owner always on-site, camera-monitored 24/7, cage-free care, and no hidden fees. Serving Syracuse, Liverpool, Cicero, Baldwinsville & surrounding areas.",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: seo.siteUrl,
      title: `Luxury Private Dog Boarding Syracuse NY | ${seo.siteName}`,
      description:
        "Limited private suites. Owner always on-site. Calm routines, daily photo updates, and genuine individualized care. Your dog's home away from home.",
      siteName: seo.siteName,
      images: [
        {
          url: seo.ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${seo.siteName} — Private Dog Boarding Syracuse NY`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Luxury Private Dog Boarding Syracuse NY | ${seo.siteName}`,
      description:
        "Limited private suites. Owner always on-site. Calm routines, daily photo updates, and genuine individualized care.",
      images: [seo.ogImageUrl],
    },
  };
}

export async function locationsMetadataFromSettings(): Promise<Metadata> {
  const seo = await getSeoRuntimeConfig();
  const canonical = absoluteUrlFromBase(seo.siteUrl, "/locations");

  return {
    title: "Syracuse-Area Dog Boarding Locations",
    description:
      "Find private dog boarding pages for Syracuse, Liverpool, Cicero, Baldwinsville, Fayetteville, Manlius, and nearby Central New York families.",
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: `Syracuse-Area Dog Boarding Locations | ${seo.siteName}`,
      description:
        "Find private dog boarding pages for Syracuse-area families and move directly into booking availability.",
      siteName: seo.siteName,
      images: [
        {
          url: seo.ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${seo.siteName} service locations for Syracuse-area dog boarding`,
        },
      ],
    },
  };
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${seoBaseUrl}/#localbusiness`,
    name: siteConfig.name,
    url: seoBaseUrl,
    image: siteConfig.ogImage,
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.address,
      addressLocality: siteConfig.contact.city,
      addressRegion: siteConfig.contact.state,
      postalCode: siteConfig.contact.zip,
      addressCountry: "US",
    },
    areaServed: siteConfig.serviceArea.map((area) => ({
      "@type": "City",
      name: area,
    })),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "06:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: "08:00",
        closes: "18:00",
      },
    ],
    sameAs: Object.values(siteConfig.links),
  };
}

export function serviceSchema(page: LocalGrowthPage) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${absoluteUrl(page.route)}#service`,
    name: `Private dog boarding for ${page.city}, ${page.region}`,
    serviceType: "Private dog boarding",
    provider: {
      "@id": `${seoBaseUrl}/#localbusiness`,
    },
    areaServed: {
      "@type": "City",
      name: page.city,
      addressRegion: page.region,
      addressCountry: "US",
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl("/pricing"),
      availability: "https://schema.org/LimitedAvailability",
      priceCurrency: "USD",
    },
  };
}

export function faqSchema(faqs = localFaqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function localGrowthSchemas(page: LocalGrowthPage) {
  return [
    localBusinessSchema(),
    serviceSchema(page),
    faqSchema(),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      {
        name: page.route === syracusePillarRoute ? page.h1 : "Locations",
        path: page.route === syracusePillarRoute ? page.route : "/locations",
      },
      ...(page.route === syracusePillarRoute
        ? []
        : [{ name: page.h1, path: page.route }]),
    ]),
  ];
}
