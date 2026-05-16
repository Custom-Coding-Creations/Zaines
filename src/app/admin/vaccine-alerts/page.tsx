'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type VaccineAlert = {
  id: string;
  vaccineName: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'expired' | 'urgent' | 'upcoming';
  pet: {
    id: string;
    name: string;
    breed: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  };
};

function statusVariant(status: VaccineAlert['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'expired') return 'destructive';
  if (status === 'urgent') return 'secondary';
  if (status === 'upcoming') return 'outline';
  return 'outline';
}

export default function AdminVaccineAlertsPage() {
  const [rows, setRows] = useState<VaccineAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/vaccine-alerts');
        if (!response.ok) throw new Error('Failed to load vaccine alerts');
        const payload = (await response.json()) as { data?: VaccineAlert[] };
        setRows(payload.data ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load vaccine alerts');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vaccine Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor expiring and expired vaccines in the next 30 days.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vaccine Alert Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading alerts...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No vaccine alerts at this time.</p> : null}

          {!loading && !error
            ? rows.map((row) => (
                <article key={row.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{row.pet.name} · {row.vaccineName}</p>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Owner: {row.pet.user.name ?? row.pet.user.email ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(row.expiryDate).toLocaleDateString()} · {row.daysRemaining} days remaining
                  </p>
                </article>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
