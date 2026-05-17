import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { PACKAGE_AUDIT_PREFIX, parsePackageAuditContent } from '@/lib/api/package-audit';
import type { ApiResponse } from '@/types/admin';

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

export async function GET(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;

  const rows = await prisma.message.findMany({
    where: {
      content: {
        startsWith: PACKAGE_AUDIT_PREFIX,
      },
    },
    orderBy: {
      sentAt: 'desc',
    },
    take: safeLimit,
    select: {
      id: true,
      senderName: true,
      sentAt: true,
      content: true,
    },
  });

  const events = rows
    .map((row) => {
      const payload = parsePackageAuditContent(row.content);
      if (!payload) return null;

      return {
        id: row.id,
        actorName: row.senderName,
        sentAt: row.sentAt,
        payload,
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null);

  return NextResponse.json({ success: true, data: events } as ApiResponse<typeof events>);
}