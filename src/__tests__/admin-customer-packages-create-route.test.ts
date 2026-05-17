import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock, appendPackageAuditEventMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  appendPackageAuditEventMock: vi.fn(async () => undefined),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
    bookingPackage: {
      findUnique: vi.fn(),
    },
    customerPackage: {
      create: vi.fn(),
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

vi.mock('@/lib/api/package-audit', () => ({
  appendPackageAuditEvent: appendPackageAuditEventMock,
}));

import { POST } from '@/app/api/admin/customer-packages/route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/customer-packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/customer-packages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ email: 'morgan@example.com', packageId: 'pkg-1' }));

    expect(response.status).toBe(401);
  });

  it('creates a customer package assignment for a staff user', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Morgan Lee',
      email: 'morgan@example.com',
    });
    prismaMock.bookingPackage.findUnique.mockResolvedValue({
      id: 'pkg-1',
      name: '10 Daycare Visits',
      totalSessions: 10,
      validDays: 90,
    });
    prismaMock.customerPackage.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'customer-package-1',
      ...data,
      package: {
        id: 'pkg-1',
        name: '10 Daycare Visits',
        totalSessions: 10,
        validDays: 90,
      },
      user: {
        id: 'user-1',
        name: 'Morgan Lee',
        email: 'morgan@example.com',
      },
    }));

    const response = await POST(makeRequest({ email: 'morgan@example.com', packageId: 'pkg-1' }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(prismaMock.customerPackage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          packageId: 'pkg-1',
          sessionsRemaining: 10,
          status: 'active',
        }),
      }),
    );
    expect(payload.data.package.name).toBe('10 Daycare Visits');
    expect(appendPackageAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PACKAGE_GRANTED',
        customerPackageId: 'customer-package-1',
      }),
    );
  });

  it('returns 404 when the customer email does not match an account', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.bookingPackage.findUnique.mockResolvedValue({ id: 'pkg-1', totalSessions: 10, validDays: 90 });

    const response = await POST(makeRequest({ email: 'missing@example.com', packageId: 'pkg-1' }));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Customer account not found for that email');
  });
});