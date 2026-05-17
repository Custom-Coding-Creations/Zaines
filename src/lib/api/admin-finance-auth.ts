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

function buildFinanceAuthFailureResponse(error: unknown): NextResponse {
  const authErrorType =
    error && typeof error === 'object' && 'type' in error && typeof error.type === 'string'
      ? error.type
      : null;

  if (authErrorType === 'JWTSessionError' || authErrorType === 'SessionTokenError') {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        code: 'ADMIN_FINANCE_AUTH_INVALID_SESSION',
      },
      { status: 401 },
    );
  }

  if (authErrorType === 'MissingSecret') {
    return NextResponse.json(
      {
        error: 'Authentication misconfigured',
        code: 'ADMIN_FINANCE_AUTH_MISCONFIGURED',
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: 'Authentication service unavailable',
      code: 'ADMIN_FINANCE_AUTH_UNAVAILABLE',
    },
    { status: 503 },
  );
}

export async function requireFinanceAccess(
  mode: FinanceAccessMode,
): Promise<FinanceAccessResult> {
  let session: { user?: { id?: string; role?: string; name?: string } } | null;
  try {
    session = (await auth()) as { user?: { id?: string; role?: string; name?: string } } | null;
  } catch (error) {
    console.error('Finance auth failure', error);
    return {
      response: buildFinanceAuthFailureResponse(error),
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
