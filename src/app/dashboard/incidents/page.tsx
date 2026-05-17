'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeUtc } from '@/lib/datetime-format';

type DashboardIncident = {
  id: string;
  type: string;
  severity: string;
  description: string;
  actionTaken: string | null;
  ownerNotified: boolean;
  followUpRequired: boolean;
  followUpNotes: string | null;
  createdAt: string;
  pet: {
    id: string;
    name: string;
    breed: string;
  };
  booking: {
    id: string;
    bookingNumber: string;
  } | null;
};

export default function DashboardIncidentsPage() {
  const [rows, setRows] = useState<DashboardIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/incidents');
        if (!response.ok) throw new Error('Unable to load incidents');
        const payload = (await response.json()) as { data?: DashboardIncident[] };
        setRows(payload.data ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load incidents');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incident Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transparent updates about incidents, actions taken, and follow-up.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading incidents...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No incidents reported for your pets.</p> : null}

          {!loading && !error
            ? rows.map((row) => (
                <article key={row.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{row.pet.name} · {row.type}</p>
                    <Badge variant="destructive">{row.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDateTimeUtc(row.createdAt)}</p>
                  <p className="text-sm">{row.description}</p>
                  {row.actionTaken ? (
                    <p className="text-sm">
                      <span className="font-medium">Action taken:</span> {row.actionTaken}
                    </p>
                  ) : null}
                  {row.followUpRequired ? (
                    <p className="text-sm">
                      <span className="font-medium">Follow-up:</span> {row.followUpNotes ?? 'Pending update'}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Badge variant={row.ownerNotified ? 'default' : 'secondary'}>
                      {row.ownerNotified ? 'Owner notified' : 'Owner notification pending'}
                    </Badge>
                    {row.booking ? <Badge variant="outline">{row.booking.bookingNumber}</Badge> : null}
                  </div>
                </article>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
