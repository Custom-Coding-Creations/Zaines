'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

// ── Types ──────────────────────────────────────────────────────────────

type TimeSlotRow = {
  id: string;
  dayOfWeek: number;
  slotStart: string;
  slotEnd: string;
  maxCapacity: number;
  serviceType: 'dropoff' | 'pickup' | 'both';
  isActive: boolean;
};

type SlotDraft = {
  slotStart: string;
  slotEnd: string;
  maxCapacity: number;
  serviceType: 'dropoff' | 'pickup' | 'both';
  isActive: boolean;
};

type GeneratorConfig = {
  startTime: string;
  endTime: string;
  interval: 30 | 60;
  maxCapacity: number;
  serviceType: 'dropoff' | 'pickup' | 'both';
  selectedDays: number[];
};

// ── Constants ──────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const PRESET_TEMPLATES = [
  {
    name: 'Weekday Standard',
    description: 'Mon–Fri: Drop-off 7 AM–10 AM, Pickup 3 PM–6 PM (hourly)',
    generate: (): { slots: Omit<TimeSlotRow, 'id'>[]; summary: string } => {
      const slots: Omit<TimeSlotRow, 'id'>[] = [];
      for (const day of WEEKDAYS) {
        for (let h = 7; h < 10; h++) {
          slots.push({
            dayOfWeek: day,
            slotStart: `${String(h).padStart(2, '0')}:00`,
            slotEnd: `${String(h + 1).padStart(2, '0')}:00`,
            maxCapacity: 10,
            serviceType: 'dropoff',
            isActive: true,
          });
        }
        for (let h = 15; h < 18; h++) {
          slots.push({
            dayOfWeek: day,
            slotStart: `${String(h).padStart(2, '0')}:00`,
            slotEnd: `${String(h + 1).padStart(2, '0')}:00`,
            maxCapacity: 10,
            serviceType: 'pickup',
            isActive: true,
          });
        }
      }
      return { slots, summary: '30 slots: Mon–Fri, 3 drop-off + 3 pickup per day' };
    },
  },
  {
    name: 'Weekend Lite',
    description: 'Sat–Sun: Drop-off 9 AM–11 AM, Pickup 4 PM–6 PM (hourly)',
    generate: (): { slots: Omit<TimeSlotRow, 'id'>[]; summary: string } => {
      const slots: Omit<TimeSlotRow, 'id'>[] = [];
      for (const day of WEEKENDS) {
        for (let h = 9; h < 11; h++) {
          slots.push({
            dayOfWeek: day,
            slotStart: `${String(h).padStart(2, '0')}:00`,
            slotEnd: `${String(h + 1).padStart(2, '0')}:00`,
            maxCapacity: 8,
            serviceType: 'dropoff',
            isActive: true,
          });
        }
        for (let h = 16; h < 18; h++) {
          slots.push({
            dayOfWeek: day,
            slotStart: `${String(h).padStart(2, '0')}:00`,
            slotEnd: `${String(h + 1).padStart(2, '0')}:00`,
            maxCapacity: 8,
            serviceType: 'pickup',
            isActive: true,
          });
        }
      }
      return { slots, summary: '8 slots: Sat–Sun, 2 drop-off + 2 pickup per day' };
    },
  },
  {
    name: 'Full Week',
    description: 'All 7 days: Drop-off 7 AM–10 AM, Pickup 3 PM–6 PM (hourly)',
    generate: (): { slots: Omit<TimeSlotRow, 'id'>[]; summary: string } => {
      const slots: Omit<TimeSlotRow, 'id'>[] = [];
      for (const day of ALL_DAYS) {
        for (let h = 7; h < 10; h++) {
          slots.push({
            dayOfWeek: day,
            slotStart: `${String(h).padStart(2, '0')}:00`,
            slotEnd: `${String(h + 1).padStart(2, '0')}:00`,
            maxCapacity: 10,
            serviceType: 'dropoff',
            isActive: true,
          });
        }
        for (let h = 15; h < 18; h++) {
          slots.push({
            dayOfWeek: day,
            slotStart: `${String(h).padStart(2, '0')}:00`,
            slotEnd: `${String(h + 1).padStart(2, '0')}:00`,
            maxCapacity: 10,
            serviceType: 'pickup',
            isActive: true,
          });
        }
      }
      return { slots, summary: '42 slots: Sun–Sat, 3 drop-off + 3 pickup per day' };
    },
  },
];

function dayLabel(dayOfWeek: number): string {
  return DAY_OPTIONS.find((opt) => opt.value === dayOfWeek)?.label ?? `Day ${dayOfWeek}`;
}

function generateSlotsFromConfig(config: GeneratorConfig): Omit<TimeSlotRow, 'id'>[] {
  const slots: Omit<TimeSlotRow, 'id'>[] = [];
  const [startH, startM] = config.startTime.split(':').map(Number);
  const [endH, endM] = config.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) return slots;

  for (const day of config.selectedDays) {
    let current = startMinutes;
    while (current + config.interval <= endMinutes) {
      const sH = Math.floor(current / 60);
      const sM = current % 60;
      const eH = Math.floor((current + config.interval) / 60);
      const eM = (current + config.interval) % 60;
      slots.push({
        dayOfWeek: day,
        slotStart: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
        slotEnd: `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`,
        maxCapacity: config.maxCapacity,
        serviceType: config.serviceType,
        isActive: true,
      });
      current += config.interval;
    }
  }
  return slots;
}

// ── Component ──────────────────────────────────────────────────────────

export default function AdminTimeSlotsPage() {
  const [rows, setRows] = useState<TimeSlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-slot form state
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [draft, setDraft] = useState<SlotDraft>({
    slotStart: '08:00',
    slotEnd: '09:00',
    maxCapacity: 10,
    serviceType: 'both',
    isActive: true,
  });

  // Dialog state
  const [copyDialog, setCopyDialog] = useState<{ open: boolean; sourceDayOfWeek: number }>({
    open: false,
    sourceDayOfWeek: 0,
  });
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);
  const [clearDialog, setClearDialog] = useState<{ open: boolean; dayOfWeek: number }>({
    open: false,
    dayOfWeek: 0,
  });
  const [quickFillDialog, setQuickFillDialog] = useState<{
    open: boolean;
    slots: Omit<TimeSlotRow, 'id'>[];
    summary: string;
  }>({ open: false, slots: [], summary: '' });

  // Custom generator state
  const [showGenerator, setShowGenerator] = useState(false);
  const [genConfig, setGenConfig] = useState<GeneratorConfig>({
    startTime: '07:00',
    endTime: '10:00',
    interval: 60,
    maxCapacity: 10,
    serviceType: 'dropoff',
    selectedDays: [...WEEKDAYS],
  });

  const groupedRows = useMemo(() => {
    const groups = new Map<number, TimeSlotRow[]>();
    for (const row of rows) {
      const dayRows = groups.get(row.dayOfWeek) ?? [];
      dayRows.push(row);
      groups.set(row.dayOfWeek, dayRows);
    }
    return Array.from(groups.entries()).sort(([left], [right]) => left - right);
  }, [rows]);

  // ── Data fetching ──

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Actions ──

  const createSlots = async () => {
    if (selectedDays.length === 0) {
      setError('Select at least one day');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);

      const slots = selectedDays.map((day) => ({ ...draft, dayOfWeek: day }));

      if (slots.length === 1) {
        const response = await fetch('/api/admin/time-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slots[0]),
        });
        if (!response.ok) throw new Error('Failed to create time slot');
        toast.success('Time slot created');
      } else {
        const response = await fetch('/api/admin/time-slots/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slots, skipDuplicates: true }),
        });
        if (!response.ok) throw new Error('Failed to create time slots');
        const result = (await response.json()) as { created: number; skipped: number };
        toast.success(
          `Created ${result.created} slot${result.created !== 1 ? 's' : ''}` +
            (result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''),
        );
      }

      setDraft({ slotStart: '08:00', slotEnd: '09:00', maxCapacity: 10, serviceType: 'both', isActive: true });
      setSelectedDays([1]);
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
      const response = await fetch(`/api/admin/time-slots/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete slot');
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete slot');
    }
  };

  const copyDay = async () => {
    if (copyTargetDays.length === 0) return;
    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/time-slots/copy-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDayOfWeek: copyDialog.sourceDayOfWeek,
          targetDays: copyTargetDays,
        }),
      });
      if (!response.ok) throw new Error('Failed to copy slots');
      const result = (await response.json()) as { created: number };
      toast.success(
        result.created > 0
          ? `Copied ${result.created} slot${result.created !== 1 ? 's' : ''}`
          : 'All slots already exist on selected days',
      );
      setCopyDialog({ open: false, sourceDayOfWeek: 0 });
      setCopyTargetDays([]);
      await load();
    } catch (copyError) {
      toast.error(copyError instanceof Error ? copyError.message : 'Failed to copy slots');
    } finally {
      setSubmitting(false);
    }
  };

  const clearDay = async () => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/time-slots/clear-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek: clearDialog.dayOfWeek }),
      });
      if (!response.ok) throw new Error('Failed to clear slots');
      const result = (await response.json()) as { deleted: number };
      toast.success(`Cleared ${result.deleted} slot${result.deleted !== 1 ? 's' : ''} from ${dayLabel(clearDialog.dayOfWeek)}`);
      setClearDialog({ open: false, dayOfWeek: 0 });
      await load();
    } catch (clearError) {
      toast.error(clearError instanceof Error ? clearError.message : 'Failed to clear slots');
    } finally {
      setSubmitting(false);
    }
  };

  const applyQuickFill = async () => {
    if (quickFillDialog.slots.length === 0) return;
    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/time-slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: quickFillDialog.slots, skipDuplicates: true }),
      });
      if (!response.ok) throw new Error('Failed to apply template');
      const result = (await response.json()) as { created: number; skipped: number };
      toast.success(
        `Created ${result.created} slot${result.created !== 1 ? 's' : ''}` +
          (result.skipped > 0 ? ` (${result.skipped} duplicates skipped)` : ''),
      );
      setQuickFillDialog({ open: false, slots: [], summary: '' });
      await load();
    } catch (fillError) {
      toast.error(fillError instanceof Error ? fillError.message : 'Failed to apply template');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Day checkbox toggle helpers ──

  const toggleDay = (day: number, checked: boolean) => {
    setSelectedDays((prev) => (checked ? [...prev, day].sort() : prev.filter((d) => d !== day)));
  };

  const toggleCopyTarget = (day: number, checked: boolean) => {
    setCopyTargetDays((prev) =>
      checked ? [...prev, day].sort() : prev.filter((d) => d !== day),
    );
  };

  const toggleGenDay = (day: number, checked: boolean) => {
    setGenConfig((prev) => ({
      ...prev,
      selectedDays: checked
        ? [...prev.selectedDays, day].sort()
        : prev.selectedDays.filter((d) => d !== day),
    }));
  };

  const selectDayGroup = (days: number[]) => {
    setSelectedDays([...days]);
  };

  const selectGenDayGroup = (days: number[]) => {
    setGenConfig((prev) => ({ ...prev, selectedDays: [...days] }));
  };

  // ── Render ──

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Time Slot Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure drop-off and pickup windows to manage lobby flow and staff capacity.
        </p>
      </div>

      {/* ── Quick Fill Templates ── */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Fill</CardTitle>
          <CardDescription>
            Apply a preset template to generate multiple time slots at once.
            Duplicates are automatically skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRESET_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                className="rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => {
                  const { slots, summary } = template.generate();
                  setQuickFillDialog({ open: true, slots, summary: `${template.name}: ${summary}` });
                }}
              >
                <p className="font-medium">{template.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
              </button>
            ))}
          </div>

          {/* Custom Generator toggle */}
          <div className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setShowGenerator(!showGenerator)}>
              {showGenerator ? 'Hide' : 'Show'} Custom Generator
            </Button>
          </div>

          {showGenerator && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={genConfig.startTime}
                    onChange={(e) => setGenConfig((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={genConfig.endTime}
                    onChange={(e) => setGenConfig((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select
                    value={String(genConfig.interval)}
                    onValueChange={(v) => setGenConfig((prev) => ({ ...prev, interval: Number(v) as 30 | 60 }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={genConfig.maxCapacity}
                    onChange={(e) => setGenConfig((prev) => ({ ...prev, maxCapacity: Number(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={genConfig.serviceType}
                    onValueChange={(v) => setGenConfig((prev) => ({ ...prev, serviceType: v as 'dropoff' | 'pickup' | 'both' }))}
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
              </div>

              <DayCheckboxGroup
                selectedDays={genConfig.selectedDays}
                onToggle={toggleGenDay}
                onSelectGroup={selectGenDayGroup}
              />

              <Button
                disabled={genConfig.selectedDays.length === 0}
                onClick={() => {
                  const slots = generateSlotsFromConfig(genConfig);
                  if (slots.length === 0) {
                    toast.error('No slots generated — check that end time is after start time');
                    return;
                  }
                  setQuickFillDialog({
                    open: true,
                    slots,
                    summary: `Custom: ${slots.length} slots across ${genConfig.selectedDays.length} day${genConfig.selectedDays.length !== 1 ? 's' : ''}`,
                  });
                }}
              >
                Preview & Apply
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Time Slot (multi-day) ── */}
      <Card>
        <CardHeader>
          <CardTitle>Add Time Slot</CardTitle>
          <CardDescription>Select one or more days and define the slot details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DayCheckboxGroup
            selectedDays={selectedDays}
            onToggle={toggleDay}
            onSelectGroup={selectDayGroup}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="time"
                value={draft.slotStart}
                onChange={(e) => setDraft((prev) => ({ ...prev, slotStart: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="time"
                value={draft.slotEnd}
                onChange={(e) => setDraft((prev) => ({ ...prev, slotEnd: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={draft.maxCapacity}
                onChange={(e) => setDraft((prev) => ({ ...prev, maxCapacity: Number(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={draft.serviceType}
                onValueChange={(v) => setDraft((prev) => ({ ...prev, serviceType: v as SlotDraft['serviceType'] }))}
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
              <Button
                className="w-full"
                onClick={createSlots}
                disabled={submitting || selectedDays.length === 0}
              >
                {submitting
                  ? 'Saving...'
                  : selectedDays.length <= 1
                    ? 'Add Slot'
                    : `Add to ${selectedDays.length} Days`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Configured Slots ── */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Slots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p>Loading time slots...</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No time slots configured yet. Use Quick Fill above to get started, or add slots manually.
            </p>
          ) : null}

          {!loading && !error
            ? groupedRows.map(([dayOfWeek, dayRows]) => (
                <section key={dayOfWeek} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-sm font-semibold">
                      {dayLabel(dayOfWeek)}{' '}
                      <span className="font-normal text-muted-foreground">
                        ({dayRows.length} slot{dayRows.length !== 1 ? 's' : ''})
                      </span>
                    </h2>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCopyDialog({ open: true, sourceDayOfWeek: dayOfWeek });
                          setCopyTargetDays([]);
                        }}
                      >
                        Copy to…
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClearDialog({ open: true, dayOfWeek })}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  {dayRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {row.slotStart} – {row.slotEnd}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.serviceType === 'both'
                            ? 'DROP-OFF & PICKUP'
                            : row.serviceType.toUpperCase()}{' '}
                          · Capacity {row.maxCapacity}
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

      {/* ── Copy Day Dialog ── */}
      <Dialog
        open={copyDialog.open}
        onOpenChange={(open) => {
          if (!open) setCopyDialog({ open: false, sourceDayOfWeek: 0 });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Copy {dayLabel(copyDialog.sourceDayOfWeek)} Slots
            </DialogTitle>
            <DialogDescription>
              Duplicate all slots from {dayLabel(copyDialog.sourceDayOfWeek)} to the selected days.
              Existing identical slots are automatically skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {DAY_OPTIONS.filter((d) => d.value !== copyDialog.sourceDayOfWeek).map((d) => (
              <label key={d.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={copyTargetDays.includes(d.value)}
                  onCheckedChange={(checked) => toggleCopyTarget(d.value, !!checked)}
                />
                {d.label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCopyDialog({ open: false, sourceDayOfWeek: 0 })}
            >
              Cancel
            </Button>
            <Button onClick={copyDay} disabled={submitting || copyTargetDays.length === 0}>
              {submitting ? 'Copying...' : `Copy to ${copyTargetDays.length} Day${copyTargetDays.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clear Day Dialog ── */}
      <Dialog
        open={clearDialog.open}
        onOpenChange={(open) => {
          if (!open) setClearDialog({ open: false, dayOfWeek: 0 });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear {dayLabel(clearDialog.dayOfWeek)} Slots</DialogTitle>
            <DialogDescription>
              This will permanently delete all time slots for{' '}
              {dayLabel(clearDialog.dayOfWeek)}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearDialog({ open: false, dayOfWeek: 0 })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={clearDay} disabled={submitting}>
              {submitting ? 'Clearing...' : 'Clear All Slots'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick Fill Confirmation Dialog ── */}
      <Dialog
        open={quickFillDialog.open}
        onOpenChange={(open) => {
          if (!open) setQuickFillDialog({ open: false, slots: [], summary: '' });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template</DialogTitle>
            <DialogDescription>
              {quickFillDialog.summary}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto rounded-md border p-3 text-sm">
            {Array.from(
              quickFillDialog.slots.reduce((acc, s) => {
                const key = s.dayOfWeek;
                if (!acc.has(key)) acc.set(key, []);
                acc.get(key)!.push(s);
                return acc;
              }, new Map<number, typeof quickFillDialog.slots>()),
            )
              .sort(([a], [b]) => a - b)
              .map(([day, daySlots]) => (
                <div key={day} className="mb-2">
                  <p className="font-medium">{dayLabel(day)}</p>
                  <ul className="ml-4 text-muted-foreground">
                    {daySlots.map((s, i) => (
                      <li key={i}>
                        {s.slotStart}–{s.slotEnd} · {s.serviceType} · cap {s.maxCapacity}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Duplicates of existing slots will be automatically skipped.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickFillDialog({ open: false, slots: [], summary: '' })}
            >
              Cancel
            </Button>
            <Button onClick={applyQuickFill} disabled={submitting}>
              {submitting ? 'Applying...' : `Create ${quickFillDialog.slots.length} Slots`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Day Checkbox Group ─────────────────────────────────────────────────

function DayCheckboxGroup({
  selectedDays,
  onToggle,
  onSelectGroup,
}: {
  selectedDays: number[];
  onToggle: (day: number, checked: boolean) => void;
  onSelectGroup: (days: number[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        {DAY_OPTIONS.map((d) => (
          <label key={d.value} className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={selectedDays.includes(d.value)}
              onCheckedChange={(checked) => onToggle(d.value, !!checked)}
            />
            {d.label.slice(0, 3)}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSelectGroup([...WEEKDAYS])}
        >
          Weekdays
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSelectGroup([...WEEKENDS])}
        >
          Weekends
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSelectGroup([...ALL_DAYS])}
        >
          All Days
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSelectGroup([])}
        >
          None
        </Button>
      </div>
    </div>
  );
}
