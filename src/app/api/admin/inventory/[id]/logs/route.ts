import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { inventoryLogSchema } from '@/lib/validations/inventory';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json()) as unknown;
  const parsed = inventoryLogSchema.safeParse({ ...(body as object), itemId: id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const quantityDelta = ['restock', 'adjustment'].includes(payload.changeType)
    ? Math.abs(payload.quantity)
    : -Math.abs(payload.quantity);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingItem = await tx.inventoryItem.findUnique({
        where: { id },
        select: { currentStock: true },
      });

      if (!existingItem) {
        throw new Error('Inventory item not found');
      }

      const nextStock = existingItem.currentStock + quantityDelta;
      if (nextStock < 0) {
        throw new Error('Insufficient stock for this adjustment');
      }

      const item = await tx.inventoryItem.update({
        where: { id },
        data: {
          currentStock: {
            increment: quantityDelta,
          },
        },
      });

      const log = await tx.inventoryLog.create({
        data: {
          itemId: id,
          changeType: payload.changeType,
          quantity: payload.quantity,
          performedBy: payload.performedBy,
          notes: payload.notes,
        },
      });

      return { item, log };
    });

    return NextResponse.json({ success: true, data: result } as ApiResponse<typeof result>);
  } catch (error) {
    if (error instanceof Error && error.message === 'Inventory item not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'Insufficient stock for this adjustment') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}