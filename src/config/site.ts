export const siteConfig = {
  name: "Zaine's Stay & Play",
  description:
    "Private, small-capacity dog boarding in Syracuse, NY with configurable suites, transparent pricing, and owner-led care.",
  url: "https://zainesstayandplay.com",
  ogImage: "https://zainesstayandplay.com/og-default.svg",
  links: {
    facebook:
      "https://www.facebook.com/people/Zaines-Stay-Play/61550036005682/",
    instagram: "https://instagram.com/zainesstayandplay",
    twitter: "https://twitter.com/zainesstayandplay",
  },
  contact: {
    phone: "(315) 765-7297",
    email: "jgibbs@zainesstayandplay.com",
    address: "6353 Court Street Road",
    city: "East Syracuse",
    state: "NY",
    zip: "13057",
  },
  hours: {
    weekday: "6:00 AM - 8:00 PM",
    weekend: "8:00 AM - 6:00 PM",
    available: "24/7 Supervision",
  },
  serviceArea: [
    "Syracuse",
    "Liverpool",
    "Cicero",
    "Baldwinsville",
    "Fayetteville",
    "Manlius",
    "Clay",
    "North Syracuse",
  ],
};

type NavChildItem = {
  title: string;
  href: string;
};

type NavItem = {
  title: string;
  href: string;
  children?: NavChildItem[];
};

export const navItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "About Us",
    href: "/about",
  },
  {
    title: "Suites",
    href: "/suites",
  },
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Photo Gallery",
    href: "/gallery",
  },
  {
    title: "Reviews",
    href: "/reviews",
  },
  {
    title: "Contact",
    href: "/contact",
  },
];

export const cities = [
  "Syracuse",
  "Liverpool",
  "Cicero",
  "Baldwinsville",
  "Fayetteville",
  "Manlius",
  "Clay",
  "North Syracuse",
];
