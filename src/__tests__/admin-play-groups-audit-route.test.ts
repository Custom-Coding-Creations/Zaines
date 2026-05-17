import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    message: {
      findMany: vi.fn(),
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

import { GET } from '@/app/api/admin/play-groups/audit/route';
import { PLAY_GROUP_AUDIT_PREFIX } from '@/lib/api/play-group-audit';

describe('admin play groups audit route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(new NextRequest('http://localhost/api/admin/play-groups/audit'));

    expect(response.status).toBe(401);
  });

  it('returns parsed audit events', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.message.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        senderName: 'Admin One',
        sentAt: new Date('2026-05-16T12:00:00.000Z'),
        content: `${PLAY_GROUP_AUDIT_PREFIX}${JSON.stringify({
          eventType: 'STAFF_ASSIGNED',
          playGroupId: 'group-1',
          staffMemberId: 'staff-1',
          metadata: { source: 'manual_reassignment' },
          timestamp: '2026-05-16T12:00:00.000Z',
        })}`,
      },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/admin/play-groups/audit?limit=10'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].payload.eventType).toBe('STAFF_ASSIGNED');
  });
});
