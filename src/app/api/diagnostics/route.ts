import { NextResponse } from 'next/server';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { classifyAuthFailure, getAuthErrorType } from '@/lib/api/auth-error-classification';

export const dynamic = 'force-dynamic';

async function testTable(name: string, fn: () => Promise<unknown>): Promise<{ ok: boolean; error?: string; count?: number }> {
  try {
    const result = await fn();
    return { ok: true, count: Array.isArray(result) ? result.length : typeof result === 'number' ? result : undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

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

  // Test database connectivity
  if (isDatabaseConfigured()) {
    try {
      await prisma.$queryRaw`SELECT 1 as ok`;
      checks.databaseOk = true;
    } catch (error) {
      checks.databaseOk = false;
      checks.databaseError = error instanceof Error ? error.message : String(error);
    }

    // Test each table used by the failing endpoints
    const tables: Record<string, { ok: boolean; error?: string; count?: number }> = {};
    tables.timeSlotConfig = await testTable('timeSlotConfig', () => prisma.timeSlotConfig.count());
    tables.playGroup = await testTable('playGroup', () => prisma.playGroup.count());
    tables.booking = await testTable('booking', () => prisma.booking.count());
    tables.staffMember = await testTable('staffMember', () => prisma.staffMember.count());
    tables.reportCard = await testTable('reportCard', () => prisma.reportCard.count());
    tables.incidentReport = await testTable('incidentReport', () => prisma.incidentReport.count());
    tables.bookingPackage = await testTable('bookingPackage', () => prisma.bookingPackage.count());
    tables.recurringBooking = await testTable('recurringBooking', () => prisma.recurringBooking.count());
    tables.suite = await testTable('suite', () => prisma.suite.count());
    tables.message = await testTable('message', () => prisma.message.count());
    tables.payment = await testTable('payment', () => prisma.payment.count());
    checks.tables = tables;
  } else {
    checks.databaseOk = false;
    checks.databaseError = 'DATABASE_URL not set';
  }

  const allTablesOk = checks.tables ? Object.values(checks.tables as Record<string, { ok: boolean }>).every(t => t.ok) : false;
  const status = checks.authOk && checks.databaseOk && allTablesOk ? 200 : 503;
  return NextResponse.json(checks, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
