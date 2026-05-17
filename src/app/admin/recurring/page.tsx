'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type RecurringItem = {
  id: string;
  userId: string;
  suiteId: string | null;
  serviceType: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  specialRequests: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  suite: {
    id: string;
    name: string;
  } | null;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminRecurringPage() {
  const [rows, setRows] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [daysAhead, setDaysAhead] = useState(21);
  const [generationResult, setGenerationResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRecurring() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/recurring-bookings');
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
  }

  useEffect(() => {
    void loadRecurring();
  }, []);

  async function runGeneration() {
    try {
      setIsGenerating(true);
      setError(null);
      setGenerationResult(null);

      const response = await fetch('/api/admin/recurring-bookings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAhead }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to generate recurring bookings');
      }

      const payload = (await response.json()) as {
        data?: {
          generated: number;
          skipped: number;
          schedulesProcessed: number;
          daysAhead: number;
        };
      };

      if (payload.data) {
        setGenerationResult(
          `Generated ${payload.data.generated} bookings (${payload.data.skipped} skipped) across ${payload.data.schedulesProcessed} schedules for the next ${payload.data.daysAhead} days.`,
        );
      }

      await loadRecurring();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Failed to generate recurring bookings',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSaving(true);

    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6].filter(
      (day) => formData.get(`day-${day}`) === 'on',
    );

    const payload = {
      userId: String(formData.get('userId') ?? ''),
      suiteId: String(formData.get('suiteId') ?? '') || undefined,
      serviceType: String(formData.get('serviceType') ?? 'daycare'),
      daysOfWeek,
      startDate: new Date(String(formData.get('startDate') ?? '')).toISOString(),
      endDate: formData.get('endDate')
        ? new Date(String(formData.get('endDate'))).toISOString()
        : undefined,
      isActive: true,
      specialRequests: String(formData.get('specialRequests') ?? ''),
    };

    try {
      const response = await fetch('/api/admin/recurring-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to create recurring schedule');
      }

      await loadRecurring();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create recurring schedule',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recurring Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create weekly daycare or boarding schedules that auto-generate bookings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Recurring Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userId">Customer User ID</Label>
              <Input id="userId" name="userId" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suiteId">Preferred Suite ID (optional)</Label>
              <Input id="suiteId" name="suiteId" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <select id="serviceType" name="serviceType" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="daycare">
                <option value="daycare">Daycare</option>
                <option value="boarding">Boarding</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-3 rounded-md border p-3">
                {DAY_LABELS.map((label, day) => (
                  <label key={label} className="inline-flex items-center gap-1 text-sm">
                    <input type="checkbox" name={`day-${day}`} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea id="specialRequests" name="specialRequests" rows={3} />
            </div>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Create Schedule'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate upcoming bookings from active recurring schedules.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32 space-y-2">
              <Label htmlFor="daysAhead">Days Ahead</Label>
              <Input
                id="daysAhead"
                type="number"
                min={1}
                max={60}
                value={daysAhead}
                onChange={(event) => setDaysAhead(Number(event.target.value) || 1)}
              />
            </div>
            <Button onClick={() => void runGeneration()} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Upcoming Bookings'}
            </Button>
          </div>

          {generationResult ? (
            <p className="text-sm text-emerald-700">{generationResult}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Recurring Schedules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading recurring schedules...</p> : null}
          {!loading && rows.length === 0 ? <p>No recurring schedules yet.</p> : null}

          {rows.map((row) => (
            <article key={row.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{row.user.name ?? row.user.email ?? row.userId}</p>
                <Badge variant={row.isActive ? 'default' : 'secondary'}>
                  {row.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {row.serviceType} · {row.daysOfWeek.map((day) => DAY_LABELS[day]).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(row.startDate).toLocaleDateString()}
                {row.endDate ? ` to ${new Date(row.endDate).toLocaleDateString()}` : ' onward'}
              </p>
              {row.suite ? <p className="text-xs text-muted-foreground">Suite: {row.suite.name}</p> : null}
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
