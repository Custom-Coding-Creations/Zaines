import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, getAdminSettingsMock, prismaMock, appendPackageAuditEventMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getAdminSettingsMock: vi.fn(),
  appendPackageAuditEventMock: vi.fn(async () => undefined),
  prismaMock: {
    customerPackage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/api/admin-settings', () => ({
  getAdminSettings: getAdminSettingsMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/api/package-audit', () => ({
  appendPackageAuditEvent: appendPackageAuditEventMock,
}));

import { PATCH } from '@/app/api/admin/customer-packages/[id]/route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/customer-packages/customer-package-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/customer-packages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminSettingsMock.mockResolvedValue({
      packageExpirationSettings: {
        autoForfeitUnusedSessions: true,
        allowAdminManualExtension: true,
        defaultExtensionDays: 7,
      },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ extensionDays: 7 }), {
      params: Promise.resolve({ id: 'customer-package-1' }),
    });

    expect(response.status).toBe(401);
  });

  it('applies extension and session adjustments for staff', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    prismaMock.customerPackage.findUnique.mockResolvedValue({
      id: 'customer-package-1',
      expiresAt: new Date('2026-06-01T00:00:00.000Z'),
      sessionsRemaining: 3,
      sessionsUsed: 7,
      status: 'active',
      package: { type: 'daycare_pass' },
      user: { id: 'user-1', name: 'Morgan Lee', email: 'morgan@example.com' },
    });
    prismaMock.customerPackage.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'customer-package-1',
      ...data,
      package: { type: 'daycare_pass' },
      user: { id: 'user-1', name: 'Morgan Lee', email: 'morgan@example.com' },
    }));

    const response = await PATCH(makeRequest({ extensionDays: 5, sessionAdjustment: 2 }), {
      params: Promise.resolve({ id: 'customer-package-1' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.customerPackage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer-package-1' },
        data: expect.objectContaining({
          sessionsRemaining: 5,
          sessionsUsed: 7,
          status: 'active',
        }),
      }),
    );
    expect(appendPackageAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PACKAGE_UPDATED',
        customerPackageId: 'customer-package-1',
      }),
    );
    expect(new Date(payload.data.expiresAt).toISOString()).toBe('2026-06-06T00:00:00.000Z');
  });

  it('blocks manual extension when disabled by settings', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    getAdminSettingsMock.mockResolvedValue({
      packageExpirationSettings: {
        autoForfeitUnusedSessions: true,
        allowAdminManualExtension: false,
        defaultExtensionDays: 7,
      },
    });
    prismaMock.customerPackage.findUnique.mockResolvedValue({
      id: 'customer-package-1',
      expiresAt: new Date('2026-06-01T00:00:00.000Z'),
      sessionsRemaining: 3,
      sessionsUsed: 7,
      status: 'active',
      package: { type: 'daycare_pass' },
      user: { id: 'user-1', name: 'Morgan Lee', email: 'morgan@example.com' },
    });

    const response = await PATCH(makeRequest({ extensionDays: 5 }), {
      params: Promise.resolve({ id: 'customer-package-1' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('Manual package extensions are disabled');
  });
});