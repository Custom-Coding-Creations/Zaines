import { Metadata } from "next";
import AboutPageContent from "./page-content";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "About Zaine's Stay & Play | Private Dog Boarding in Syracuse NY",
    description:
      "Learn about Zaine's Stay & Play and our owner-led private dog boarding approach in Syracuse, with calm routines, photo updates, and personalized care.",
    keywords: [
      "dog boarding Syracuse",
      "private dog boarding team",
      "pet care philosophy",
      "Syracuse dog care",
      "owner-led dog care",
    ],
    canonicalPath: "/about",
  });
}

export default function AboutPage() {
  return <AboutPageContent />;
}
