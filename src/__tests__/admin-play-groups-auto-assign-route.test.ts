import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    playGroup: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    staffMember: {
      findMany: vi.fn(),
    },
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

import { POST } from '@/app/api/admin/play-groups/auto-assign/route';

describe('admin play groups auto-assign route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it('returns 401 without session', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(401);
  });

  it('auto-assigns unassigned groups when suitable staff is available', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'Morning A',
        timeSlot: '09:00-10:00',
        energyLevel: 'moderate',
        staffMemberId: null,
      },
      {
        id: 'group-2',
        name: 'Morning B',
        timeSlot: '10:30-11:30',
        energyLevel: 'high',
        staffMemberId: null,
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        schedules: [{ shiftStart: '08:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
      {
        id: 'staff-2',
        role: 'groomer',
        certifications: [],
        schedules: [{ shiftStart: '12:00', shiftEnd: '17:00' }],
        playGroups: [],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-05-16T00:00:00.000Z' }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.assigned).toBe(2);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('skips groups when no suitable staff recommendation is available', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'Morning A',
        timeSlot: '09:00-10:00',
        energyLevel: 'moderate',
        staffMemberId: null,
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: [],
        schedules: [{ shiftStart: '12:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-05-16T00:00:00.000Z' }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.assigned).toBe(0);
    expect(payload.data.skipped).toHaveLength(1);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
