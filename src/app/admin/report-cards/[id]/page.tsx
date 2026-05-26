'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ReportCardPayload = {
  id: string;
  bookingId: string;
  petId: string;
  staffMemberId: string | null;
  date: string;
  overallMood: string;
  energyLevel: number;
  appetiteLevel: string;
  socialization: string;
  bathroomNotes: string | null;
  playHighlights: string | null;
  behaviorNotes: string | null;
  staffNotes: string | null;
  sentToOwner: boolean;
};

export default function ReportCardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<ReportCardPayload | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/report-cards/${params.id}`);
        if (!response.ok) throw new Error('Failed to load report card');
        const payload = (await response.json()) as { data?: ReportCardPayload };
        setCard(payload.data ?? null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load report card');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      void run();
    }
  }, [params.id]);

  async function onSubmit(formData: FormData) {
    if (!card) return;
    setError(null);
    setSaving(true);

    const payload = {
      bookingId: String(formData.get('bookingId') ?? card.bookingId),
      petId: String(formData.get('petId') ?? card.petId),
      staffMemberId: String(formData.get('staffMemberId') ?? '') || undefined,
      date: new Date(String(formData.get('date') ?? card.date)).toISOString(),
      overallMood: String(formData.get('overallMood') ?? card.overallMood),
      energyLevel: Number(formData.get('energyLevel') ?? card.energyLevel),
      appetiteLevel: String(formData.get('appetiteLevel') ?? card.appetiteLevel),
      socialization: String(formData.get('socialization') ?? card.socialization),
      bathroomNotes: String(formData.get('bathroomNotes') ?? ''),
      playHighlights: String(formData.get('playHighlights') ?? ''),
      behaviorNotes: String(formData.get('behaviorNotes') ?? ''),
      staffNotes: String(formData.get('staffNotes') ?? ''),
      sentToOwner: formData.get('sentToOwner') === 'on',
    };

    try {
      const response = await fetch(`/api/admin/report-cards/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save report card');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save report card');
    } finally {
      setSaving(false);
    }
  }

  async function sendToOwner() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/report-cards/${params.id}/send`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to send report card');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send report card');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading report card...</p>;
  if (!card) return <p>Report card not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Report Card</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit care summary and send to owner.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/report-cards')}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Report Card</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input id="bookingId" name="bookingId" defaultValue={card.bookingId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="petId">Pet ID</Label>
              <Input id="petId" name="petId" defaultValue={card.petId} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffMemberId">Staff Member ID</Label>
              <Input id="staffMemberId" name="staffMemberId" defaultValue={card.staffMemberId ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date(card.date).toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overallMood">Mood</Label>
              <select id="overallMood" name="overallMood" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={card.overallMood}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="energyLevel">Energy</Label>
              <Input id="energyLevel" name="energyLevel" type="number" min={1} max={5} defaultValue={card.energyLevel} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appetiteLevel">Appetite</Label>
              <select id="appetiteLevel" name="appetiteLevel" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={card.appetiteLevel}>
                <option value="ate_all">Ate All</option>
                <option value="ate_some">Ate Some</option>
                <option value="didnt_eat">Did not eat</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialization">Socialization</Label>
              <select id="socialization" name="socialization" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={card.socialization}>
                <option value="loved_it">Loved It</option>
                <option value="warming_up">Warming Up</option>
                <option value="preferred_alone">Preferred Alone</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="playHighlights">Play Highlights</Label>
              <Textarea id="playHighlights" name="playHighlights" rows={3} defaultValue={card.playHighlights ?? ''} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bathroomNotes">Bathroom Notes</Label>
              <Textarea id="bathroomNotes" name="bathroomNotes" rows={2} defaultValue={card.bathroomNotes ?? ''} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="behaviorNotes">Behavior Notes</Label>
              <Textarea id="behaviorNotes" name="behaviorNotes" rows={2} defaultValue={card.behaviorNotes ?? ''} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="staffNotes">Staff Notes</Label>
              <Textarea id="staffNotes" name="staffNotes" rows={3} defaultValue={card.staffNotes ?? ''} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="sentToOwner" defaultChecked={card.sentToOwner} /> Already sent to owner
            </label>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Button type="button" variant="outline" disabled={saving} onClick={sendToOwner}>Send to Owner</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
