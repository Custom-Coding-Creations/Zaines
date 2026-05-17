import { NextResponse } from 'next/server';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { classifyAuthFailure, getAuthErrorType } from '@/lib/api/auth-error-classification';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    databaseUrlSet: isDatabaseConfigured(),
    authSecretSet: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    nodeEnv: process.env.NODE_ENV,
  };

  // Test auth
  try {
    const session = await auth();
    checks.authOk = true;
    checks.authSession = session ? { userId: session.user?.id, role: (session.user as { role?: string })?.role } : null;
  } catch (error) {
    checks.authOk = false;
    checks.authErrorKind = classifyAuthFailure(error);
    checks.authErrorType = getAuthErrorType(error);
    checks.authErrorMessage = error instanceof Error ? error.message : String(error);
  }

  // Test database
  if (isDatabaseConfigured()) {
    try {
      await prisma.$queryRaw`SELECT 1 as ok`;
      checks.databaseOk = true;
    } catch (error) {
      checks.databaseOk = false;
      checks.databaseError = error instanceof Error ? error.message : String(error);
    }
  } else {
    checks.databaseOk = false;
    checks.databaseError = 'DATABASE_URL not set';
  }

  const status = checks.authOk && checks.databaseOk ? 200 : 503;
  return NextResponse.json(checks, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
