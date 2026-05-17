import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { inventoryItemSchema } from '@/lib/validations/inventory';
import type { ApiResponse } from '@/types/admin';

export async function GET() {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] } as ApiResponse<unknown[]>);
    }

    const items = await prisma.inventoryItem.findMany({
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ currentStock: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: items } as ApiResponse<typeof items>);
  } catch (error) {
    console.error('Failed to load inventory', error);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
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
    const parsed = inventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const created = await prisma.inventoryItem.create({
      data: parsed.data,
    });

    return NextResponse.json(
      { success: true, data: created } as ApiResponse<typeof created>,
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create inventory item', error);
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}