import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

type FinanceAccessMode = 'read' | 'write';

type FinanceAccessResult =
  | {
      session: { user: { id: string; role?: string; name?: string } };
      response?: never;
    }
  | {
      session?: never;
      response: NextResponse;
    };

export async function requireFinanceAccess(
  mode: FinanceAccessMode,
): Promise<FinanceAccessResult> {
  let session: { user?: { id?: string; role?: string; name?: string } } | null;
  try {
    session = (await auth()) as { user?: { id?: string; role?: string; name?: string } } | null;
  } catch (error) {
    console.error('Finance auth failure', error);
    return {
      response: NextResponse.json(
        {
          error: 'Authentication service unavailable',
          code: 'ADMIN_FINANCE_AUTH_UNAVAILABLE',
        },
        { status: 503 },
      ),
    };
  }

  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const role = session.user.role;
  const hasReadAccess = role === 'staff' || role === 'admin';
  const hasWriteAccess = role === 'admin';

  if (mode === 'read' && !hasReadAccess) {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  if (mode === 'write' && !hasWriteAccess) {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return {
    session: {
      user: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.name,
      },
    },
  };
}
