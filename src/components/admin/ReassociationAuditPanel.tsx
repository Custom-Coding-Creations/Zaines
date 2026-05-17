"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { safeJsonResponse } from "@/lib/safe-json-response";

type AuditEvent = {
  id: string;
  entityType: "photo" | "message";
  entityId: string;
  reason: string;
  timestamp: string;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
  };
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
  };
  previousBooking: {
    id: string;
    bookingNumber: string;
    status: string;
  } | null;
  nextBooking: {
    id: string;
    bookingNumber: string;
    status: string;
  } | null;
};

type EntityFilter = "all" | "photo" | "message";

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ReassociationAuditPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: "120" });
    if (entityFilter !== "all") {
      params.set("entityType", entityFilter);
    }
    if (startDate) {
      params.set("startDate", startDate);
    }
    if (endDate) {
      params.set("endDate", endDate);
    }
    return params.toString();
  }, [endDate, entityFilter, startDate]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/reassociation-audit?${queryString}`, {
        cache: "no-store",
      });
      const data = await safeJsonResponse<{ events?: AuditEvent[]; error?: string }>(response, {});

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load reassociation audit events");
      }

      setEvents(data.events ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load reassociation audit events",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [queryString]);

  const csvExportHref = useMemo(() => {
    const params = new URLSearchParams(queryString);
    params.set("format", "csv");
    return `/api/admin/reassociation-audit?${params.toString()}`;
  }, [queryString]);

  function applyDatePreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    setStartDate(formatDateInput(start));
    setEndDate(formatDateInput(end));
  }

  function clearDatePreset() {
    setStartDate("");
    setEndDate("");
  }

  const eventCountLabel = useMemo(() => {
    if (entityFilter === "all") return `${events.length} total`;
    return `${events.length} ${entityFilter} events`;
  }, [entityFilter, events.length]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Association Audit</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Track who reassociated photos and messages, and when the booking context changed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={entityFilter} onValueChange={(value) => setEntityFilter(value as EntityFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="photo">Photos</SelectItem>
              <SelectItem value="message">Messages</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-[150px]"
            aria-label="Start date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-[150px]"
            aria-label="End date"
          />
          <Button size="sm" variant="secondary" asChild>
            <a href={csvExportHref}>Export CSV</a>
          </Button>
          <Button size="sm" variant="outline" onClick={() => void loadData()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{eventCountLabel}</p>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">Quick ranges:</p>
          <Button size="sm" variant="outline" onClick={() => applyDatePreset(1)}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyDatePreset(7)}>
            Last 7 days
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyDatePreset(30)}>
            Last 30 days
          </Button>
          <Button size="sm" variant="ghost" onClick={clearDatePreset}>
            Clear
          </Button>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading audit events…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reassociation events captured yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-1 capitalize">{event.entityType}</span>
                  <span>ID: {event.entityId}</span>
                  <span>{new Date(event.timestamp).toLocaleString()}</span>
                </div>

                <p className="mt-2 text-sm">
                  <span className="font-medium">Actor:</span>{" "}
                  {event.actor.name ?? event.actor.email ?? event.actor.id}
                </p>

                <p className="mt-1 text-sm">
                  <span className="font-medium">Target customer:</span>{" "}
                  {event.targetUser.name ?? event.targetUser.email ?? event.targetUser.id}
                </p>

                <p className="mt-1 text-sm">
                  <span className="font-medium">Context change:</span>{" "}
                  {event.previousBooking ? event.previousBooking.bookingNumber : "Account-level"}
                  {" → "}
                  {event.nextBooking ? event.nextBooking.bookingNumber : "Account-level"}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">Reason: {event.reason}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
