"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FadeUp, ScaleIn } from "@/components/motion";
import Image from "next/image";
import Link from "next/link";

const galleryImages = [
  {
    id: 1,
    category: "playtime",
    title: "Group Playtime",
    description: "Dogs having fun together",
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=400&fit=crop",
  },
  {
    id: 2,
    category: "playtime",
    title: "Running & Playing",
    description: "Active play sessions",
    imageUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=400&fit=crop",
  },
  {
    id: 3,
    category: "rest",
    title: "Rest Time",
    description: "Comfortable quiet areas",
    imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop",
  },
  {
    id: 4,
    category: "playtime",
    title: "Outdoor Fun",
    description: "Supervised outdoor play",
    imageUrl: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600&h=400&fit=crop",
  },
  {
    id: 5,
    category: "enrichment",
    title: "Enrichment Activities",
    description: "Puzzle games and training",
    imageUrl: "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=600&h=400&fit=crop",
  },
  {
    id: 6,
    category: "playtime",
    title: "Social Time",
    description: "Making new friends",
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=400&fit=crop&flip=h",
  },
  {
    id: 7,
    category: "grooming",
    title: "Grooming Services",
    description: "Looking their best",
    imageUrl: "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=600&h=400&fit=crop",
  },
  {
    id: 8,
    category: "enrichment",
    title: "Training & Play",
    description: "Learning while having fun",
    imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=400&fit=crop",
  },
  {
    id: 9,
    category: "playtime",
    title: "Happy Pups",
    description: "Tail-wagging good times",
    imageUrl: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=600&h=400&fit=crop",
  },
  {
    id: 10,
    category: "rest",
    title: "Cozy Spaces",
    description: "Comfortable rest areas",
    imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop&flip=h",
  },
  {
    id: 11,
    category: "playtime",
    title: "Group Activities",
    description: "Supervised group play",
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=400&fit=crop&brightness=1.1",
  },
  {
    id: 12,
    category: "enrichment",
    title: "Enrichment Fun",
    description: "Mental stimulation games",
    imageUrl: "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=600&h=400&fit=crop",
  },
];

const categories = [
  { value: "all", label: "All Photos", icon: "📸" },
  { value: "playtime", label: "Playtime", icon: "🎾" },
  { value: "enrichment", label: "Enrichment", icon: "🧩" },
  { value: "rest", label: "Rest Time", icon: "😴" },
  { value: "grooming", label: "Grooming", icon: "✨" },
];

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredImages =
    selectedCategory === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.category === selectedCategory);

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
                Happy Pups,{" "}
                <span className="relative inline-block">
                  Happy Days
                  <svg
                    className="absolute -right-4 -top-3 h-8 w-8 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="6" cy="6" r="1.5" />
                  </svg>
                </span>
              </h1>
              <p className="mb-2 text-lg leading-relaxed text-white/90 md:text-xl">
                See what a day at Zaine's Stay & Play looks like — tails wagging, friends
                playing, and pups having the time of their lives!
              </p>
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

      {/* Filter Tabs */}
      <section className="section-padding-tight">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`rounded-full px-6 py-3 font-semibold transition-all ${
                    selectedCategory === category.value
                      ? "bg-primary text-white shadow-lg scale-105"
                      : "bg-card border-2 border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="mr-2" aria-hidden="true">
                    {category.icon}
                  </span>
                  {category.label}
                </button>
              ))}
            </div>
          </FadeUp>

          {/* Photo Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredImages.map((image, index) => (
              <ScaleIn key={image.id} delay={index * 0.05}>
                <div className="paw-card group overflow-hidden p-0 transition-all hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={image.imageUrl}
                      alt={image.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display mb-1 text-lg font-bold text-foreground">
                      {image.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {image.description}
                    </p>
                  </div>
                </div>
              </ScaleIn>
            ))}
          </div>

          {/* Load More / CTA */}
          <FadeUp delay={0.3}>
            <div className="mt-12 text-center">
              <p className="mb-6 text-lg text-muted-foreground">
                See your pup in action with our daily photo updates!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="font-bold"
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
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact">Schedule a Tour</Link>
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
