'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search } from 'lucide-react';
import type { AdminBookingResponse } from '@/types/admin';
import { formatDateUtc } from '@/lib/datetime-format';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'checked_in':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    if (search) {
      setSearchTerm(search);
    }
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/bookings');
      if (!res.ok) {
        throw new Error(`Failed to fetch bookings: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as {
        success?: boolean;
        data?: AdminBookingResponse[];
        bookings?: AdminBookingResponse[];
      };

      const bookingList = data.data || data.bookings || [];
      setBookings(bookingList);
      setError(null);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load bookings. Please try again.');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) {
      return bookings;
    }

    const term = searchTerm.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.bookingNumber.toLowerCase().includes(term) ||
        booking.user?.name?.toLowerCase().includes(term) ||
        booking.user?.email?.toLowerCase().includes(term) ||
        booking.suite?.name.toLowerCase().includes(term),
    );
  }, [bookings, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading bookings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-center">
          <p className="text-destructive font-semibold">Error Loading Bookings</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
        <Button onClick={fetchBookings} variant="outline">
          <Loader2 className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all bookings from web, phone, and walk-in orders
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/bookings/create">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by booking number, guest name, email, or suite..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredBookings.length} {filteredBookings.length === 1 ? 'Booking' : 'Bookings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No bookings found</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/admin/bookings/create">Create your first booking</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Suite</TableHead>
                    <TableHead>Pets</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-sm">
                        {booking.bookingNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{booking.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{booking.suite?.name}</TableCell>
                      <TableCell className="text-sm">
                        {booking.bookingPets
                          .map((bp) => bp.pet?.name)
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateUtc(booking.checkInDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateUtc(booking.checkOutDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(booking.status)}>
                          {booking.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${booking.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {booking.status === 'confirmed' && (
                            <Button asChild size="sm" variant="default">
                              <Link href={`/admin/check-in/${booking.id}`}>
                                Check-in
                              </Link>
                            </Button>
                          )}
                          {booking.status === 'checked_in' && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/check-out/${booking.id}`}>
                                Check-out
                              </Link>
                            </Button>
                          )}
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/bookings/${booking.id}#payment-recovery`}>
                                Recover Payment
                              </Link>
                            </Button>
                          )}
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/admin/bookings/${booking.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
