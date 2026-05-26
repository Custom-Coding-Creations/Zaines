'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type IncidentPayload = {
  id: string;
  bookingId: string | null;
  petId: string;
  reportedByStaffId: string | null;
  type: string;
  severity: string;
  description: string;
  actionTaken: string | null;
  vetReferral: boolean;
  vetDetails: string | null;
  ownerNotified: boolean;
  followUpRequired: boolean;
  followUpNotes: string | null;
  photos: string[];
  witnessNames: string[];
};

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incident, setIncident] = useState<IncidentPayload | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/incidents/${params.id}`);
        if (!response.ok) throw new Error('Failed to load incident report');
        const payload = (await response.json()) as { data?: IncidentPayload };
        setIncident(payload.data ?? null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load incident report');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      void run();
    }
  }, [params.id]);

  async function onSubmit(formData: FormData) {
    if (!incident) return;
    setError(null);
    setSaving(true);

    const payload = {
      bookingId: String(formData.get('bookingId') ?? '') || undefined,
      petId: String(formData.get('petId') ?? incident.petId),
      reportedByStaffId: String(formData.get('reportedByStaffId') ?? '') || undefined,
      type: String(formData.get('type') ?? incident.type),
      severity: String(formData.get('severity') ?? incident.severity),
      description: String(formData.get('description') ?? incident.description),
      actionTaken: String(formData.get('actionTaken') ?? ''),
      vetReferral: formData.get('vetReferral') === 'on',
      vetDetails: String(formData.get('vetDetails') ?? ''),
      ownerNotified: formData.get('ownerNotified') === 'on',
      followUpRequired: formData.get('followUpRequired') === 'on',
      followUpNotes: String(formData.get('followUpNotes') ?? ''),
      photos: String(formData.get('photos') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      witnessNames: String(formData.get('witnessNames') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    };

    try {
      const response = await fetch(`/api/admin/incidents/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save incident report');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to save incident report',
      );
    } finally {
      setSaving(false);
    }
  }

  async function notifyOwner() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/incidents/${params.id}/notify-owner`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to mark owner notified');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to mark owner notified',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading incident report...</p>;
  if (!incident) return <p>Incident report not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incident Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Update incident details and owner communication status.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/incidents')}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Incident</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="petId">Pet ID</Label>
              <Input id="petId" name="petId" defaultValue={incident.petId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input id="bookingId" name="bookingId" defaultValue={incident.bookingId ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportedByStaffId">Reported by Staff ID</Label>
              <Input id="reportedByStaffId" name="reportedByStaffId" defaultValue={incident.reportedByStaffId ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={incident.type}>
                <option value="injury">Injury</option>
                <option value="aggression">Aggression</option>
                <option value="health_event">Health Event</option>
                <option value="escape_attempt">Escape Attempt</option>
                <option value="property_damage">Property Damage</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <select id="severity" name="severity" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={incident.severity}>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="serious">Serious</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} defaultValue={incident.description} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <Textarea id="actionTaken" name="actionTaken" rows={3} defaultValue={incident.actionTaken ?? ''} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vetDetails">Vet Details</Label>
              <Textarea id="vetDetails" name="vetDetails" rows={2} defaultValue={incident.vetDetails ?? ''} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="followUpNotes">Follow-up Notes</Label>
              <Textarea id="followUpNotes" name="followUpNotes" rows={2} defaultValue={incident.followUpNotes ?? ''} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="photos">Photo URLs (comma-separated)</Label>
              <Input id="photos" name="photos" defaultValue={incident.photos.join(', ')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="witnessNames">Witness Names (comma-separated)</Label>
              <Input id="witnessNames" name="witnessNames" defaultValue={incident.witnessNames.join(', ')} />
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="vetReferral" defaultChecked={incident.vetReferral} /> Vet referral needed
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="ownerNotified" defaultChecked={incident.ownerNotified} /> Owner notified
            </label>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="followUpRequired" defaultChecked={incident.followUpRequired} /> Follow-up required
            </label>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Button type="button" variant="outline" disabled={saving} onClick={notifyOwner}>Mark Owner Notified</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
