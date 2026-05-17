'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getScoreBadgeVariant,
  scorePlayGroupCompatibility,
} from '@/lib/play-groups/compatibility';

type StaffOption = {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  };
};

type EligiblePet = {
  pet: {
    id: string;
    name: string;
    breed: string;
    weight: number;
    assessments?: Array<{ id: string }>;
  };
  latestAssessment: {
    id: string;
    assessmentDate: string;
    overallResult: 'approved' | 'conditional';
    sizeCompatibility: 'small_only' | 'medium_and_small' | 'any';
    energyLevel: 'low' | 'moderate' | 'high';
    playStyle: string;
    reactivityLevel: number;
    validUntil: string | null;
  } | null;
  booking: {
    id: string;
    bookingNumber: string;
  };
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

function getSortedPetOptions(entries: EligiblePet[], group: PlayGroup) {
  return entries
    .map((entry) => ({
      ...entry,
      compatibility: scorePlayGroupCompatibility(
        {
          weight: entry.pet.weight,
          assessment: entry.latestAssessment
            ? {
                overallResult: entry.latestAssessment.overallResult,
                sizeCompatibility: entry.latestAssessment.sizeCompatibility,
                energyLevel: entry.latestAssessment.energyLevel,
                reactivityLevel: entry.latestAssessment.reactivityLevel,
                validUntil: entry.latestAssessment.validUntil,
              }
            : null,
        },
        {
          sizeCategory: group.sizeCategory,
          energyLevel: group.energyLevel,
        },
      ),
    }))
    .sort((left, right) => right.compatibility.score - left.compatibility.score);
}

type PlayGroupAssignment = {
  id: string;
  pet: {
    id: string;
    name: string;
    breed: string;
    weight: number;
  };
  booking: {
    id: string;
    bookingNumber: string;
  } | null;
};

type PlayGroup = {
  id: string;
  name: string;
  date: string;
  timeSlot: string;
  location: 'yard_a' | 'yard_b' | 'indoor';
  maxCapacity: number;
  sizeCategory: 'small' | 'medium' | 'large' | 'mixed';
  energyLevel: 'calm' | 'moderate' | 'high';
  notes: string | null;
  staffMember: {
    id: string;
    user: {
      name: string | null;
      email: string | null;
    };
  } | null;
  assignments: PlayGroupAssignment[];
};

type StaffRecommendation = {
  staffMember: {
    id: string;
    role: string;
    certifications: string[];
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  };
  score: number;
  reasons: string[];
};

type PlayGroupAuditEvent = {
  id: string;
  actorName: string;
  sentAt: string;
  payload: {
    eventType: 'STAFF_ASSIGNED' | 'STAFF_UNASSIGNED' | 'STAFF_AUTO_ASSIGNED';
    playGroupId: string;
    staffMemberId: string | null;
    metadata: Record<string, unknown>;
    timestamp: string;
  };
};

type BulkStaffingRun = {
  mode: 'auto_assign' | 'repair_conflicts' | 'preview_repair_conflicts';
  targetDate: string;
  attempted: number;
  assigned: number;
  auditEventsRecorded: number;
  skippedReasonCounts: Record<string, number>;
  skipped: Array<{ groupId: string; reason: string }>;
};

type StaffingExceptionItem = {
  groupId: string;
  groupName: string;
  date: string;
  timeSlot: string;
  staffMemberId: string | null;
  staffName: string | null;
  issues: Array<'unassigned' | 'invalid_time_slot' | 'staff_without_shift_coverage' | 'staff_overlap_conflict'>;
  canAutoFix: boolean;
  recommendedAction: string;
};

type StaffingExceptionSummary = {
  total: number;
  unassigned: number;
  invalidTimeSlot: number;
  withoutShiftCoverage: number;
  overlapConflicts: number;
};

const staffingIssueLabels: Record<StaffingExceptionItem['issues'][number], string> = {
  unassigned: 'Unassigned lead',
  invalid_time_slot: 'Invalid time slot',
  staff_without_shift_coverage: 'No shift coverage',
  staff_overlap_conflict: 'Overlapping assignment',
};

export default function AdminPlayGroupsPage() {
  const [groups, setGroups] = useState<PlayGroup[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [eligiblePets, setEligiblePets] = useState<EligiblePet[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [petSelections, setPetSelections] = useState<Record<string, string>>({});
  const [staffSelections, setStaffSelections] = useState<Record<string, string>>({});
  const [staffRecommendations, setStaffRecommendations] = useState<Record<string, StaffRecommendation[]>>({});
  const [auditEvents, setAuditEvents] = useState<PlayGroupAuditEvent[]>([]);
  const [lastBulkRun, setLastBulkRun] = useState<BulkStaffingRun | null>(null);
  const [staffingExceptions, setStaffingExceptions] = useState<StaffingExceptionItem[]>([]);
  const [staffingSummary, setStaffingSummary] = useState<StaffingExceptionSummary>({
    total: 0,
    unassigned: 0,
    invalidTimeSlot: 0,
    withoutShiftCoverage: 0,
    overlapConflicts: 0,
  });
  const [busyExceptionId, setBusyExceptionId] = useState<string | null>(null);

  const load = async (date = selectedDate) => {
    try {
      setError(null);
      const [groupsResponse, staffResponse, petsResponse, auditResponse, exceptionsResponse] = await Promise.all([
        fetch(`/api/admin/play-groups?date=${encodeURIComponent(date)}`),
        fetch('/api/admin/staff?includeInactive=false'),
        fetch('/api/admin/play-groups/eligible-pets'),
        fetch('/api/admin/play-groups/audit?limit=30'),
        fetch(`/api/admin/play-groups/staffing-exceptions?date=${encodeURIComponent(date)}`),
      ]);

      if (!groupsResponse.ok || !staffResponse.ok || !petsResponse.ok || !auditResponse.ok || !exceptionsResponse.ok) {
        throw new Error('Failed to load play group data');
      }

      const groupsPayload = (await groupsResponse.json()) as { data?: PlayGroup[] };
      const staffPayload = (await staffResponse.json()) as { data?: StaffOption[] };
      const petsPayload = (await petsResponse.json()) as { data?: EligiblePet[] };
      const auditPayload = (await auditResponse.json()) as { data?: PlayGroupAuditEvent[] };
      const exceptionsPayload = (await exceptionsResponse.json()) as {
        data?: {
          items?: StaffingExceptionItem[];
          summary?: StaffingExceptionSummary;
        };
      };

      setGroups(groupsPayload.data ?? []);
      setStaffSelections((current) => {
        const next = { ...current };
        for (const group of groupsPayload.data ?? []) {
          if (!(group.id in next)) {
            next[group.id] = group.staffMember?.id ?? '';
          }
        }
        return next;
      });
      setStaff(staffPayload.data ?? []);
      setEligiblePets(petsPayload.data ?? []);
      setAuditEvents(auditPayload.data ?? []);
      setStaffingExceptions(exceptionsPayload.data?.items ?? []);
      setStaffingSummary(exceptionsPayload.data?.summary ?? {
        total: 0,
        unassigned: 0,
        invalidTimeSlot: 0,
        withoutShiftCoverage: 0,
        overlapConflicts: 0,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load play groups');
    }
  };

  useEffect(() => {
    void load(selectedDate);
  }, [selectedDate]);

  async function createGroup(formData: FormData) {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: String(formData.get('name') ?? ''),
        date: new Date(String(formData.get('date') ?? selectedDate)).toISOString(),
        timeSlot: String(formData.get('timeSlot') ?? ''),
        location: String(formData.get('location') ?? 'yard_a'),
        maxCapacity: Number(formData.get('maxCapacity') ?? 10),
        sizeCategory: String(formData.get('sizeCategory') ?? 'mixed'),
        energyLevel: String(formData.get('energyLevel') ?? 'moderate'),
        staffMemberId: String(formData.get('staffMemberId') ?? '') || undefined,
        notes: String(formData.get('notes') ?? ''),
      };

      const response = await fetch('/api/admin/play-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to create play group');
      }

      await load(selectedDate);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create play group');
    } finally {
      setSaving(false);
    }
  }

  async function assignPet(group: PlayGroup) {
    const selected = petSelections[group.id];
    if (!selected) {
      setError('Select a pet before assigning');
      return;
    }

    const eligible = eligiblePets.find((entry) => entry.pet.id === selected);
    if (!eligible) {
      setError('Selected pet is no longer eligible for assignment');
      return;
    }

    try {
      setBusyGroupId(group.id);
      setError(null);
      const response = await fetch(`/api/admin/play-groups/${group.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: eligible.pet.id,
          bookingId: eligible.booking.id,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to assign pet to play group');
      }

      setPetSelections((current) => ({ ...current, [group.id]: '' }));
      await load(selectedDate);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Failed to assign pet');
    } finally {
      setBusyGroupId(null);
    }
  }

  async function removeAssignment(group: PlayGroup, assignmentId: string) {
    try {
      setBusyGroupId(group.id);
      setError(null);
      const response = await fetch(`/api/admin/play-groups/${group.id}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to remove assignment');
      }

      await load(selectedDate);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Failed to remove assignment');
    } finally {
      setBusyGroupId(null);
    }
  }

  async function autoFillGroup(group: PlayGroup) {
    const sortedOptions = getSortedPetOptions(todayEligiblePets, group);
    const remainingCapacity = Math.max(0, group.maxCapacity - group.assignments.length);
    const candidates = sortedOptions.slice(0, remainingCapacity);

    if (candidates.length === 0) {
      setError('No available pets to auto-fill this group.');
      return;
    }

    try {
      setBusyGroupId(group.id);
      setError(null);

      for (const candidate of candidates) {
        const response = await fetch(`/api/admin/play-groups/${group.id}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            petId: candidate.pet.id,
            bookingId: candidate.booking.id,
            behaviorNotes: `Auto-selected fit score: ${candidate.compatibility.score} (${candidate.compatibility.reason})`,
          }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error || 'Failed to auto-fill play group');
        }
      }

      await load(selectedDate);
    } catch (autoFillError) {
      setError(autoFillError instanceof Error ? autoFillError.message : 'Failed to auto-fill play group');
    } finally {
      setBusyGroupId(null);
    }
  }

  async function loadStaffRecommendations(group: PlayGroup) {
    try {
      setBusyGroupId(group.id);
      setError(null);
      const response = await fetch(`/api/admin/play-groups/${group.id}/staff-recommendations`);
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to load staff recommendations');
      }

      const payload = (await response.json()) as {
        data?: {
          recommendations?: StaffRecommendation[];
        };
      };

      setStaffRecommendations((current) => ({
        ...current,
        [group.id]: payload.data?.recommendations ?? [],
      }));
    } catch (recommendationError) {
      setError(
        recommendationError instanceof Error
          ? recommendationError.message
          : 'Failed to load staff recommendations',
      );
    } finally {
      setBusyGroupId(null);
    }
  }

  async function autoAssignStaff(group: PlayGroup) {
    try {
      setBusyGroupId(group.id);
      setError(null);
      const response = await fetch(`/api/admin/play-groups/${group.id}/staff-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to auto-assign staff lead');
      }

      await load(selectedDate);
      await loadStaffRecommendations(group);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Failed to auto-assign staff lead');
    } finally {
      setBusyGroupId(null);
    }
  }

  async function assignRecommendedStaff(group: PlayGroup, staffMemberId: string) {
    try {
      setBusyGroupId(group.id);
      setError(null);
      const response = await fetch(`/api/admin/play-groups/${group.id}/staff-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffMemberId }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to assign recommended staff');
      }

      await load(selectedDate);
      await loadStaffRecommendations(group);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Failed to assign recommended staff');
    } finally {
      setBusyGroupId(null);
    }
  }

  async function reassignStaff(group: PlayGroup) {
    const selectedStaffMemberId = staffSelections[group.id] || null;

    try {
      setBusyGroupId(group.id);
      setError(null);

      const response = await fetch(`/api/admin/play-groups/${group.id}/staff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffMemberId: selectedStaffMemberId }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to update staff assignment');
      }

      await load(selectedDate);
      await loadStaffRecommendations(group);
    } catch (reassignError) {
      setError(reassignError instanceof Error ? reassignError.message : 'Failed to update staff assignment');
    } finally {
      setBusyGroupId(null);
    }
  }

  async function autoAssignAllUnassigned() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/play-groups/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date(selectedDate).toISOString(), repairConflicts: false }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to auto-assign unassigned groups');
      }

      const payload = (await response.json()) as {
        data?: {
          targetDate?: string;
          attempted?: number;
          assigned?: number;
          auditEventsRecorded?: number;
          skippedReasonCounts?: Record<string, number>;
          skipped?: Array<{ groupId: string; reason: string }>;
        };
      };

      setLastBulkRun({
        mode: 'auto_assign',
        targetDate: payload.data?.targetDate ?? new Date(selectedDate).toISOString(),
        attempted: payload.data?.attempted ?? 0,
        assigned: payload.data?.assigned ?? 0,
        auditEventsRecorded: payload.data?.auditEventsRecorded ?? 0,
        skippedReasonCounts: payload.data?.skippedReasonCounts ?? {},
        skipped: payload.data?.skipped ?? [],
      });

      await load(selectedDate);
    } catch (autoAssignError) {
      setError(autoAssignError instanceof Error ? autoAssignError.message : 'Failed to auto-assign unassigned groups');
    } finally {
      setSaving(false);
    }
  }

  async function repairStaffingConflicts() {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/play-groups/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date(selectedDate).toISOString(), repairConflicts: true }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to repair staffing conflicts');
      }

      const payload = (await response.json()) as {
        data?: {
          targetDate?: string;
          attempted?: number;
          assigned?: number;
          auditEventsRecorded?: number;
          skippedReasonCounts?: Record<string, number>;
          skipped?: Array<{ groupId: string; reason: string }>;
        };
      };

      setLastBulkRun({
        mode: 'repair_conflicts',
        targetDate: payload.data?.targetDate ?? new Date(selectedDate).toISOString(),
        attempted: payload.data?.attempted ?? 0,
        assigned: payload.data?.assigned ?? 0,
        auditEventsRecorded: payload.data?.auditEventsRecorded ?? 0,
        skippedReasonCounts: payload.data?.skippedReasonCounts ?? {},
        skipped: payload.data?.skipped ?? [],
      });

      await load(selectedDate);
    } catch (repairError) {
      setError(repairError instanceof Error ? repairError.message : 'Failed to repair staffing conflicts');
    } finally {
      setSaving(false);
    }
  }

  async function autoFixStaffingException(item: StaffingExceptionItem) {
    if (!item.canAutoFix) return;

    try {
      setBusyExceptionId(item.groupId);
      setError(null);

      const response = await fetch(`/api/admin/play-groups/${item.groupId}/staff-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to auto-fix staffing exception');
      }

      await load(selectedDate);
    } catch (autoFixError) {
      setError(autoFixError instanceof Error ? autoFixError.message : 'Failed to auto-fix staffing exception');
    } finally {
      setBusyExceptionId(null);
    }
  }

  async function autoFixActionableExceptions() {
    const groupIds = staffingExceptions.filter((item) => item.canAutoFix).map((item) => item.groupId);
    if (groupIds.length === 0) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/play-groups/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(selectedDate).toISOString(),
          repairConflicts: true,
          groupIds,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to auto-fix actionable exceptions');
      }

      const payload = (await response.json()) as {
        data?: {
          targetDate?: string;
          attempted?: number;
          assigned?: number;
          auditEventsRecorded?: number;
          skippedReasonCounts?: Record<string, number>;
          skipped?: Array<{ groupId: string; reason: string }>;
        };
      };

      setLastBulkRun({
        mode: 'repair_conflicts',
        targetDate: payload.data?.targetDate ?? new Date(selectedDate).toISOString(),
        attempted: payload.data?.attempted ?? 0,
        assigned: payload.data?.assigned ?? 0,
        auditEventsRecorded: payload.data?.auditEventsRecorded ?? 0,
        skippedReasonCounts: payload.data?.skippedReasonCounts ?? {},
        skipped: payload.data?.skipped ?? [],
      });

      await load(selectedDate);
    } catch (fixError) {
      setError(fixError instanceof Error ? fixError.message : 'Failed to auto-fix actionable exceptions');
    } finally {
      setSaving(false);
    }
  }

  async function previewActionableExceptions() {
    const groupIds = staffingExceptions.filter((item) => item.canAutoFix).map((item) => item.groupId);
    if (groupIds.length === 0) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/play-groups/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(selectedDate).toISOString(),
          repairConflicts: true,
          groupIds,
          dryRun: true,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || 'Failed to preview actionable exceptions');
      }

      const payload = (await response.json()) as {
        data?: {
          targetDate?: string;
          attempted?: number;
          assigned?: number;
          auditEventsRecorded?: number;
          skippedReasonCounts?: Record<string, number>;
          skipped?: Array<{ groupId: string; reason: string }>;
        };
      };

      setLastBulkRun({
        mode: 'preview_repair_conflicts',
        targetDate: payload.data?.targetDate ?? new Date(selectedDate).toISOString(),
        attempted: payload.data?.attempted ?? 0,
        assigned: payload.data?.assigned ?? 0,
        auditEventsRecorded: payload.data?.auditEventsRecorded ?? 0,
        skippedReasonCounts: payload.data?.skippedReasonCounts ?? {},
        skipped: payload.data?.skipped ?? [],
      });
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Failed to preview actionable exceptions');
    } finally {
      setSaving(false);
    }
  }

  const todayEligiblePets = eligiblePets.filter((entry) =>
    !groups.some((group) => group.assignments.some((assignment) => assignment.pet.id === entry.pet.id)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Play Groups</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build daily supervised groups, balance capacity, and assign checked-in pets.
        </p>
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => void autoAssignAllUnassigned()}>
              {saving ? 'Running...' : 'Auto-Assign All Unassigned'}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void repairStaffingConflicts()}>
              {saving ? 'Running...' : 'Repair Staffing Conflicts'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || staffingExceptions.every((item) => !item.canAutoFix)}
              onClick={() => void previewActionableExceptions()}
            >
              {saving ? 'Running...' : 'Preview Actionable Repairs'}
            </Button>
          </div>
        </div>
        {lastBulkRun ? (
          <div className="mt-3 rounded-md border px-3 py-2 text-sm">
            <p className="font-medium">
              {lastBulkRun.mode === 'repair_conflicts'
                ? 'Conflict repair run complete'
                : lastBulkRun.mode === 'preview_repair_conflicts'
                  ? 'Conflict repair preview complete'
                  : 'Auto-assignment run complete'}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(lastBulkRun.targetDate).toLocaleDateString()} · attempted {lastBulkRun.attempted} · assigned {lastBulkRun.assigned} · audit events {lastBulkRun.auditEventsRecorded} · skipped {lastBulkRun.skipped.length}
            </p>
            {lastBulkRun.skipped.slice(0, 3).map((entry) => (
              <p key={`${entry.groupId}-${entry.reason}`} className="text-xs text-muted-foreground">
                {entry.groupId}: {entry.reason}
              </p>
            ))}
            {Object.entries(lastBulkRun.skippedReasonCounts)
              .slice(0, 2)
              .map(([reason, count]) => (
                <p key={`${reason}-${count}`} className="text-xs text-muted-foreground">
                  {count} skipped: {reason}
                </p>
              ))}
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Play Group</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createGroup} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date-filter">Day</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Group name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeSlot">Time slot</Label>
              <Input id="timeSlot" name="timeSlot" placeholder="9:00-11:00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select id="location" name="location" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="yard_a">
                <option value="yard_a">Yard A</option>
                <option value="yard_b">Yard B</option>
                <option value="indoor">Indoor</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCapacity">Max capacity</Label>
              <Input id="maxCapacity" name="maxCapacity" type="number" min={1} max={100} defaultValue={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sizeCategory">Size category</Label>
              <select id="sizeCategory" name="sizeCategory" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="mixed">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="energyLevel">Energy level</Label>
              <select id="energyLevel" name="energyLevel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="moderate">
                <option value="calm">Calm</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffMemberId">Assigned staff</Label>
              <select id="staffMemberId" name="staffMemberId" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.user.name || member.user.email || member.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Play Group'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staffing Exceptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving || staffingExceptions.every((item) => !item.canAutoFix)}
              onClick={() => void autoFixActionableExceptions()}
            >
              {saving
                ? 'Running...'
                : `Fix Actionable Exceptions (${staffingExceptions.filter((item) => item.canAutoFix).length})`}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Total {staffingSummary.total}</Badge>
            <Badge variant="outline">Unassigned {staffingSummary.unassigned}</Badge>
            <Badge variant="outline">Invalid Slots {staffingSummary.invalidTimeSlot}</Badge>
            <Badge variant="outline">No Shift Coverage {staffingSummary.withoutShiftCoverage}</Badge>
            <Badge variant="outline">Overlap Conflicts {staffingSummary.overlapConflicts}</Badge>
          </div>

          {staffingExceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staffing exceptions for this day.</p>
          ) : (
            staffingExceptions.slice(0, 8).map((item) => (
              <div key={item.groupId} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">{item.groupName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.timeSlot} · {item.staffName || item.staffMemberId || 'Unassigned'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.issues.map((issue) => staffingIssueLabels[issue]).join(', ')}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{item.recommendedAction}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!item.canAutoFix || busyExceptionId === item.groupId}
                    onClick={() => void autoFixStaffingException(item)}
                  >
                    {busyExceptionId === item.groupId ? 'Fixing...' : 'Auto-Fix'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {groups.length === 0 ? <p>No groups scheduled for this day.</p> : null}

          {groups.map((group) => (
            <article key={group.id} className="rounded-md border p-4 space-y-3">
              {(() => {
                const sortedOptions = getSortedPetOptions(todayEligiblePets, group);
                const selectedPetCompatibility = sortedOptions.find(
                  (entry) => entry.pet.id === (petSelections[group.id] || ''),
                )?.compatibility;

                return (
                  <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.timeSlot} · {group.location.replace('_', ' ')} · {group.sizeCategory} · {group.energyLevel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={group.assignments.length >= group.maxCapacity ? 'destructive' : 'outline'}>
                    {group.assignments.length}/{group.maxCapacity}
                  </Badge>
                  <Badge variant="secondary">
                    {group.staffMember?.user.name || group.staffMember?.user.email || 'Unassigned'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[240px] space-y-2">
                  <Label htmlFor={`staff-${group.id}`}>Reassign staff lead</Label>
                  <select
                    id={`staff-${group.id}`}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={staffSelections[group.id] ?? group.staffMember?.id ?? ''}
                    onChange={(event) =>
                      setStaffSelections((current) => ({ ...current, [group.id]: event.target.value }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.user.name || member.user.email || member.id}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  disabled={busyGroupId === group.id}
                  onClick={() => void reassignStaff(group)}
                >
                  {busyGroupId === group.id ? 'Saving...' : 'Update Staff Lead'}
                </Button>
                <div className="min-w-[260px] space-y-2">
                  <Label htmlFor={`pet-${group.id}`}>Assign checked-in pet</Label>
                  <select
                    id={`pet-${group.id}`}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={petSelections[group.id] || ''}
                    onChange={(event) =>
                      setPetSelections((current) => ({ ...current, [group.id]: event.target.value }))
                    }
                  >
                    <option value="">Select pet</option>
                    {sortedOptions.map((entry) => (
                      <option key={entry.pet.id} value={entry.pet.id}>
                        [{entry.compatibility.score}] {entry.pet.name} ({entry.pet.breed}) · {entry.owner.name || entry.owner.email} · {entry.booking.bookingNumber}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPetCompatibility ? (
                  <Badge variant={getScoreBadgeVariant(selectedPetCompatibility.score)}>
                    Fit {selectedPetCompatibility.score}: {selectedPetCompatibility.reason}
                  </Badge>
                ) : null}
                <Button
                  variant="outline"
                  disabled={busyGroupId === group.id || group.assignments.length >= group.maxCapacity}
                  onClick={() => void assignPet(group)}
                >
                  {busyGroupId === group.id ? 'Saving...' : 'Assign Pet'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busyGroupId === group.id || group.assignments.length >= group.maxCapacity}
                  onClick={() => void autoFillGroup(group)}
                >
                  {busyGroupId === group.id ? 'Saving...' : 'Auto-Fill Best Fits'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busyGroupId === group.id}
                  onClick={() => void loadStaffRecommendations(group)}
                >
                  {busyGroupId === group.id ? 'Loading...' : 'Recommend Staff'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busyGroupId === group.id}
                  onClick={() => void autoAssignStaff(group)}
                >
                  {busyGroupId === group.id ? 'Saving...' : 'Auto-Assign Staff'}
                </Button>
              </div>

              {staffRecommendations[group.id]?.length ? (
                <div className="rounded-md border border-muted bg-muted/20 p-2">
                  <p className="text-xs font-medium text-muted-foreground">Staff recommendations</p>
                  <div className="mt-2 space-y-1">
                    {staffRecommendations[group.id].slice(0, 3).map((recommendation) => (
                      <div key={`${group.id}-${recommendation.staffMember.id}`} className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1 text-xs">
                        <p>
                          {recommendation.staffMember.user.name || recommendation.staffMember.user.email || recommendation.staffMember.id}
                          {' · '}score {recommendation.score}
                          {' · '}role {recommendation.staffMember.role}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyGroupId === group.id}
                          onClick={() => void assignRecommendedStaff(group, recommendation.staffMember.id)}
                        >
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {sortedOptions.length > 0 ? (
                <div className="rounded-md border border-muted bg-muted/20 p-2">
                  <p className="text-xs font-medium text-muted-foreground">Top suggested fits</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sortedOptions.slice(0, 3).map((entry) => (
                      <Badge key={`${group.id}-${entry.pet.id}`} variant={getScoreBadgeVariant(entry.compatibility.score)}>
                        {entry.pet.name}: {entry.compatibility.score}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {group.assignments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Assignments</p>
                  {group.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between rounded border px-3 py-2">
                      <p className="text-sm">
                        {assignment.pet.name} ({assignment.pet.breed})
                        {assignment.booking ? ` · ${assignment.booking.bookingNumber}` : ''}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyGroupId === group.id}
                        onClick={() => void removeAssignment(group, assignment.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pets assigned yet.</p>
              )}
                  </>
                );
              })()}
            </article>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staffing Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staffing audit events yet.</p>
          ) : (
            auditEvents.map((event) => (
              <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">
                  {event.payload.eventType === 'STAFF_UNASSIGNED'
                    ? 'Staff unassigned'
                    : event.payload.eventType === 'STAFF_AUTO_ASSIGNED'
                      ? 'Staff auto-assigned'
                      : 'Staff assigned'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.sentAt).toLocaleString()} · {event.actorName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Group {event.payload.playGroupId}
                  {event.payload.staffMemberId ? ` · Staff ${event.payload.staffMemberId}` : ''}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
