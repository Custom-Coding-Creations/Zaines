import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthRuntimeConfig } from '@/lib/auth/runtime-config';
import { isDatabaseConfigured } from '@/lib/prisma';
import { classifyAuthFailure, getAuthErrorType } from '@/lib/api/auth-error-classification';

export const dynamic = 'force-dynamic';

type HealthState = 'ok' | 'degraded' | 'misconfigured';

function buildNoStoreResponse(payload: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function GET(): Promise<NextResponse> {
  const hasDatabase = isDatabaseConfigured();
  const runtime = getAuthRuntimeConfig(hasDatabase);

  let authProbeOk = false;
  let authProbeKind: 'success' | 'invalid_session' | 'misconfigured' | 'unavailable' = 'success';
  let authProbeType: string | null = null;

  try {
    await auth();
    authProbeOk = true;
  } catch (error) {
    const kind = classifyAuthFailure(error);
    const type = getAuthErrorType(error);

    authProbeType = type;
    if (kind === 'invalid_session') {
      authProbeKind = 'invalid_session';
      authProbeOk = true;
    } else if (kind === 'misconfigured') {
      authProbeKind = 'misconfigured';
    } else {
      authProbeKind = 'unavailable';
    }
  }

  const checks = {
    hasAuthSecret: runtime.hasAuthSecret,
    hasDatabase,
    sessionStrategy: runtime.sessionStrategy,
    useDatabaseSessions: runtime.useDatabaseSessions,
    authProbe: {
      ok: authProbeOk,
      kind: authProbeKind,
      type: authProbeType,
    },
  };

  if (!runtime.hasAuthSecret) {
    return buildNoStoreResponse(
      {
        status: 'misconfigured' as HealthState,
        code: 'ADMIN_AUTH_MISCONFIGURED',
        checks,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }

  if (runtime.useDatabaseSessions && !hasDatabase) {
    return buildNoStoreResponse(
      {
        status: 'misconfigured' as HealthState,
        code: 'ADMIN_AUTH_DATABASE_REQUIRED',
        checks,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }

  if (!authProbeOk) {
    return buildNoStoreResponse(
      {
        status: 'degraded' as HealthState,
        code: 'ADMIN_AUTH_UNAVAILABLE',
        checks,
        timestamp: new Date().toISOString(),
      },
      503,
    );
  }

  return buildNoStoreResponse(
    {
      status: 'ok' as HealthState,
      code: 'ADMIN_AUTH_READY',
      checks,
      timestamp: new Date().toISOString(),
    },
    200,
  );
}
