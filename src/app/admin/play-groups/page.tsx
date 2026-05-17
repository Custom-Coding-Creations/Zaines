'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  };
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

export default function AdminPlayGroupsPage() {
  const [groups, setGroups] = useState<PlayGroup[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [eligiblePets, setEligiblePets] = useState<EligiblePet[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [petSelections, setPetSelections] = useState<Record<string, string>>({});

  const load = async (date = selectedDate) => {
    try {
      setError(null);
      const [groupsResponse, staffResponse, petsResponse] = await Promise.all([
        fetch(`/api/admin/play-groups?date=${encodeURIComponent(date)}`),
        fetch('/api/admin/staff?includeInactive=false'),
        fetch('/api/admin/play-groups/eligible-pets'),
      ]);

      if (!groupsResponse.ok || !staffResponse.ok || !petsResponse.ok) {
        throw new Error('Failed to load play group data');
      }

      const groupsPayload = (await groupsResponse.json()) as { data?: PlayGroup[] };
      const staffPayload = (await staffResponse.json()) as { data?: StaffOption[] };
      const petsPayload = (await petsResponse.json()) as { data?: EligiblePet[] };

      setGroups(groupsPayload.data ?? []);
      setStaff(staffPayload.data ?? []);
      setEligiblePets(petsPayload.data ?? []);
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
          <CardTitle>Daily Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {groups.length === 0 ? <p>No groups scheduled for this day.</p> : null}

          {groups.map((group) => (
            <article key={group.id} className="rounded-md border p-4 space-y-3">
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
                    {todayEligiblePets.map((entry) => (
                      <option key={entry.pet.id} value={entry.pet.id}>
                        {entry.pet.name} ({entry.pet.breed}) · {entry.owner.name || entry.owner.email} · {entry.booking.bookingNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  disabled={busyGroupId === group.id || group.assignments.length >= group.maxCapacity}
                  onClick={() => void assignPet(group)}
                >
                  {busyGroupId === group.id ? 'Saving...' : 'Assign Pet'}
                </Button>
              </div>

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
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
