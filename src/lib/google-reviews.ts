/**
 * Google Places API integration for fetching live reviews
 */

import { unstable_cache } from 'next/cache';
import { getAdminSettings } from '@/lib/api/admin-settings';

export interface GoogleReview {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  profile_photo_url?: string;
}

export interface GooglePlaceDetails {
  reviews: GoogleReview[];
  rating: number;
  user_ratings_total: number;
  name: string;
}

export interface ReviewsData {
  reviews: GoogleReview[];
  rating: number;
  totalReviews: number;
  source: 'google' | 'static';
}

interface PlacesApiResponse {
  result?: {
    name?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: GoogleReview[];
  };
  status?: string;
  error_message?: string;
}

async function _fetchGoogleReviews(
  placeId: string,
  apiKey: string,
): Promise<ReviewsData | null> {
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=name,rating,user_ratings_total,reviews` +
    `&key=${encodeURIComponent(apiKey)}` +
    `&reviews_sort=most_relevant`;

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      console.error(`Google Places API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as PlacesApiResponse;

    if (data.status !== 'OK' || !data.result) {
      console.error(`Google Places API status: ${data.status ?? 'unknown'}`);
      return null;
    }

    const { result } = data;

    return {
      reviews: result.reviews ?? [],
      rating: result.rating ?? 5.0,
      totalReviews: result.user_ratings_total ?? 0,
      source: 'google',
    };
  } catch (error) {
    console.error('Failed to fetch Google reviews:', error);
    return null;
  }
}

export const fetchGoogleReviews = unstable_cache(
  _fetchGoogleReviews,
  ['google-reviews'],
  { revalidate: 3600, tags: ['google-reviews'] },
);

export async function getReviewsData(): Promise<ReviewsData | null> {
  try {
    const settings = await getAdminSettings();
    const { googleReviewsSettings } = settings;

    if (!googleReviewsSettings.enabled) {
      return null;
    }

    const placeId = googleReviewsSettings.placeId.trim();
    const apiKey =
      googleReviewsSettings.apiKey.trim() ||
      process.env.GOOGLE_PLACES_API_KEY?.trim() ||
      '';

    if (!placeId || !apiKey) {
      return null;
    }

    const data = await fetchGoogleReviews(placeId, apiKey);
    if (!data) return null;

    const { minRatingToShow, maxReviewsToShow } = googleReviewsSettings;

    const filteredReviews = data.reviews
      .filter((r) => r.rating >= minRatingToShow)
      .slice(0, maxReviewsToShow);

    return {
      ...data,
      reviews: filteredReviews,
    };
  } catch (error) {
    console.error('getReviewsData error:', error);
    return null;
  }
}

export function getStaticFallbackReviews(): ReviewsData {
  return {
    source: 'static',
    rating: 5.0,
    totalReviews: 47,
    reviews: [
      {
        author_name: 'Sarah M.',
        rating: 5,
        relative_time_description: '2 weeks ago',
        text: 'Max had an amazing stay. The owner sent us photos every day and he looked genuinely happy and relaxed.',
        time: Date.now() / 1000 - 60 * 60 * 24 * 14,
      },
      {
        author_name: 'James T.',
        rating: 5,
        relative_time_description: '1 month ago',
        text: 'Luna settled in quickly and came home calm and happy. We will absolutely be back.',
        time: Date.now() / 1000 - 60 * 60 * 24 * 30,
      },
      {
        author_name: 'Emily R.',
        rating: 5,
        relative_time_description: '1 month ago',
        text: 'The quiet environment and clear communication made all the difference for Charlie.',
        time: Date.now() / 1000 - 60 * 60 * 24 * 32,
      },
    ],
  };
}
