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
      findUnique: vi.fn(),
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

import { PUT } from '@/app/api/admin/play-groups/[id]/staff/route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/play-groups/group-1/staff', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin play groups staff route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.playGroup.findUnique.mockResolvedValue({
      id: 'group-1',
      date: new Date('2026-05-16T00:00:00.000Z'),
      timeSlot: '09:00-11:00',
    });
  });

  it('returns 401 without session', async () => {
    authMock.mockResolvedValue(null);

    const response = await PUT(makeRequest({ staffMemberId: 'staff-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });

    expect(response.status).toBe(401);
  });

  it('rejects reassignment when staff has no shift coverage', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffMember.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      schedules: [{ shiftStart: '12:00', shiftEnd: '16:00' }],
      playGroups: [],
    });

    const response = await PUT(makeRequest({ staffMemberId: 'staff-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain('not scheduled');
    expect(prismaMock.playGroup.update).not.toHaveBeenCalled();
  });

  it('rejects reassignment when staff has overlapping group conflict', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffMember.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      schedules: [{ shiftStart: '08:00', shiftEnd: '14:00' }],
      playGroups: [{ id: 'group-2', timeSlot: '10:00-12:00' }],
    });

    const response = await PUT(makeRequest({ staffMemberId: 'staff-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain('conflicting');
    expect(prismaMock.playGroup.update).not.toHaveBeenCalled();
  });

  it('reassigns staff when schedule and conflicts pass validation', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffMember.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      schedules: [{ shiftStart: '08:00', shiftEnd: '14:00' }],
      playGroups: [{ id: 'group-3', timeSlot: '14:00-15:00' }],
    });
    prismaMock.playGroup.update.mockResolvedValue({
      id: 'group-1',
      staffMember: {
        id: 'staff-1',
        user: { id: 'u1', name: 'Alex', email: 'alex@example.com' },
      },
    });

    const response = await PUT(makeRequest({ staffMemberId: 'staff-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.playGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group-1' },
        data: { staffMemberId: 'staff-1' },
      }),
    );
  });

  it('supports unassigning a staff lead', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.update.mockResolvedValue({ id: 'group-1', staffMember: null });

    const response = await PUT(makeRequest({ staffMemberId: null }), {
      params: Promise.resolve({ id: 'group-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.playGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group-1' },
        data: { staffMemberId: null },
      }),
    );
  });
});
