import { FadeUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import Link from "next/link";
import { getAdminSettings } from "@/lib/api/admin-settings";
import { getReviewsData } from "@/lib/google-reviews";
import type { GoogleReview } from "@/lib/google-reviews";
import type { TestimonialItem } from "@/types/admin";

// Unified display shape used in the template below
interface DisplayReview {
  id: string;
  authorName: string;
  subtitle: string;
  rating: number;
  text: string;
  timeDescription: string;
}

function fromStaticTestimonial(t: TestimonialItem): DisplayReview {
  return {
    id: t.id,
    authorName: t.author,
    subtitle: `${t.petName} · ${t.serviceLabel}`,
    rating: t.rating,
    text: t.text,
    timeDescription: t.date,
  };
}

function fromGoogleReview(r: GoogleReview, idx: number): DisplayReview {
  return {
    id: `google-${idx}`,
    authorName: r.author_name,
    subtitle: 'Google Review',
    rating: r.rating,
    text: r.text,
    timeDescription: r.relative_time_description,
  };
}

export async function TestimonialsSection() {
  const settings = await getAdminSettings();
  const liveData = await getReviewsData();

  let reviews: DisplayReview[];
  let isGoogleSource = false;

  if (liveData && liveData.reviews.length > 0) {
    reviews = liveData.reviews.slice(0, 3).map((r, i) => fromGoogleReview(r, i));
    isGoogleSource = true;
  } else {
    const active = settings.testimonialsSettings.testimonials
      .filter((t) => t.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, 3);
    reviews = active.map(fromStaticTestimonial);
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="section-padding bg-background">
      <div className="container px-4">
        <FadeUp>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl" aria-hidden="true">💬</span>
              <h2 className="heading-playful text-3xl font-bold text-foreground md:text-4xl">
                What Dog Parents Are Saying
              </h2>
              <span className="text-3xl" aria-hidden="true">💬</span>
            </div>
            {isGoogleSource && (
              <div className="flex items-center justify-center gap-1.5 mt-3 text-sm text-muted-foreground">
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Powered by Google</span>
              </div>
            )}
          </div>
        </FadeUp>

        <div className={`grid gap-6 max-w-5xl mx-auto mb-8 ${reviews.length === 3 ? 'md:grid-cols-3' : reviews.length === 2 ? 'md:grid-cols-2' : ''}`}>
          {reviews.map((review, index) => (
            <FadeUp key={review.id} delay={index * 0.1}>
              <div className="paw-card">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-current"
                      style={{ color: "var(--color-yellow)" }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed mb-6 italic">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <span className="text-2xl" aria-hidden="true">🐕</span>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{review.authorName}</div>
                    <div className="text-sm text-muted-foreground">
                      {review.subtitle} · {review.timeDescription}
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.3}>
          <div className="text-center">
            <Button
              asChild
              size="lg"
              style={{
                background: "var(--color-sky)",
                color: "white",
              }}
              className="font-bold shadow-lg"
            >
              <Link href="/reviews">
                Read All Reviews
                <span className="ml-2 text-xl" aria-hidden="true">👍</span>
              </Link>
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
