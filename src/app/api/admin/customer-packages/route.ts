import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { appendPackageAuditEvent } from '@/lib/api/package-audit';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/admin';

const createCustomerPackageSchema = z.object({
  email: z.string().email(),
  packageId: z.string().min(1),
});

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json()) as unknown;
  const parsed = createCustomerPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user, pkg] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    prisma.bookingPackage.findUnique({
      where: { id: parsed.data.packageId },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'Customer account not found for that email' }, { status: 404 });
  }

  if (!pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const now = new Date();
  const created = await prisma.customerPackage.create({
    data: {
      userId: user.id,
      packageId: pkg.id,
      purchaseDate: now,
      expiresAt: addDays(now, pkg.validDays),
      sessionsRemaining: pkg.totalSessions,
      status: 'active',
    },
    include: {
      package: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  await appendPackageAuditEvent({
    actorUserId: authResult.session.user.id,
    actorName:
      ((authResult.session.user as { name?: string | null }).name ||
        (authResult.session.user as { email?: string | null }).email ||
        'Staff') as string,
    eventType: 'PACKAGE_GRANTED',
    customerPackageId: created.id,
    targetUserId: created.user.id,
    packageId: created.package.id,
    metadata: {
      expiresAt: created.expiresAt.toISOString(),
      sessionsRemaining: created.sessionsRemaining,
    },
  });

  return NextResponse.json(
    { success: true, data: created } as ApiResponse<typeof created>,
    { status: 201 },
  );
}