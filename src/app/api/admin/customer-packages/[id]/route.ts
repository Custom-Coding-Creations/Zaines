import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getAdminSettings } from '@/lib/api/admin-settings';
import { appendPackageAuditEvent } from '@/lib/api/package-audit';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/admin';

const updateCustomerPackageSchema = z
  .object({
    extensionDays: z.number().int().min(0).max(365).optional(),
    sessionAdjustment: z.number().int().min(-500).max(500).optional(),
    status: z.enum(['active', 'expired', 'fully_used', 'cancelled']).optional(),
  })
  .refine(
    (value) =>
      value.extensionDays !== undefined ||
      value.sessionAdjustment !== undefined ||
      value.status !== undefined,
    'At least one update is required',
  );

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json()) as unknown;
  const parsed = updateCustomerPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id } = await params;
  const customerPackage = await prisma.customerPackage.findUnique({
    where: { id },
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

  if (!customerPackage) {
    return NextResponse.json({ error: 'Customer package not found' }, { status: 404 });
  }

  const settings = await getAdminSettings();
  const extensionDays = parsed.data.extensionDays ?? 0;

  if (extensionDays > 0 && !settings.packageExpirationSettings.allowAdminManualExtension) {
    return NextResponse.json(
      { error: 'Manual package extensions are disabled in admin settings' },
      { status: 400 },
    );
  }

  const nextExpiresAt = extensionDays > 0 ? addDays(customerPackage.expiresAt, extensionDays) : customerPackage.expiresAt;
  const nextSessionsRemaining = Math.max(
    0,
    customerPackage.sessionsRemaining + (parsed.data.sessionAdjustment ?? 0),
  );

  let nextStatus = parsed.data.status ?? customerPackage.status;
  if (nextStatus !== 'cancelled') {
    if (nextExpiresAt.getTime() <= Date.now()) {
      nextStatus = 'expired';
    } else if (
      customerPackage.package.type !== 'monthly_unlimited' &&
      nextSessionsRemaining === 0
    ) {
      nextStatus = 'fully_used';
    } else {
      nextStatus = 'active';
    }
  }

  const nextSessionsUsed = Math.max(
    0,
    customerPackage.sessionsUsed - Math.min(parsed.data.sessionAdjustment ?? 0, 0),
  );

  const updated = await prisma.customerPackage.update({
    where: { id },
    data: {
      expiresAt: nextExpiresAt,
      sessionsRemaining: nextSessionsRemaining,
      sessionsUsed: nextSessionsUsed,
      status: nextStatus,
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
    eventType: 'PACKAGE_UPDATED',
    customerPackageId: updated.id,
    targetUserId: updated.user.id,
    packageId: updated.package.id,
    metadata: {
      extensionDays,
      sessionAdjustment: parsed.data.sessionAdjustment ?? 0,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      sessionsRemaining: updated.sessionsRemaining,
    },
  });

  return NextResponse.json({ success: true, data: updated } as ApiResponse<typeof updated>);
}