import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    inventoryItem: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  isDatabaseConfigured: vi.fn(() => true),
}));

import { DELETE, PUT } from '@/app/api/admin/inventory/[id]/route';

function makePutRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/inventory/item-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin inventory item route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await PUT(makePutRequest({ reorderLevel: 5 }), {
      params: Promise.resolve({ id: 'item-1' }),
    });

    expect(response.status).toBe(401);
  });

  it('updates inventory item details', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    prismaMock.inventoryItem.update.mockResolvedValue({
      id: 'item-1',
      reorderLevel: 7,
      reorderQuantity: 14,
      supplier: 'Acme Supply',
      notes: 'Keep this in dry storage',
      isActive: true,
    });

    const response = await PUT(
      makePutRequest({
        reorderLevel: 7,
        reorderQuantity: 14,
        supplier: 'Acme Supply',
        notes: 'Keep this in dry storage',
        isActive: true,
      }),
      { params: Promise.resolve({ id: 'item-1' }) },
    );

    expect(response.status).toBe(200);
    expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-1' },
        data: expect.objectContaining({ reorderLevel: 7, reorderQuantity: 14 }),
      }),
    );
  });

  it('deactivates an inventory item', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.inventoryItem.update.mockResolvedValue({ id: 'item-1', isActive: false });

    const response = await DELETE(new NextRequest('http://localhost/api/admin/inventory/item-1'), {
      params: Promise.resolve({ id: 'item-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { isActive: false },
    });
  });
});
