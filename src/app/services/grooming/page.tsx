import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeUp, ScaleIn } from "@/components/motion";
import { Sparkles, Scissors, Bath, Wind, Calendar } from "lucide-react";
import { simplePageMetadataFromSettings } from "@/lib/seo-page-metadata";
import { getAdminSettings } from "@/lib/api/admin-settings";

export async function generateMetadata(): Promise<Metadata> {
  return simplePageMetadataFromSettings({
    title: "Grooming Add-Ons | Zaine's Stay & Play",
    description:
      "Professional grooming services available as add-ons to daycare and boarding stays. Baths, nail trims, brushing, and more!",
    canonicalPath: "/services/grooming",
  });
}

export default async function GroomingPage() {
  const settings = await getAdminSettings();
  
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: settings.pricingSettings.currency || "USD",
    maximumFractionDigits: 0,
  });

  // Get active add-ons for grooming services
  const groomingAddOns = settings.addOnsSettings.addOns
    .filter((addOn) => addOn.isActive);

  const iconMap: Record<number, typeof Bath> = {
    0: Bath,
    1: Scissors,
    2: Wind,
    3: Sparkles,
  };

  const colorMap: Record<number, { bg: string; text: string }> = {
    0: { bg: "bg-primary/10", text: "text-primary" },
    1: { bg: "bg-green-100", text: "text-green-600" },
    2: { bg: "oklch(0.88 0.17 90 / 20%)", text: "var(--color-navy)" },
    3: { bg: "bg-coral/20", text: "text-coral" },
  };


  return (
    <div className="flex flex-col bg-background">
      {/* Hero */}
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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                ✨ Add-On Service
              </div>
              <h1 className="font-display mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Grooming{" "}
                <span className="relative inline-block">
                  Services
                  <svg
                    className="absolute -right-4 -top-3 h-8 w-8 text-yellow-300 opacity-80"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2l.09 2.95 2.71-1.3-.78 2.86 2.86-.78-1.3 2.71L18.5 9l-2.95.09 1.3 2.71-2.86-.78.78 2.86-2.71-1.3L12 20l-.09-2.95-2.71 1.3.78-2.86-2.86.78 1.3-2.71L5.5 9l2.95-.09-1.3-2.71 2.86.78-.78-2.86 2.71 1.3z" />
                  </svg>
                </span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-white/90 md:text-xl">
                Add professional grooming to your daycare or boarding stay — your pup goes home looking and feeling their best!
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="font-bold text-base shadow-lg"
                  style={{
                    background: "var(--color-yellow)",
                    color: "var(--color-navy)",
                  }}
                >
                  <Link href="/book">
                    <span className="mr-2 text-xl" aria-hidden="true">
                      🐾
                    </span>
                    Add to Booking
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="font-semibold text-base border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-primary"
                >
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
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

      {/* Grooming Services */}
      <section className="section-padding">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="mb-12 text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                Grooming Menu
              </p>
              <h2 className="font-display mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Pamper Your Pup
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Available as add-ons to daycare and boarding stays
              </p>
            </div>
          </FadeUp>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {groomingAddOns.length > 0 ? (
              groomingAddOns.map((addOn, index) => {
                const Icon = iconMap[index % 4] || Bath;
                const colors = colorMap[index % 4] || colorMap[0];
                const isStyled = index === 2;
                return (
                  <ScaleIn key={addOn.id} delay={0.05 * (index + 1)}>
                    <div className="paw-card p-6">
                      <div
                        className={isStyled ? "badge-icon mb-4" : `badge-icon mb-4 ${colors.bg}`}
                        {...(isStyled && { style: { background: colors.bg } })}
                      >
                        <Icon
                          className={isStyled ? "h-7 w-7" : `h-7 w-7 ${colors.text}`}
                          {...(isStyled && { style: { color: colors.text } })}
                        />
                      </div>
                      <h3 className="font-display mb-2 text-xl font-bold text-foreground">
                        {addOn.name}
                      </h3>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {addOn.description}
                      </p>
                      <p className="font-display text-2xl font-bold text-primary">
                        {addOn.isIncluded || addOn.price <= 0 ? "Included" : formatter.format(addOn.price)}
                      </p>
                    </div>
                  </ScaleIn>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-8">
                <p className="text-muted-foreground">Grooming services coming soon!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="section-padding relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-deep-sky) 0%, var(--color-sky) 100%)",
        }}
      >
        <div className="container relative z-10 mx-auto px-4 text-center">
          <FadeUp>
            <h2 className="font-display mb-6 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              Add Grooming to Your Stay
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
              Book daycare or boarding and add grooming services during checkout — easy!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="font-bold text-base shadow-lg"
                style={{
                  background: "var(--color-yellow)",
                  color: "var(--color-navy)",
                }}
              >
                <Link href="/book">
                  <span className="mr-2 text-xl" aria-hidden="true">
                    🐾
                  </span>
                  Book Now
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="font-semibold text-base border-2 border-white bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-primary"
              >
                <Link href="/contact">
                  <Calendar className="mr-2 h-5 w-5" aria-hidden="true" />
                  Ask Questions
                </Link>
              </Button>
            </div>
          </FadeUp>
        </div>

        {/* Decorative paw prints */}
        <div className="absolute left-8 top-8 text-6xl opacity-10">🐾</div>
        <div className="absolute bottom-12 right-12 text-5xl opacity-10">
          🐾
        </div>
      </section>
    </div>
  );
}
