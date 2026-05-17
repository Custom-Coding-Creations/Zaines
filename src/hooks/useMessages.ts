import { useEffect, useState, useRef, useCallback } from "react";
import { computeAdaptivePollDelay } from "@/hooks/pollingScheduler";
import { safeJsonResponse } from "@/lib/safe-json-response";

interface Message {
  id: string;
  content: string;
  senderType: "customer" | "staff";
  senderName: string;
  sentAt: Date | string;
  isRead: boolean;
}

interface MessagesApiResponse {
  items: Array<Omit<Message, "sentAt"> & { sentAt: string }>;
  hasMore: boolean;
  nextCursor: string | null;
}

interface UseMessagesOptions {
  bookingId: string;
  enabled?: boolean;
  pollIntervalMs?: number;
}

interface UseMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  nextCursor: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  sendMessage: (content: string) => Promise<Message | null>;
  isSending: boolean;
  unreadCount: number;
}

/**
 * Hook for managing messages between customer and staff
 * Handles polling for new messages, pagination, and sending
 */
export function useMessages({
  bookingId,
  enabled = true,
  pollIntervalMs = 30000,
}: UseMessagesOptions): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController>(null);
  const consecutiveFailuresRef = useRef(0);

  // Calculate unread count
  const unreadCount = messages.filter((m) => !m.isRead).length;

  // Fetch messages
  const fetchMessages = useCallback(
    async (cursor?: string, append = false): Promise<boolean> => {
      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        abortControllerRef.current = new AbortController();

        const params = new URLSearchParams({
          limit: "50",
          sort: "asc", // Chronological order
          ...(cursor && { cursor }),
        });

        const response = await fetch(
          `/api/bookings/${bookingId}/messages?${params}`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }

        const data = await safeJsonResponse<MessagesApiResponse>(response, {
          items: [],
          hasMore: false,
          nextCursor: null,
        });
        const newMessages = data.items.map((item) => ({
          ...item,
          sentAt: new Date(item.sentAt),
        }));

        if (append) {
          setMessages((prev) => [...prev, ...newMessages]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        return true;
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setIsError(true);
          setError(err);
          console.error("Messages polling error:", err);
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [bookingId]
  );

  // Load more handler
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchMessages(nextCursor ?? undefined, true);
  }, [hasMore, isLoading, nextCursor, fetchMessages]);

  // Refresh handler
  const refresh = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  // Send message handler
  const sendMessage = useCallback(
    async (content: string): Promise<Message | null> => {
      if (!content.trim()) {
        console.warn("Cannot send empty message");
        return null;
      }

      try {
        setIsSending(true);
        setIsError(false);
        setError(null);

        const response = await fetch(`/api/bookings/${bookingId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.status}`);
        }

        const newMessage = await safeJsonResponse<
          Omit<Message, "sentAt"> & { sentAt: string }
        >(response, {
          id: "",
          content,
          senderType: "staff",
          senderName: "Staff",
          sentAt: new Date().toISOString(),
          isRead: true,
        });
        const message: Message = {
          ...newMessage,
          sentAt: new Date(newMessage.sentAt),
        };

        // Add to local state optimistically
        setMessages((prev) => [...prev, message]);

        return message;
      } catch (err) {
        const sendError = err instanceof Error ? err : new Error("Unknown error");
        setIsError(true);
        setError(sendError);
        console.error("Error sending message:", err);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [bookingId]
  );

  // Initial load and polling setup
  useEffect(() => {
    if (!enabled || !bookingId) return;

    let cancelled = false;

    const runPollCycle = async () => {
      const wasSuccessful = await fetchMessages();
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
  }, [enabled, bookingId, pollIntervalMs, fetchMessages]);

  return {
    messages,
    isLoading,
    isError,
    error,
    hasMore,
    nextCursor,
    loadMore,
    refresh,
    sendMessage,
    isSending,
    unreadCount,
  };
}
