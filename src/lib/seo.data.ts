import { siteConfig } from "@/config/site";

export const seoBaseUrl = siteConfig.url.replace(/\/$/, "");

export interface PageConfig {
  slug: string;
  route: string;
  city: string;
  region: string;
  title: string;
  metaDescription: string;
  h1: string;
  eyebrow: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  nearbyAreas: string[];
  proofPoints: string[];
  intro: string;
  bookingAngle: string;
  priority: number;
  serviceType?: "boarding" | "daycare" | "grooming" | "training";
}

export const syracusePillarRoute = "/dog-boarding-syracuse";
export const syracuseDaycareRoute = "/daycare-syracuse";
export const syracuseGroomingRoute = "/grooming-syracuse";

export const localGrowthPages = [
  {
    slug: "syracuse-ny",
    route: syracusePillarRoute,
    city: "Syracuse",
    region: "NY",
    title: "Dog Boarding Syracuse NY | Private Limited-Capacity Care",
    metaDescription:
      "Syracuse dog boarding with private limited capacity, owner-on-site routines, clear pricing, and booking support for local families.",
    h1: "Private Dog Boarding in Syracuse, NY",
    eyebrow: "Syracuse local boarding",
    primaryKeyword: "dog boarding Syracuse NY",
    secondaryKeywords: [
      "private dog boarding Syracuse",
      "small-capacity dog boarding Syracuse",
      "overnight dog boarding Syracuse",
      "Syracuse dog boarding prices",
    ],
    nearbyAreas: ["Eastwood", "Westcott", "Strathmore", "University Hill"],
    proofPoints: [
      "Limited private suites for focused care",
      "Owner-on-site supervision and calm routines",
      "Vaccination records reviewed before confirmation",
      "Pricing is shown before you confirm",
    ],
    intro:
      "Zaine's Stay & Play is built for Syracuse families who want a quieter alternative to high-volume kennels. Guests stay in a small-capacity environment with predictable routines, safety-first intake, and clear communication from booking through pickup.",
    bookingAngle:
      "Start with your dates, compare suite pricing, and reserve before the limited-capacity calendar fills.",
    priority: 0.95,
    serviceType: "boarding",
  },
  {
    slug: "daycare-syracuse-ny",
    route: syracuseDaycareRoute,
    city: "Syracuse",
    region: "NY",
    title: "Dog Daycare Syracuse NY | Small Group Play & Tech Updates",
    metaDescription:
      "Syracuse dog daycare with supervised play groups, real-time photo updates, enrichment activities, and tech-forward communication for peace of mind.",
    h1: "Dog Daycare in Syracuse, NY",
    eyebrow: "Syracuse daycare",
    primaryKeyword: "dog daycare Syracuse NY",
    secondaryKeywords: [
      "dog day care Syracuse",
      "supervised dog play Syracuse",
      "daycare Syracuse NY",
      "Syracuse dog daycare prices",
    ],
    nearbyAreas: ["Downtown Syracuse", "Armory Square", "Tipperary Hill", "Sedgwick"],
    proofPoints: [
      "Small supervised play groups matched by temperament",
      "Real-time photo updates throughout the day",
      "Enrichment activities and structured rest breaks",
      "Tech-forward communication via app and messaging",
    ],
    intro:
      "For Syracuse pet parents who work full-time or want their dog to socialize during the day, Zaine's daycare provides supervised play, mental stimulation, and transparent updates so you always know how your pup is doing.",
    bookingAngle:
      "Book daycare by the day or in multi-day packages. Check availability and pricing online.",
    priority: 0.88,
    serviceType: "daycare",
  },
  {
    slug: "grooming-syracuse-ny",
    route: syracuseGroomingRoute,
    city: "Syracuse",
    region: "NY",
    title: "Dog Grooming Syracuse NY | Professional Care & Booking",
    metaDescription:
      "Professional dog grooming in Syracuse with breed-specific cuts, gentle handling, flexible scheduling, and transparent pricing for Central NY families.",
    h1: "Dog Grooming in Syracuse, NY",
    eyebrow: "Syracuse grooming",
    primaryKeyword: "dog grooming Syracuse NY",
    secondaryKeywords: [
      "dog groomer Syracuse",
      "professional dog grooming Syracuse",
      "pet grooming Syracuse NY",
      "Syracuse dog grooming prices",
    ],
    nearbyAreas: ["North Syracuse", "East Syracuse", "Solvay", "Lakeland"],
    proofPoints: [
      "Breed-specific cuts and professional styling",
      "Gentle, patient handling for anxious dogs",
      "Flexible online booking and transparent pricing",
      "Can be combined with daycare or boarding",
    ],
    intro:
      "Syracuse pet parents trust Zaine's for professional grooming that keeps dogs looking and feeling their best. Our experienced groomers provide breed-specific cuts, nail trims, baths, and more with care and patience.",
    bookingAngle:
      "Schedule grooming appointments online, view service packages, and add grooming to boarding stays.",
    priority: 0.82,
    serviceType: "grooming",
  },
  {
    slug: "liverpool-ny",
    route: "/locations/liverpool-ny",
    city: "Liverpool",
    region: "NY",
    title: "Dog Boarding Near Liverpool NY | Private Syracuse Suites",
    metaDescription:
      "Dog boarding near Liverpool, NY with private suites, owner-on-site care, transparent pricing, and easy booking minutes from Syracuse.",
    h1: "Dog Boarding Near Liverpool, NY",
    eyebrow: "Liverpool area dog boarding",
    primaryKeyword: "dog boarding Liverpool NY",
    secondaryKeywords: [
      "private dog boarding Liverpool NY",
      "overnight dog boarding near Liverpool",
      "Liverpool NY dog boarding prices",
    ],
    nearbyAreas: ["Galeville", "Lakefront", "Salina", "Mattydale"],
    proofPoints: [
      "Private suite stays without crowded group boarding",
      "Daily care routines matched to your household notes",
      "Simple route to Syracuse-area drop-off and pickup",
      "Book online with pricing visible before confirmation",
    ],
    intro:
      "For Liverpool families, the best boarding fit is often the one that feels calm, close, and easy to understand. Our small private-suite model keeps care focused while giving you clear next steps before you commit.",
    bookingAngle:
      "Check availability for your Liverpool-area travel dates and review the pricing page before reserving.",
    priority: 0.74,
  },
  {
    slug: "cicero-ny",
    route: "/locations/cicero-ny",
    city: "Cicero",
    region: "NY",
    title: "Dog Boarding Near Cicero NY | Small-Capacity Care",
    metaDescription:
      "Private dog boarding near Cicero, NY for families who want limited capacity, owner-led routines, and clear Syracuse-area pricing.",
    h1: "Dog Boarding Near Cicero, NY",
    eyebrow: "Cicero local coverage",
    primaryKeyword: "dog boarding Cicero NY",
    secondaryKeywords: [
      "private dog boarding Cicero NY",
      "small dog boarding Cicero",
      "overnight boarding near Cicero NY",
    ],
    nearbyAreas: ["North Syracuse", "Clay", "Bridgeport", "Brewerton"],
    proofPoints: [
      "Limited-capacity model designed for lower-stress stays",
      "Camera-monitored safety routines",
      "Required vaccine review before confirmed care",
      "No surprise add-ons after your pre-confirmation quote",
    ],
    intro:
      "Cicero pet parents often need dependable boarding that is easy to plan around. Zaine's keeps capacity intentionally limited so each guest has a calmer routine and each family gets clearer communication.",
    bookingAngle:
      "Use the booking flow to match dates to available suites, then confirm only after reviewing your quote.",
    priority: 0.72,
  },
  {
    slug: "baldwinsville-ny",
    route: "/locations/baldwinsville-ny",
    city: "Baldwinsville",
    region: "NY",
    title: "Dog Boarding Near Baldwinsville NY | Private Suite Stays",
    metaDescription:
      "Small-capacity dog boarding near Baldwinsville, NY with private suites, owner-on-site oversight, and transparent booking steps.",
    h1: "Dog Boarding Near Baldwinsville, NY",
    eyebrow: "Baldwinsville boarding alternative",
    primaryKeyword: "dog boarding Baldwinsville NY",
    secondaryKeywords: [
      "private dog boarding Baldwinsville",
      "overnight dog boarding Baldwinsville NY",
      "Baldwinsville dog boarding prices",
    ],
    nearbyAreas: ["Lysander", "Van Buren", "Radisson", "Warners"],
    proofPoints: [
      "Private boarding suites instead of high-volume turnover",
      "Owner-led intake and care notes",
      "Clear cancellation and pricing expectations",
      "Internal links to pricing, suites, FAQ, and booking",
    ],
    intro:
      "When you are planning travel from Baldwinsville, boarding should not feel like guesswork. Our local landing path helps you understand fit, safety, pricing, and availability before you reserve.",
    bookingAngle:
      "Compare suite options and pricing first, then reserve the dates that work for your family.",
    priority: 0.7,
  },
  {
    slug: "fayetteville-ny",
    route: "/locations/fayetteville-ny",
    city: "Fayetteville",
    region: "NY",
    title: "Dog Boarding Near Fayetteville NY | Calm Private Care",
    metaDescription:
      "Private dog boarding near Fayetteville, NY with small-capacity Syracuse suites, safety routines, clear pricing, and booking support.",
    h1: "Dog Boarding Near Fayetteville, NY",
    eyebrow: "Fayetteville area boarding",
    primaryKeyword: "dog boarding Fayetteville NY",
    secondaryKeywords: [
      "private dog boarding Fayetteville NY",
      "small-capacity dog boarding Fayetteville",
      "overnight dog boarding near Fayetteville",
    ],
    nearbyAreas: ["DeWitt", "Manlius", "Minoa", "Jamesville"],
    proofPoints: [
      "Calm routines for dogs who do better with structure",
      "Limited capacity for more focused attention",
      "Transparent pricing before confirmation",
      "Easy booking path from local intent to reservation",
    ],
    intro:
      "Fayetteville families looking for a quieter boarding option can use this page to understand how Zaine's handles suite care, safety requirements, pricing, and reservations before making a decision.",
    bookingAngle:
      "Review pricing and reserve early because private-suite availability is intentionally limited.",
    priority: 0.7,
  },
  {
    slug: "manlius-ny",
    route: "/locations/manlius-ny",
    city: "Manlius",
    region: "NY",
    title: "Dog Boarding Near Manlius NY | Private Syracuse Suites",
    metaDescription:
      "Dog boarding near Manlius, NY with private suites, owner-on-site care, daily routines, and clear online booking for Syracuse-area families.",
    h1: "Dog Boarding Near Manlius, NY",
    eyebrow: "Manlius boarding coverage",
    primaryKeyword: "dog boarding Manlius NY",
    secondaryKeywords: [
      "private dog boarding Manlius NY",
      "overnight dog boarding Manlius",
      "Manlius dog boarding prices",
    ],
    nearbyAreas: ["Fayetteville", "Minoa", "Eagle Village", "DeWitt"],
    proofPoints: [
      "Private, small-capacity suites",
      "Owner-on-site supervision",
      "Vaccination and care notes reviewed before stay",
      "Pricing and booking CTAs visible on the page",
    ],
    intro:
      "For Manlius pet parents, Zaine's offers a Syracuse-area boarding path focused on fewer dogs, clear routines, and fewer surprises. The goal is a conversion-safe local page that answers fit and sends ready families to booking.",
    bookingAngle:
      "Use the booking path to check dates, or compare pricing if you are still planning.",
    priority: 0.7,
  },
] as const satisfies readonly LocalGrowthPage[];

export type LocalGrowthSlug = (typeof localGrowthPages)[number]["slug"];

export type SeoRouteIntent =
  | "core-conversion"
  | "trust-proof"
  | "local-demand"
  | "supporting-discovery"
  | "policy";

type SeoRouteArchitectureEntry = {
  route: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  intent: SeoRouteIntent;
  indexable: boolean;
};

export const keywordRouteMap = localGrowthPages.map((page) => ({
  keyword: page.primaryKeyword,
  route: page.route,
  supportingKeywords: page.secondaryKeywords,
}));

export const seoRouteArchitecture: readonly SeoRouteArchitectureEntry[] = [
  { route: "/", priority: 1, changeFrequency: "weekly", intent: "core-conversion", indexable: true },
  { route: "/book", priority: 0.9, changeFrequency: "weekly", intent: "core-conversion", indexable: true },
  { route: "/pricing", priority: 0.88, changeFrequency: "weekly", intent: "core-conversion", indexable: true },
  { route: "/suites", priority: 0.84, changeFrequency: "weekly", intent: "core-conversion", indexable: true },
  { route: "/services/boarding", priority: 0.83, changeFrequency: "weekly", intent: "core-conversion", indexable: true },
  { route: "/reviews", priority: 0.77, changeFrequency: "weekly", intent: "trust-proof", indexable: true },
  { route: "/about", priority: 0.74, changeFrequency: "monthly", intent: "trust-proof", indexable: true },
  { route: "/faq", priority: 0.71, changeFrequency: "monthly", intent: "trust-proof", indexable: true },
  { route: "/contact", priority: 0.69, changeFrequency: "monthly", intent: "supporting-discovery", indexable: true },
  { route: "/gallery", priority: 0.66, changeFrequency: "monthly", intent: "trust-proof", indexable: true },
  { route: "/locations", priority: 0.82, changeFrequency: "weekly", intent: "local-demand", indexable: true },
  { route: "/terms", priority: 0.2, changeFrequency: "yearly", intent: "policy", indexable: true },
  { route: "/privacy", priority: 0.2, changeFrequency: "yearly", intent: "policy", indexable: true },
  { route: "/policies", priority: 0.22, changeFrequency: "yearly", intent: "policy", indexable: true },
  { route: "/preview-themes", priority: 0, changeFrequency: "yearly", intent: "policy", indexable: false },
  { route: "/book/confirmation", priority: 0, changeFrequency: "yearly", intent: "policy", indexable: false },
  ...localGrowthPages.map((page) => ({
    route: page.route,
    priority: page.priority,
    changeFrequency: "weekly" as const,
    intent: "local-demand" as const,
    indexable: true,
  })),
] as const;

export const publicSeoRoutes = seoRouteArchitecture.filter(
  (route) => route.indexable,
);

export const seoIntentRouteMap = {
  coreConversion: seoRouteArchitecture
    .filter((route) => route.intent === "core-conversion" && route.indexable)
    .map((route) => route.route),
  trustProof: seoRouteArchitecture
    .filter((route) => route.intent === "trust-proof" && route.indexable)
    .map((route) => route.route),
  localDemand: seoRouteArchitecture
    .filter((route) => route.intent === "local-demand" && route.indexable)
    .map((route) => route.route),
  supportingDiscovery: seoRouteArchitecture
    .filter(
      (route) => route.intent === "supporting-discovery" && route.indexable,
    )
    .map((route) => route.route),
  policy: seoRouteArchitecture
    .filter((route) => route.intent === "policy" && route.indexable)
    .map((route) => route.route),
} as const;

export const robotsDisallowRoutes = [
  "/api/",
  "/dashboard/",
  "/admin/",
  "/auth/",
  "/book/confirmation",
  "/book/recover/",
  "/checkout/",
  "/_next/",
  "/static/",
  "/preview-themes/",
];

export const conversionFunnelLinks = [
  { href: "/book", label: "Check availability" },
  { href: "/pricing", label: "Review pricing" },
  { href: "/suites", label: "Compare suites" },
  { href: "/locations", label: "Browse local pages" },
  { href: "/faq", label: "Read boarding FAQ" },
];

export const localFaqs = [
  {
    question: "How far ahead should Syracuse-area families book boarding?",
    answer:
      "Because Zaine's operates with limited private-suite capacity, families should book as soon as travel dates are likely. The booking flow shows availability before confirmation.",
  },
  {
    question: "Can I see pricing before I reserve?",
    answer:
      "Yes. Pricing links are surfaced from each local page, and the booking flow shows a quote before confirmation so there are no hidden add-ons later.",
  },
  {
    question: "What vaccines are required for boarding?",
    answer:
      "Rabies, DHPP, and Bordetella records are required before a boarding stay is confirmed. This helps keep the small-capacity environment safer for every guest.",
  },
];
