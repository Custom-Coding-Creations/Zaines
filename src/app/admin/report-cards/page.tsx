'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ReportCardItem = {
  id: string;
  date: string;
  overallMood: string;
  energyLevel: number;
  appetiteLevel: string;
  socialization: string;
  sentToOwner: boolean;
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

export default function AdminReportCardsPage() {
  const [rows, setRows] = useState<ReportCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/report-cards');
        if (!response.ok) throw new Error('Failed to load report cards');
        const payload = (await response.json()) as { data?: ReportCardItem[] };
        setRows(payload.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report cards');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Report Cards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily summaries for each dog visit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Report Cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading report cards...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No report cards yet.</p> : null}

          {!loading && !error
            ? rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{row.pet.name} · {row.booking.bookingNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Mood: {row.overallMood} · Energy: {row.energyLevel}/5 · Appetite: {row.appetiteLevel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{row.socialization}</Badge>
                    <Badge variant={row.sentToOwner ? 'default' : 'secondary'}>
                      {row.sentToOwner ? 'Sent' : 'Draft'}
                    </Badge>
                  </div>
                </div>
              ))
            : null}

          <Button variant="outline" disabled>
            Report Card Composer Coming Next
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
