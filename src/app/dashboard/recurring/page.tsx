'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RecurringItem = {
  id: string;
  serviceType: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  specialRequests: string | null;
  suite: {
    id: string;
    name: string;
  } | null;
  generatedBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    checkInDate: string;
  }>;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DashboardRecurringPage() {
  const [rows, setRows] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/recurring-bookings');
        if (!response.ok) throw new Error('Failed to load recurring bookings');
        const payload = (await response.json()) as { data?: RecurringItem[] };
        setRows(payload.data ?? []);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Failed to load recurring bookings',
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recurring Schedules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your repeat daycare and boarding schedules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Recurring Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading recurring schedules...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No recurring schedules found.</p> : null}

          {!loading && !error
            ? rows.map((row) => (
                <article key={row.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{row.serviceType}</p>
                    <Badge variant={row.isActive ? 'default' : 'secondary'}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.daysOfWeek.map((day) => DAY_LABELS[day]).join(', ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.startDate).toLocaleDateString()}
                    {row.endDate ? ` to ${new Date(row.endDate).toLocaleDateString()}` : ' onward'}
                  </p>
                  {row.suite ? <p className="text-xs text-muted-foreground">Suite: {row.suite.name}</p> : null}
                  {row.generatedBookings.length > 0 ? (
                    <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                      Upcoming generated bookings: {row.generatedBookings.map((booking) => booking.bookingNumber).join(', ')}
                    </div>
                  ) : null}
                </article>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
