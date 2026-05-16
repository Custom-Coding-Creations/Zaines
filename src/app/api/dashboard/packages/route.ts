import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types/admin';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
  }

  const customerPackages = await prisma.customerPackage.findMany({
    where: { userId: session.user.id },
    include: {
      package: true,
    },
    orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
  });

  return NextResponse.json(
    { success: true, data: customerPackages } as ApiResponse<typeof customerPackages>,
  );
}
