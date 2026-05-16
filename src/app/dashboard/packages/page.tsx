'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type CustomerPackageItem = {
  id: string;
  purchaseDate: string;
  expiresAt: string;
  sessionsUsed: number;
  sessionsRemaining: number;
  status: string;
  package: {
    id: string;
    name: string;
    type: string;
    totalSessions: number;
  };
};

export default function DashboardPackagesPage() {
  const [rows, setRows] = useState<CustomerPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/packages');
        if (!response.ok) throw new Error('Failed to load packages');
        const payload = (await response.json()) as { data?: CustomerPackageItem[] };
        setRows(payload.data ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Packages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track session balances, expiration dates, and package status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active & Historical Packages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading packages...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No packages found for your account yet.</p> : null}

          {!loading && !error
            ? rows.map((row) => (
                <article key={row.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{row.package.name}</p>
                    <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>{row.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.package.type} · {row.package.totalSessions} sessions total
                  </p>
                  <p className="text-sm">Used: {row.sessionsUsed} · Remaining: {row.sessionsRemaining}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(row.expiresAt).toLocaleDateString()}
                  </p>
                </article>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
