'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type IncidentItem = {
  id: string;
  type: string;
  severity: string;
  description: string;
  ownerNotified: boolean;
  followUpRequired: boolean;
  createdAt: string;
  pet: {
    id: string;
    name: string;
    breed: string;
  };
};

export default function AdminIncidentsPage() {
  const [rows, setRows] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/incidents');
        if (!response.ok) throw new Error('Failed to load incidents');
        const payload = (await response.json()) as { data?: IncidentItem[] };
        setRows(payload.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load incidents');
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
          Track behavioral and medical incidents with follow-up status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading incidents...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No incidents logged.</p> : null}

          {!loading && !error
            ? rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{row.pet.name} · {row.type}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{row.severity}</Badge>
                    <Badge variant={row.ownerNotified ? 'default' : 'secondary'}>
                      {row.ownerNotified ? 'Owner Notified' : 'Owner Pending'}
                    </Badge>
                    {row.followUpRequired ? <Badge variant="outline">Follow-up</Badge> : null}
                  </div>
                </div>
              ))
            : null}

          <Button variant="outline" disabled>
            Incident Intake Form Coming Next
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
