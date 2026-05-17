import { useEffect, useState, useRef, useCallback } from "react";
import { computeAdaptivePollDelay } from "@/hooks/pollingScheduler";
import { safeJsonResponse } from "@/lib/safe-json-response";

interface Photo {
  id: string;
  imageUrl: string;
  caption?: string;
  uploadedBy?: string;
  uploadedAt: Date | string;
  pet?: { id: string; name: string };
}

interface PhotosApiResponse {
  items: Array<Omit<Photo, "uploadedAt"> & { uploadedAt: string }>;
  hasMore: boolean;
  nextCursor: string | null;
}

interface UsePhotoGalleryOptions {
  bookingId: string;
  enabled?: boolean;
  pollIntervalMs?: number; // Default: 30000 (30 seconds)
  petId?: string;
}

interface UsePhotoGalleryResult {
  photos: Photo[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  nextCursor: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  totalPhotos: number;
}

/**
 * Hook for polling and managing pet photos
 * Handles cursor-based pagination for gallery
 */
export function usePhotoGallery({
  bookingId,
  enabled = true,
  pollIntervalMs = 30000,
  petId,
}: UsePhotoGalleryOptions): UsePhotoGalleryResult {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController>(null);
  const consecutiveFailuresRef = useRef(0);

  // Fetch photos
  const fetchPhotos = useCallback(
    async (cursor?: string, append = false): Promise<boolean> => {
      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        abortControllerRef.current = new AbortController();

        const params = new URLSearchParams({
          limit: "20",
          ...(cursor && { cursor }),
          ...(petId && { petId }),
        });

        const response = await fetch(
          `/api/bookings/${bookingId}/photos?${params}`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch photos: ${response.status}`);
        }

        const data = await safeJsonResponse<PhotosApiResponse>(response, {
          items: [],
          hasMore: false,
          nextCursor: null,
        });
        const newPhotos = data.items.map((item) => ({
          ...item,
          uploadedAt: new Date(item.uploadedAt),
        }));

        if (append) {
          setPhotos((prev) => [...prev, ...newPhotos]);
        } else {
          setPhotos(newPhotos);
        }

        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        return true;
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setIsError(true);
          setError(err);
          console.error("Photo gallery polling error:", err);
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [bookingId, petId]
  );

  // Load more handler
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchPhotos(nextCursor ?? undefined, true);
  }, [hasMore, isLoading, nextCursor, fetchPhotos]);

  // Refresh handler
  const refresh = useCallback(async () => {
    await fetchPhotos();
  }, [fetchPhotos]);

  // Initial load and polling setup
  useEffect(() => {
    if (!enabled || !bookingId) return;

    let cancelled = false;

    const runPollCycle = async () => {
      const wasSuccessful = await fetchPhotos();
      if (cancelled) return;

      consecutiveFailuresRef.current = wasSuccessful
        ? 0
        : consecutiveFailuresRef.current + 1;

      const nextDelayMs = computeAdaptivePollDelay({
        baseIntervalMs: pollIntervalMs,
        consecutiveFailures: consecutiveFailuresRef.current,
      });

      pollTimeoutRef.current = setTimeout(() => {
        void runPollCycle();
      }, nextDelayMs);
    };

    void runPollCycle();

    return () => {
      cancelled = true;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, [enabled, bookingId, pollIntervalMs, petId, fetchPhotos]);

  return {
    photos,
    isLoading,
    isError,
    error,
    hasMore,
    nextCursor,
    loadMore,
    refresh,
    totalPhotos: photos.length,
  };
}
