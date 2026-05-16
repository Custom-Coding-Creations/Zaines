'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type StaffPayload = {
  id: string;
  userId: string;
  role: 'handler' | 'groomer' | 'manager';
  phone: string | null;
  emergencyContact: string | null;
  notes: string | null;
  isActive: boolean;
  certifications: string[];
};

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffPayload | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/staff/${params.id}`);
        if (!response.ok) throw new Error('Failed to load staff member');
        const payload = (await response.json()) as { data?: StaffPayload };
        setStaff(payload.data ?? null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load staff member');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      void run();
    }
  }, [params.id]);

  async function onSubmit(formData: FormData) {
    if (!staff) return;
    setError(null);
    setSaving(true);

    const payload = {
      userId: String(formData.get('userId') ?? ''),
      role: String(formData.get('role') ?? staff.role),
      phone: String(formData.get('phone') ?? ''),
      emergencyContact: String(formData.get('emergencyContact') ?? ''),
      notes: String(formData.get('notes') ?? ''),
      certifications: String(formData.get('certifications') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      isActive: formData.get('isActive') === 'on',
    };

    try {
      const response = await fetch(`/api/admin/staff/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save staff member');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/staff/${params.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to deactivate staff member');
      router.push('/admin/staff');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to deactivate staff member');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading staff member...</p>;
  if (!staff) return <p>Staff member not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Staff Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage role, status, and operational notes.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/staff')}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Staff Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input id="userId" name="userId" defaultValue={staff.userId} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select id="role" name="role" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue={staff.role}>
                <option value="handler">Handler</option>
                <option value="groomer">Groomer</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={staff.phone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input id="emergencyContact" name="emergencyContact" defaultValue={staff.emergencyContact ?? ''} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="certifications">Certifications (comma-separated)</Label>
              <Input id="certifications" name="certifications" defaultValue={staff.certifications.join(', ')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={4} defaultValue={staff.notes ?? ''} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="isActive" defaultChecked={staff.isActive} /> Active staff member
            </label>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Button type="button" variant="destructive" disabled={saving} onClick={deactivate}>Deactivate</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
