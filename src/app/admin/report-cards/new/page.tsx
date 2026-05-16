'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewReportCardPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSaving(true);

    const payload = {
      bookingId: String(formData.get('bookingId') ?? ''),
      petId: String(formData.get('petId') ?? ''),
      staffMemberId: String(formData.get('staffMemberId') ?? '') || undefined,
      date: new Date(String(formData.get('date') ?? '')).toISOString(),
      overallMood: String(formData.get('overallMood') ?? 'good'),
      energyLevel: Number(formData.get('energyLevel') ?? 3),
      appetiteLevel: String(formData.get('appetiteLevel') ?? 'ate_some'),
      socialization: String(formData.get('socialization') ?? 'warming_up'),
      bathroomNotes: String(formData.get('bathroomNotes') ?? ''),
      playHighlights: String(formData.get('playHighlights') ?? ''),
      behaviorNotes: String(formData.get('behaviorNotes') ?? ''),
      staffNotes: String(formData.get('staffNotes') ?? ''),
      sentToOwner: false,
    };

    try {
      const response = await fetch('/api/admin/report-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to create report card');
      }

      router.push('/admin/report-cards');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create report card',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Report Card</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture daily care details and owner-facing highlights.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Card Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input id="bookingId" name="bookingId" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="petId">Pet ID</Label>
              <Input id="petId" name="petId" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffMemberId">Staff Member ID (optional)</Label>
              <Input id="staffMemberId" name="staffMemberId" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overallMood">Mood</Label>
              <select id="overallMood" name="overallMood" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="good">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="energyLevel">Energy (1-5)</Label>
              <Input id="energyLevel" name="energyLevel" type="number" min={1} max={5} defaultValue={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appetiteLevel">Appetite</Label>
              <select id="appetiteLevel" name="appetiteLevel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="ate_some">
                <option value="ate_all">Ate All</option>
                <option value="ate_some">Ate Some</option>
                <option value="didnt_eat">Did not eat</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialization">Socialization</Label>
              <select id="socialization" name="socialization" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="warming_up">
                <option value="loved_it">Loved It</option>
                <option value="warming_up">Warming Up</option>
                <option value="preferred_alone">Preferred Alone</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="playHighlights">Play Highlights</Label>
              <Textarea id="playHighlights" name="playHighlights" rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bathroomNotes">Bathroom Notes</Label>
              <Textarea id="bathroomNotes" name="bathroomNotes" rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="behaviorNotes">Behavior Notes</Label>
              <Textarea id="behaviorNotes" name="behaviorNotes" rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="staffNotes">Staff Notes</Label>
              <Textarea id="staffNotes" name="staffNotes" rows={3} />
            </div>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Create Report Card'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/report-cards')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
