'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type TimeSlotRow = {
  id: string;
  dayOfWeek: number;
  slotStart: string;
  slotEnd: string;
  maxCapacity: number;
  serviceType: 'dropoff' | 'pickup' | 'both';
  isActive: boolean;
};

type Draft = Omit<TimeSlotRow, 'id'>;

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const defaultDraft: Draft = {
  dayOfWeek: 1,
  slotStart: '08:00',
  slotEnd: '09:00',
  maxCapacity: 10,
  serviceType: 'both',
  isActive: true,
};

function dayLabel(dayOfWeek: number): string {
  return dayOptions.find((option) => option.value === dayOfWeek)?.label ?? `Day ${dayOfWeek}`;
}

export default function AdminTimeSlotsPage() {
  const [rows, setRows] = useState<TimeSlotRow[]>([]);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedRows = useMemo(() => {
    const groups = new Map<number, TimeSlotRow[]>();
    for (const row of rows) {
      const dayRows = groups.get(row.dayOfWeek) ?? [];
      dayRows.push(row);
      groups.set(row.dayOfWeek, dayRows);
    }

    return Array.from(groups.entries()).sort(([left], [right]) => left - right);
  }, [rows]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/time-slots');
      if (!response.ok) throw new Error('Failed to load time slots');
      const payload = (await response.json()) as { data?: TimeSlotRow[] };
      setRows(payload.data ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createSlot = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/admin/time-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });

      if (!response.ok) throw new Error('Failed to create time slot');

      setDraft(defaultDraft);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create time slot');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSlot = async (row: TimeSlotRow, nextActive: boolean) => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/time-slots/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...row, isActive: nextActive }),
      });
      if (!response.ok) throw new Error('Failed to update slot');
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update slot');
    }
  };

  const deleteSlot = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/time-slots/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete slot');
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete slot');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Time Slot Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure drop-off and pickup windows to manage lobby flow and staff capacity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Time Slot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label>Day</Label>
            <Select
              value={String(draft.dayOfWeek)}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, dayOfWeek: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start</Label>
            <Input
              type="time"
              value={draft.slotStart}
              onChange={(event) => setDraft((prev) => ({ ...prev, slotStart: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>End</Label>
            <Input
              type="time"
              value={draft.slotEnd}
              onChange={(event) => setDraft((prev) => ({ ...prev, slotEnd: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={draft.maxCapacity}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, maxCapacity: Number(event.target.value) || 1 }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={draft.serviceType}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  serviceType: value as Draft['serviceType'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dropoff">Drop-off</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={createSlot} disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Slot'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Slots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p>Loading time slots...</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? <p>No time slots configured yet.</p> : null}

          {!loading && !error
            ? groupedRows.map(([dayOfWeek, dayRows]) => (
                <section key={dayOfWeek} className="space-y-2 rounded-lg border p-3">
                  <h2 className="text-sm font-semibold">{dayLabel(dayOfWeek)}</h2>
                  {dayRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {row.slotStart} - {row.slotEnd}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.serviceType.toUpperCase()} · Capacity {row.maxCapacity}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Active</Label>
                          <Switch
                            checked={row.isActive}
                            onCheckedChange={(checked) => {
                              void toggleSlot(row, checked);
                            }}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void deleteSlot(row.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </section>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
