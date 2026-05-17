import { useEffect, useState, useRef, useCallback } from "react";
import { computeAdaptivePollDelay } from "@/hooks/pollingScheduler";
import { safeJsonResponse } from "@/lib/safe-json-response";

interface Activity {
  id: string;
  type: string;
  description?: string;
  performedBy?: string;
  performedAt: Date | string;
  notes?: string;
  pet?: { id: string; name: string };
}

interface ActivitiesApiResponse {
  items: Array<Omit<Activity, "performedAt"> & { performedAt: string }>;
  hasMore: boolean;
  nextCursor: string | null;
}

interface UseActivityPollingOptions {
  bookingId: string;
  enabled?: boolean;
  pollIntervalMs?: number; // Default: 30000 (30 seconds for SLA)
  activityTypes?: string[];
}

interface UseActivityPollingResult {
  activities: Activity[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  nextCursor: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  filteredActivities: Activity[];
  setActivityFilter: (types: string[]) => void;
}

/**
 * Hook for polling and managing activity timeline
 * Handles cursor-based pagination and incremental loading
 * Implements SLA: events within 30 seconds in normal polling mode
 */
export function useActivityPolling({
  bookingId,
  enabled = true,
  pollIntervalMs = 30000, // 30s polling SLA
  activityTypes = [],
}: UseActivityPollingOptions): UseActivityPollingResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<string[]>(activityTypes);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController>(null);
  const consecutiveFailuresRef = useRef(0);

  // Fetch activities
  const fetchActivities = useCallback(
    async (cursor?: string, append = false): Promise<boolean> => {
      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        abortControllerRef.current = new AbortController();

        const params = new URLSearchParams({
          limit: "20",
          ...(cursor && { cursor }),
          ...(filter.length > 0 && { type: filter[0] }), // Single type for now
        });

        const response = await fetch(
          `/api/bookings/${bookingId}/activities?${params}`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.status}`);
        }

        const data = await safeJsonResponse<ActivitiesApiResponse>(response, {
          items: [],
          hasMore: false,
          nextCursor: null,
        });
        const newActivities = data.items.map((item) => ({
          ...item,
          performedAt: new Date(item.performedAt),
        }));

        if (append) {
          setActivities((prev) => [...prev, ...newActivities]);
        } else {
          setActivities(newActivities);
        }

        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        return true;
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setIsError(true);
          setError(err);
          console.error("Activity polling error:", err);
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [bookingId, filter]
  );

  // Load more handler
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchActivities(nextCursor ?? undefined, true);
  }, [hasMore, isLoading, nextCursor, fetchActivities]);

  // Refresh handler
  const refresh = useCallback(async () => {
    await fetchActivities();
  }, [fetchActivities]);

  // Set filter with debounce
  const setActivityFilter = useCallback((types: string[]) => {
    setFilter(types);
    // Filter will trigger fetch via useEffect dependency
  }, []);

  // Initial load and polling setup
  useEffect(() => {
    if (!enabled || !bookingId) return;

    let cancelled = false;

    const runPollCycle = async () => {
      const wasSuccessful = await fetchActivities();
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
  }, [enabled, bookingId, pollIntervalMs, fetchActivities]);

  // Filter activities
  const filteredActivities = activities.filter((a) => {
    if (filter.length === 0) return true;
    return filter.includes(a.type);
  });

  return {
    activities,
    isLoading,
    isError,
    error,
    hasMore,
    nextCursor,
    loadMore,
    refresh,
    filteredActivities,
    setActivityFilter,
  };
}
