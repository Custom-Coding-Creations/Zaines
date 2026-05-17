import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  isDatabaseConfigured: vi.fn(() => true),
}));

import { POST } from '@/app/api/admin/inventory/[id]/logs/route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/inventory/item-1/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin inventory logs route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ changeType: 'used', quantity: 1 }), {
      params: Promise.resolve({ id: 'item-1' }),
    });

    expect(response.status).toBe(401);
  });

  it('returns 400 when usage adjustment would drop stock below zero', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        inventoryItem: {
          findUnique: vi.fn(async () => ({ currentStock: 1 })),
          update: vi.fn(),
        },
        inventoryLog: {
          create: vi.fn(),
        },
      }),
    );

    const response = await POST(makeRequest({ changeType: 'used', quantity: 2 }), {
      params: Promise.resolve({ id: 'item-1' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Insufficient stock for this adjustment');
  });
});
