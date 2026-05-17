import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

type StaffSession = {
  user: {
    id: string;
    role?: string;
    name?: string | null;
    email?: string | null;
  };
};

type StaffSessionResult =
  | {
      session: StaffSession;
      error: null;
    }
  | {
      session: null;
      error: NextResponse;
    };

function buildAuthFailureResponse(error: unknown): NextResponse {
  const authErrorType =
    error && typeof error === 'object' && 'type' in error && typeof error.type === 'string'
      ? error.type
      : null;

  // Invalid or expired session tokens should be treated as unauthenticated,
  // not as an infrastructure outage.
  if (authErrorType === 'JWTSessionError' || authErrorType === 'SessionTokenError') {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        code: 'ADMIN_AUTH_INVALID_SESSION',
      },
      { status: 401 },
    );
  }

  // Missing secrets are deployment misconfiguration, not transient service failures.
  if (authErrorType === 'MissingSecret') {
    return NextResponse.json(
      {
        error: 'Authentication misconfigured',
        code: 'ADMIN_AUTH_MISCONFIGURED',
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: 'Authentication service unavailable',
      code: 'ADMIN_AUTH_UNAVAILABLE',
    },
    { status: 503 },
  );
}

export async function requireStaffSession(): Promise<StaffSessionResult> {
  try {
    const session = (await auth()) as StaffSession | null;
    if (!session?.user?.id) {
      return {
        session: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const role = session.user.role;
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
      error: buildAuthFailureResponse(error),
    };
  }
}