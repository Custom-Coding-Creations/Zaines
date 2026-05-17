'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeUtc } from '@/lib/datetime-format';

type ReminderRow = {
  id: string;
  type: string;
  channel: string;
  scheduledFor: string;
  sent: boolean;
  sentAt: string | null;
  recipientUser: { name: string | null; email: string | null };
  booking: { bookingNumber: string } | null;
  pet: { name: string } | null;
};

export default function AdminRemindersPage() {
  const [rows, setRows] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/reminders');
      if (!response.ok) throw new Error('Failed to load reminders');
      const payload = (await response.json()) as { data?: ReminderRow[] };
      setRows(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (action: 'generate' | 'dispatch' | 'run') => {
    try {
      setRunning(true);
      setMessage(null);
      setError(null);
      const response = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error('Failed to run reminder workflow');
      const payload = (await response.json()) as {
        data?: { generated: number; dispatched: number; queued: number; action: string };
      };
      if (payload.data) {
        setMessage(
          `${payload.data.action}: generated ${payload.data.generated}, dispatched ${payload.data.dispatched}, queued ${payload.data.queued}.`,
        );
      }
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Failed to run reminder workflow');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Automated Reminders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and dispatch booking, pickup, rebook, vaccine, and assessment reminders.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button disabled={running} onClick={() => void run('generate')}>
            Generate Reminders
          </Button>
          <Button disabled={running} variant="outline" onClick={() => void run('dispatch')}>
            Dispatch Due
          </Button>
          <Button disabled={running} variant="secondary" onClick={() => void run('run')}>
            Run Full Cycle
          </Button>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading reminders...</p> : null}
          {!loading && rows.length === 0 ? <p>No reminders queued.</p> : null}
          {rows.map((row) => (
            <article key={row.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{row.type} · {row.channel}</p>
                <span className={`text-xs font-medium ${row.sent ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {row.sent ? 'Sent' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Recipient: {row.recipientUser.name ?? row.recipientUser.email ?? 'Unknown'}
              </p>
              {row.booking ? <p className="text-xs text-muted-foreground">Booking: {row.booking.bookingNumber}</p> : null}
              {row.pet ? <p className="text-xs text-muted-foreground">Pet: {row.pet.name}</p> : null}
              <p className="text-xs text-muted-foreground">
                Scheduled {formatDateTimeUtc(row.scheduledFor)}
                {row.sentAt ? ` · Sent ${formatDateTimeUtc(row.sentAt)}` : ''}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}