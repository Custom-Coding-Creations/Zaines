import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const e2eBypassEnabled =
    process.env.PLAYWRIGHT_TEST === '1' && cookieStore.get('e2e-staff')?.value === '1';

  if (e2eBypassEnabled) {
    return <AdminShell>{children}</AdminShell>;
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const role = (session.user as { id: string; role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    redirect('/dashboard');
  }

  return <AdminShell>{children}</AdminShell>;
}
