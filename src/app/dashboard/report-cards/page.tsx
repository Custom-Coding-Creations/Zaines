'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DashboardReportCard = {
  id: string;
  date: string;
  overallMood: string;
  energyLevel: number;
  appetiteLevel: string;
  socialization: string;
  playHighlights: string | null;
  staffNotes: string | null;
  pet: {
    id: string;
    name: string;
    breed: string;
  };
  booking: {
    id: string;
    bookingNumber: string;
  };
};

export default function DashboardReportCardsPage() {
  const [rows, setRows] = useState<DashboardReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/report-cards');
        if (!response.ok) throw new Error('Unable to load report cards');
        const payload = (await response.json()) as { data?: DashboardReportCard[] };
        setRows(payload.data ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load report cards');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily Report Cards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your dog’s day-by-day care summaries and highlights.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Card Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading report cards...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No report cards available yet.</p> : null}

          {!loading && !error
            ? rows.map((row) => (
                <article key={row.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {row.pet.name} · {new Date(row.date).toLocaleDateString()}
                    </p>
                    <Badge variant="outline">{row.booking.bookingNumber}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mood: {row.overallMood} · Energy: {row.energyLevel}/5 · Appetite: {row.appetiteLevel} · Social: {row.socialization}
                  </p>
                  {row.playHighlights ? (
                    <p className="text-sm">
                      <span className="font-medium">Play highlights:</span> {row.playHighlights}
                    </p>
                  ) : null}
                  {row.staffNotes ? (
                    <p className="text-sm">
                      <span className="font-medium">Staff notes:</span> {row.staffNotes}
                    </p>
                  ) : null}
                </article>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
