'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewIncidentPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSaving(true);

    const payload = {
      bookingId: String(formData.get('bookingId') ?? '') || undefined,
      petId: String(formData.get('petId') ?? ''),
      reportedByStaffId: String(formData.get('reportedByStaffId') ?? '') || undefined,
      type: String(formData.get('type') ?? 'health_event'),
      severity: String(formData.get('severity') ?? 'minor'),
      description: String(formData.get('description') ?? ''),
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
      const response = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to create incident report');
      }

      router.push('/admin/incidents');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create incident report',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Log Incident</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Document incidents, notify owners, and track follow-up actions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="petId">Pet ID</Label>
              <Input id="petId" name="petId" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID (optional)</Label>
              <Input id="bookingId" name="bookingId" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportedByStaffId">Reported by Staff ID</Label>
              <Input id="reportedByStaffId" name="reportedByStaffId" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="health_event">
                <option value="injury">Injury</option>
                <option value="aggression">Aggression</option>
                <option value="health_event">Health Event</option>
                <option value="escape_attempt">Escape Attempt</option>
                <option value="property_damage">Property Damage</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <select id="severity" name="severity" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="minor">
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="serious">Serious</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={4} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <Textarea id="actionTaken" name="actionTaken" rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vetDetails">Vet Details</Label>
              <Textarea id="vetDetails" name="vetDetails" rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="followUpNotes">Follow-up Notes</Label>
              <Textarea id="followUpNotes" name="followUpNotes" rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="photos">Photo URLs (comma-separated)</Label>
              <Input id="photos" name="photos" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="witnessNames">Witness Names (comma-separated)</Label>
              <Input id="witnessNames" name="witnessNames" />
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="vetReferral" /> Vet referral needed
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="ownerNotified" /> Owner already notified
            </label>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="followUpRequired" /> Follow-up required
            </label>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Create Incident Report'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/incidents')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
