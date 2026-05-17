import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

type StaffSession = {
  user?: {
    id?: string;
    role?: string;
  };
};

type StaffSessionResult = {
  session: StaffSession | null;
  error: NextResponse | null;
};

export async function requireStaffSession(): Promise<StaffSessionResult> {
  try {
    const session = (await auth()) as StaffSession | null;
    if (!session?.user?.id) {
      return {
        session: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const role = (session.user as { role?: string }).role;
    if (!role || !['staff', 'admin'].includes(role)) {
      return {
        session: null,
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }

    return { session, error: null };
  } catch (error) {
    console.error('Admin auth failure', error);
    return {
      session: null,
      error: NextResponse.json(
        {
          error: 'Authentication service unavailable',
          code: 'ADMIN_AUTH_UNAVAILABLE',
        },
        { status: 503 },
      ),
    };
  }
}