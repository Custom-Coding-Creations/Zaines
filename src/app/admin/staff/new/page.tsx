'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewStaffPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSaving(true);

    const payload = {
      userId: String(formData.get('userId') ?? ''),
      role: String(formData.get('role') ?? 'handler'),
      phone: String(formData.get('phone') ?? ''),
      hireDate: formData.get('hireDate')
        ? new Date(String(formData.get('hireDate'))).toISOString()
        : undefined,
      certifications: String(formData.get('certifications') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      emergencyContact: String(formData.get('emergencyContact') ?? ''),
      notes: String(formData.get('notes') ?? ''),
      isActive: true,
    };

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to create staff member');
      }

      router.push('/admin/staff');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create staff member',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Staff Member</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new staff profile linked to an existing user account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input id="userId" name="userId" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue="handler"
              >
                <option value="handler">Handler</option>
                <option value="groomer">Groomer</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input id="hireDate" name="hireDate" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="certifications">Certifications (comma-separated)</Label>
              <Input id="certifications" name="certifications" placeholder="CPR, Grooming Level 2" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input id="emergencyContact" name="emergencyContact" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={4} />
            </div>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Staff Member'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/staff')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
