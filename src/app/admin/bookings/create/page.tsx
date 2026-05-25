import { auth } from '@/lib/auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookingForm } from '@/components/admin/BookingForm';
import { Button } from '@/components/ui/button';
import { getAdminSettings } from '@/lib/api/admin-settings';

export default async function CreateBookingPage() {
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
      <div>
        <h1 className="text-2xl font-semibold mb-4">Create Booking</h1>
        <p className="text-muted-foreground">Database is not configured. Booking creation is unavailable.</p>
      </div>
    );
  }

  // Fetch customers, pets, and suites for form dropdowns
  const [customers, settings] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'customer' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    getAdminSettings(),
  ]);

  // Build suites from Settings (source of truth) instead of Suite table
  const suites = settings.serviceSettings.serviceTiers
    .filter((t) => t.isActive)
    .map((tier) => ({
      id: `suite-${tier.id.replace('-suite', '')}-1`,
      name: tier.name,
      pricePerNight: tier.baseNightlyRate,
    }));

  const pets = await prisma.pet.findMany({
    select: { id: true, userId: true, name: true, breed: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Create Booking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manually create a booking for phone orders, walk-ins, or special requests
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/bookings">← Back to Bookings</Link>
        </Button>
      </div>

      <BookingForm
        customers={customers}
        pets={pets}
        suites={suites}
        autoConfirmDefault={settings.autoConfirmBookings}
      />
    </div>
  );
}
