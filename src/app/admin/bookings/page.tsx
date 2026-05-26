'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import type { AdminBookingResponse } from '@/types/admin';
import { formatDateUtc } from '@/lib/datetime-format';

type BookingSortOption = 'newest' | 'oldest' | 'check_in_asc' | 'check_in_desc';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'check_in_asc', label: 'Check-in soonest' },
  { value: 'check_in_desc', label: 'Check-in latest' },
] as const;

function formatStatusLabel(status: string) {
  return status.replace('_', ' ');
}

function getPendingResolution(booking: AdminBookingResponse) {
  const latestPayment = booking.payments?.[0];

  if (!latestPayment) {
    return {
      reason: 'No payment record captured yet.',
      details: 'This booking is still pending because no successful payment exists on file.',
      nextAction: 'Use Recover Payment to collect payment, or Confirm only after verifying payment externally.',
    };
  }

  switch (latestPayment.status) {
    case 'failed':
    case 'cancelled':
      return {
        reason: `Latest payment ${latestPayment.status}.`,
        details: 'The most recent payment attempt did not complete successfully.',
        nextAction: 'Use Recover Payment to retry payment, then Confirm after payment succeeds.',
      };
    case 'pending':
      return {
        reason: 'Payment is still pending.',
        details: 'A payment attempt exists but has not reached a successful completion state yet.',
        nextAction: 'Open Recover Payment to complete payment, or Confirm manually when payment is verified.',
      };
    case 'succeeded':
      return {
        reason: 'Payment succeeded but booking remains pending.',
        details: 'Payment appears captured, but this booking has not been moved to confirmed status.',
        nextAction: 'Use Confirm to move it to confirmed now.',
      };
    case 'refunded':
      return {
        reason: 'Latest payment was refunded.',
        details: 'The most recent payment record indicates funds were refunded.',
        nextAction: 'Review the booking in View and use Recover Payment only if a new charge is needed.',
      };
    default:
      return {
        reason: `Payment status: ${latestPayment.status}.`,
        details: 'This booking is still pending and requires review before check-in.',
        nextAction: 'Use View for details, then Recover Payment or Confirm based on payment state.',
      };
  }
}

function PendingResolutionHint({ booking }: { booking: AdminBookingResponse }) {
  if (booking.status !== 'pending') {
    return null;
  }

  const resolution = getPendingResolution(booking);

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-relaxed text-amber-900">
      <p className="font-semibold">Pending reason: {resolution.reason}</p>
      <p className="mt-1">{resolution.details}</p>
      <p className="mt-1 text-amber-800">Next step: {resolution.nextAction}</p>
    </div>
  );
}

function getActionButtons(
  booking: AdminBookingResponse,
  options: {
    isConfirming: boolean;
    onConfirm: (bookingId: string) => Promise<void>;
  },
) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
      {booking.status === 'pending' && (
        <Button
          size="sm"
          variant="default"
          disabled={options.isConfirming}
          onClick={() => options.onConfirm(booking.id)}
        >
          {options.isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Confirm
            </>
          )}
        </Button>
      )}
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
  );
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<AdminBookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams?.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') ?? 'all');
  const [sortBy, setSortBy] = useState<BookingSortOption>(
    ((searchParams?.get('sort') as BookingSortOption | null) ?? 'newest'),
  );
  const [confirmingBookingId, setConfirmingBookingId] = useState<string | null>(null);

  useEffect(() => {
    const nextSearch = searchParams?.get('search') ?? '';
    const nextStatus = searchParams?.get('status') ?? 'all';
    const nextSort = ((searchParams?.get('sort') as BookingSortOption | null) ?? 'newest');

    setSearchTerm((current) => (current === nextSearch ? current : nextSearch));
    setStatusFilter((current) => (current === nextStatus ? current : nextStatus));
    setSortBy((current) => (current === nextSort ? current : nextSort));
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams) return;

    const params = new URLSearchParams(searchParams.toString());

    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    } else {
      params.delete('search');
    }

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }

    if (sortBy !== 'newest') {
      params.set('sort', sortBy);
    } else {
      params.delete('sort');
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `/admin/bookings?${nextQuery}` : '/admin/bookings');
    }
  }, [router, searchParams, searchTerm, sortBy, statusFilter]);

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

  const handleConfirmBooking = async (bookingId: string) => {
    const shouldConfirm = window.confirm('Mark this booking as confirmed?');
    if (!shouldConfirm) {
      return;
    }

    setConfirmingBookingId(bookingId);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/confirm`, {
        method: 'POST',
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to confirm booking');
      }

      await fetchBookings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm booking';
      window.alert(message);
    } finally {
      setConfirmingBookingId(null);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const visibleBookings = bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        booking.bookingNumber.toLowerCase().includes(normalizedSearch) ||
        booking.user?.name?.toLowerCase().includes(normalizedSearch) ||
        booking.user?.email?.toLowerCase().includes(normalizedSearch) ||
        booking.suite?.name.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...visibleBookings].sort((left, right) => {
      const leftCreatedAt = new Date(left.createdAt).getTime();
      const rightCreatedAt = new Date(right.createdAt).getTime();
      const leftCheckIn = new Date(left.checkInDate).getTime();
      const rightCheckIn = new Date(right.checkInDate).getTime();

      switch (sortBy) {
        case 'oldest':
          return leftCreatedAt - rightCreatedAt;
        case 'check_in_asc':
          return leftCheckIn - rightCheckIn;
        case 'check_in_desc':
          return rightCheckIn - leftCheckIn;
        case 'newest':
        default:
          return rightCreatedAt - leftCreatedAt;
      }
    });
  }, [bookings, searchTerm, sortBy, statusFilter]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking number, guest name, email, or suite..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as BookingSortOption)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort bookings" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <>
              <div className="space-y-3 md:hidden">
                {filteredBookings.map((booking) => (
                  <Card key={booking.id} className="rounded-2xl border-border/70 shadow-none">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{booking.bookingNumber}</p>
                          <p className="mt-1 font-semibold truncate">{booking.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground break-all">{booking.user?.email}</p>
                        </div>
                        <Badge variant={statusBadgeVariant(booking.status)}>
                          {formatStatusLabel(booking.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Suite</p>
                          <p className="mt-1 font-medium">{booking.suite?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                          <p className="mt-1 font-semibold">${booking.total.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-in</p>
                          <p className="mt-1">{formatDateUtc(booking.checkInDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Check-out</p>
                          <p className="mt-1">{formatDateUtc(booking.checkOutDate)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pets</p>
                        <p className="mt-1 text-sm">
                          {booking.bookingPets
                            .map((bp) => bp.pet?.name)
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </p>
                      </div>

                      <PendingResolutionHint booking={booking} />

                      {getActionButtons(booking, {
                        isConfirming: confirmingBookingId === booking.id,
                        onConfirm: handleConfirmBooking,
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[800px]">
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
                          <div className="space-y-2">
                            <Badge variant={statusBadgeVariant(booking.status)}>
                              {formatStatusLabel(booking.status)}
                            </Badge>
                            <PendingResolutionHint booking={booking} />
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${booking.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getActionButtons(booking, {
                            isConfirming: confirmingBookingId === booking.id,
                            onConfirm: handleConfirmBooking,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
