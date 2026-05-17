import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    playGroup: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    staffMember: {
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

import { GET, POST } from '@/app/api/admin/play-groups/[id]/staff-recommendations/route';

function makeAssignRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/play-groups/group-1/staff-recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin play group staff recommendations route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.playGroup.findUnique.mockResolvedValue({
      id: 'group-1',
      date: new Date('2026-05-16T00:00:00.000Z'),
      timeSlot: '09:00-11:00',
      energyLevel: 'high',
    });

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        user: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
        schedules: [{ id: 's1', shiftStart: '08:00', shiftEnd: '12:00' }],
        playGroups: [{ id: 'pg-a', timeSlot: '07:00-08:00' }],
      },
      {
        id: 'staff-2',
        role: 'groomer',
        certifications: [],
        user: { id: 'u2', name: 'Sam', email: 'sam@example.com' },
        schedules: [{ id: 's2', shiftStart: '13:00', shiftEnd: '18:00' }],
        playGroups: [{ id: 'pg-b', timeSlot: '14:00-15:00' }],
      },
    ]);
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(new NextRequest('http://localhost/api/admin/play-groups/group-1/staff-recommendations'), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(401);
  });

  it('returns recommendations sorted by score', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-user', role: 'staff' } });

    const response = await GET(new NextRequest('http://localhost/api/admin/play-groups/group-1/staff-recommendations'), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    if (!response) throw new Error('Expected response');
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.recommendations[0].staffMember.id).toBe('staff-1');
    expect(payload.data.recommendations[0].score).toBeGreaterThan(payload.data.recommendations[1].score);
  });

  it('auto-assigns top recommendation', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-user', role: 'admin' } });
    prismaMock.playGroup.update.mockResolvedValue({
      id: 'group-1',
      staffMember: {
        id: 'staff-1',
        user: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
      },
    });

    const response = await POST(makeAssignRequest({}), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(200);
    expect(prismaMock.playGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group-1' },
        data: { staffMemberId: 'staff-1' },
      }),
    );
  });

  it('allows selecting an explicit recommended staff member', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-user', role: 'admin' } });
    prismaMock.playGroup.update.mockResolvedValue({
      id: 'group-1',
      staffMember: {
        id: 'staff-2',
        user: { id: 'u2', name: 'Sam', email: 'sam@example.com' },
      },
    });

    const response = await POST(makeAssignRequest({ staffMemberId: 'staff-2' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(200);
    expect(prismaMock.playGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group-1' },
        data: { staffMemberId: 'staff-2' },
      }),
    );
  });

  it('blocks assignment when selected staff has overlapping play group time conflict', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-user', role: 'admin' } });
    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        user: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
        schedules: [{ id: 's1', shiftStart: '08:00', shiftEnd: '12:00' }],
        playGroups: [{ id: 'pg-overlap', timeSlot: '10:00-12:00' }],
      },
    ]);

    const response = await POST(makeAssignRequest({ staffMemberId: 'staff-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    if (!response) throw new Error('Expected response');
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain('conflicting play group assignment');
    expect(prismaMock.playGroup.update).not.toHaveBeenCalled();
  });
});
