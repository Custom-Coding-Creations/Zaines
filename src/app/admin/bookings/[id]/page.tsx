import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAdminBooking } from '@/lib/api/admin-bookings';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingPaymentRecoveryCard } from '@/components/admin/BookingPaymentRecoveryCard';
import { RepairBookingPetsButton } from '@/components/admin/RepairBookingPetsButton';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

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

function formatDate(dateValue: Date | string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return DATE_FORMATTER.format(date);
}

function inferPaymentFlow(stripePaymentId: string | null): string {
  if (!stripePaymentId) return 'unknown';
  if (stripePaymentId.startsWith('pi_')) return 'payment element';
  if (stripePaymentId.startsWith('cs_')) return 'embedded checkout';
  return 'unknown';
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const role = (session.user as { id: string; role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    redirect('/dashboard');
  }

  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Booking Details</h1>
        <p className="text-muted-foreground">Database is not configured.</p>
      </div>
    );
  }

  const booking = await getAdminBooking(id);
  if (!booking) {
    notFound();
  }

  const recentPayments = await prisma.payment.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const petNames = booking.bookingPets
    .map((bookingPet) => bookingPet.pet?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Booking {booking.bookingNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(booking.checkInDate)} to {formatDate(booking.checkOutDate)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/bookings">Back to Bookings</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Guest</p>
            <p className="font-medium">{booking.user?.name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">{booking.user?.email || '—'}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Suite</p>
            <p className="font-medium">{booking.suite?.name || '—'}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <Badge variant={statusBadgeVariant(booking.status)}>
              {booking.status.replace('_', ' ')}
            </Badge>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="font-semibold">${booking.total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pets</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{petNames || 'No pets attached to this booking.'}</p>
          {!petNames ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                This booking is missing pet associations. Attach owner pets to restore photo/activity workflows.
              </p>
              <div className="mt-3">
                <RepairBookingPetsButton bookingId={booking.id} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment records exist for this booking yet.</p>
          ) : (
            recentPayments.map((payment) => (
              <div key={payment.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(payment.status)}>
                    {payment.status.replace('_', ' ')}
                  </Badge>
                  <span className="font-medium">${payment.amount.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Flow: {inferPaymentFlow(payment.stripePaymentId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Processor ID: {payment.stripePaymentId ?? 'none'}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {(booking.status === 'pending' || booking.status === 'confirmed') && (
        <div id="payment-recovery">
          <BookingPaymentRecoveryCard bookingId={booking.id} />
        </div>
      )}

      <div className="flex gap-3">
        {booking.status === 'confirmed' && (
          <Button asChild>
            <Link href={`/admin/check-in/${booking.id}`}>Start Check-in</Link>
          </Button>
        )}

        {booking.status === 'checked_in' && (
          <Button asChild variant="outline">
            <Link href={`/admin/check-out/${booking.id}`}>Start Check-out</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
