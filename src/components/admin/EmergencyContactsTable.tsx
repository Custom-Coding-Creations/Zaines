'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from '@/components/admin/AdminAsyncState';

type ContactRow = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
  bookingId: string;
  bookingNumber: string;
  guest: {
    id: string;
    name: string | null;
    email: string | null;
  };
  pets: Array<{ id: string; name: string; breed: string }>;
};

export function EmergencyContactsTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<ContactRow[]>([]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/contacts', { cache: 'no-store' });
      const data = (await res.json()) as { contacts?: ContactRow[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to load emergency contacts');
      }

      setContacts(data.contacts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load emergency contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
     
    void loadData();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredContacts = normalizedQuery
    ? contacts.filter((contact) => {
        const petNames = contact.pets.map((pet) => pet.name).join(' ');
        return [
          contact.name,
          contact.relationship,
          contact.phone,
          contact.email ?? '',
          contact.guest.name ?? '',
          contact.guest.email ?? '',
          contact.bookingNumber,
          petNames,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
    : contacts;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Emergency Contacts</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            Refresh
          </Button>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by guest, pet, or phone"
        />
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3">
            <AdminErrorState
              message={error}
              action={{ label: 'Retry', onAction: () => void loadData() }}
            />
          </div>
        )}
        {loading ? (
          <AdminLoadingState message="Loading contacts…" />
        ) : filteredContacts.length === 0 ? (
          <AdminEmptyState
            title="No active emergency contacts"
            message="Emergency contacts appear when bookings are checked in and owners have contact records."
            action={{ label: 'View Checked-In Bookings', href: '/admin/bookings?status=checked_in' }}
          />
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Pets</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={`${contact.id}-${contact.bookingId}`}>
                  <TableCell>
                    <div className="font-medium">{contact.guest.name ?? contact.guest.email ?? 'Guest'}</div>
                    <div className="text-xs text-muted-foreground">{contact.bookingNumber}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {contact.pets.map((pet) => pet.name).join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{contact.name}</span>
                    {contact.isPrimary && (
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs">Primary</span>
                    )}
                  </TableCell>
                  <TableCell>{contact.relationship}</TableCell>
                  <TableCell>
                    <a className="text-primary hover:underline" href={`tel:${contact.phone}`}>
                      {contact.phone}
                    </a>
                  </TableCell>
                  <TableCell>{contact.email ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
