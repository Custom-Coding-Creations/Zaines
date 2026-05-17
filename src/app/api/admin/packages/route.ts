import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { bookingPackageSchema } from '@/lib/validations/package';
import type { ApiResponse } from '@/types/admin';

export async function GET() {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
    }

    const packages = await prisma.bookingPackage.findMany({
      include: {
        customerPackages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { purchaseDate: 'desc' },
          take: 25,
        },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: packages } as ApiResponse<typeof packages>);
  } catch (error) {
    console.error('Failed to load packages', error);
    return NextResponse.json({ error: 'Failed to load packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = (await request.json()) as unknown;
    const parsed = bookingPackageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const created = await prisma.bookingPackage.create({ data: parsed.data });

    return NextResponse.json(
      { success: true, data: created } as ApiResponse<typeof created>,
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create package', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
