'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type StaffItem = {
  id: string;
  role: string;
  isActive: boolean;
  phone: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export default function AdminStaffPage() {
  const [rows, setRows] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/staff');
        if (!response.ok) throw new Error('Failed to load staff');
        const payload = (await response.json()) as { data?: StaffItem[] };
        setRows(payload.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load staff');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const filtered = rows.filter((row) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      row.user.name?.toLowerCase().includes(term) ||
      row.user.email?.toLowerCase().includes(term) ||
      row.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage daycare team members, roles, and activation state.
        </p>
        <Button asChild className="mt-3">
          <Link href="/admin/staff/new">Add Staff Member</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or role"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p>Loading staff...</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
          {!loading && !error && filtered.length === 0 ? <p>No staff records found.</p> : null}

          {!loading && !error
            ? filtered.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border px-3 py-3"
                >
                  <div>
                    <p className="font-medium">{row.user.name ?? 'Unnamed staff member'}</p>
                    <p className="text-xs text-muted-foreground">{row.user.email ?? 'No email'} · {row.phone ?? 'No phone'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{row.role}</Badge>
                    <Badge variant={row.isActive ? 'default' : 'secondary'}>
                      {row.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/staff/${row.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
