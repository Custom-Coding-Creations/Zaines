import { NextResponse } from 'next/server';
import { getReviewsData, getStaticFallbackReviews } from '@/lib/google-reviews';
import { getAdminSettings } from '@/lib/api/admin-settings';

export const revalidate = 3600;

export async function GET() {
  try {
    const liveData = await getReviewsData();

    if (liveData) {
      return NextResponse.json(liveData);
    }

    // Fall back to static reviews using admin settings fallback values
    const settings = await getAdminSettings();
    const { fallbackRating, fallbackReviewCount } = settings.googleReviewsSettings;
    const staticData = getStaticFallbackReviews();

    return NextResponse.json({
      ...staticData,
      rating: fallbackRating,
      totalReviews: fallbackReviewCount,
    });
  } catch {
    return NextResponse.json(getStaticFallbackReviews());
  }
}
