import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminSubNav } from '@/components/admin/AdminSubNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const e2eBypassEnabled =
    process.env.PLAYWRIGHT_TEST === '1' && cookieStore.get('e2e-staff')?.value === '1';

  if (e2eBypassEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <AdminSubNav />
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </div>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const role = (session.user as { id: string; role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <AdminSubNav />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
