'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type PackageItem = {
  id: string;
  name: string;
  type: string;
  totalSessions: number;
  price: number;
  validDays: number;
  description: string | null;
  isActive: boolean;
};

export default function AdminPackagesPage() {
  const [rows, setRows] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPackages() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/packages');
      if (!response.ok) throw new Error('Failed to load packages');
      const payload = (await response.json()) as { data?: PackageItem[] };
      setRows(payload.data ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPackages();
  }, []);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsSaving(true);

    const payload = {
      name: String(formData.get('name') ?? ''),
      type: String(formData.get('type') ?? 'daycare_pass'),
      totalSessions: Number(formData.get('totalSessions') ?? 1),
      price: Number(formData.get('price') ?? 0),
      validDays: Number(formData.get('validDays') ?? 30),
      description: String(formData.get('description') ?? ''),
      isActive: true,
    };

    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to create package');
      }

      await loadPackages();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create package');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Packages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage daycare package products and availability.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Package</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="daycare_pass">
                <option value="daycare_pass">Daycare Pass</option>
                <option value="boarding_bundle">Boarding Bundle</option>
                <option value="monthly_unlimited">Monthly Unlimited</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalSessions">Total Sessions</Label>
              <Input id="totalSessions" name="totalSessions" type="number" min={1} defaultValue={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" name="price" type="number" min={0} step="0.01" defaultValue={250} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validDays">Valid Days</Label>
              <Input id="validDays" name="validDays" type="number" min={1} defaultValue={90} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>

            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}

            <div className="md:col-span-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Create Package'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Packages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading packages...</p> : null}
          {!loading && rows.length === 0 ? <p>No packages created yet.</p> : null}
          {rows.map((pkg) => (
            <div key={pkg.id} className="rounded-md border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pkg.type} · {pkg.totalSessions} sessions · valid {pkg.validDays} days
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">${pkg.price.toFixed(2)}</Badge>
                  <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
