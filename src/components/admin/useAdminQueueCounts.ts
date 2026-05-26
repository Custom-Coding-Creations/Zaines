"use client";

import { useEffect, useMemo, useState } from "react";

type QueueItem = {
  id: string;
  count: number;
};

type QueuePayload = {
  success?: boolean;
  data?: {
    items?: QueueItem[];
  };
};

export type AdminQueueCounts = Record<string, number>;

export function useAdminQueueCounts() {
  const [counts, setCounts] = useState<AdminQueueCounts>({});

  useEffect(() => {
    let active = true;
    let currentController: AbortController | null = null;

    const load = async () => {
      try {
        currentController?.abort();
        currentController = new AbortController();

        const response = await fetch("/api/admin/operations/queue", {
          cache: "no-store",
          signal: currentController.signal,
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as QueuePayload;
        const items = payload.data?.items ?? [];

        if (!active) return;

        const nextCounts: AdminQueueCounts = {};
        for (const item of items) {
          nextCounts[item.id] = item.count;
        }
        setCounts(nextCounts);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Non-critical UX enhancement; ignore fetch errors.
      }
    };

    void load();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, 60_000);

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      currentController?.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const totalActionableCount = useMemo(
    () =>
      (counts.pending_confirmations ?? 0) +
      (counts.unresolved_messages ?? 0) +
      (counts.actionable_staffing_exceptions ?? 0),
    [counts],
  );

  return { counts, totalActionableCount };
}
