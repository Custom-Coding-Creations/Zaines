import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    playGroup: {
      create: vi.fn(),
      findMany: vi.fn(),
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

import { POST } from '@/app/api/admin/play-groups/route';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/play-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin play groups route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(401);
  });

  it('rejects assigned staff without matching shift coverage', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffMember.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      schedules: [{ shiftStart: '12:00', shiftEnd: '16:00' }],
      playGroups: [],
    });

    const response = await POST(
      makeRequest({
        name: 'Morning Zoomies',
        date: '2026-05-16T00:00:00.000Z',
        timeSlot: '09:00-10:30',
        location: 'yard_a',
        maxCapacity: 8,
        sizeCategory: 'medium',
        energyLevel: 'high',
        staffMemberId: 'staff-1',
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain('not scheduled');
    expect(prismaMock.playGroup.create).not.toHaveBeenCalled();
  });

  it('rejects assigned staff with overlapping play-group conflict', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffMember.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      schedules: [{ shiftStart: '08:00', shiftEnd: '14:00' }],
      playGroups: [{ id: 'group-a', timeSlot: '09:30-10:30' }],
    });

    const response = await POST(
      makeRequest({
        name: 'Morning Zoomies',
        date: '2026-05-16T00:00:00.000Z',
        timeSlot: '10:00-11:00',
        location: 'yard_a',
        maxCapacity: 8,
        sizeCategory: 'medium',
        energyLevel: 'high',
        staffMemberId: 'staff-1',
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain('conflicting');
    expect(prismaMock.playGroup.create).not.toHaveBeenCalled();
  });

  it('creates play group when staff schedule and conflicts are valid', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffMember.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      schedules: [{ shiftStart: '08:00', shiftEnd: '14:00' }],
      playGroups: [{ id: 'group-a', timeSlot: '14:30-15:30' }],
    });
    prismaMock.playGroup.create.mockResolvedValue({ id: 'group-new', name: 'Morning Zoomies' });

    const response = await POST(
      makeRequest({
        name: 'Morning Zoomies',
        date: '2026-05-16T00:00:00.000Z',
        timeSlot: '10:00-11:00',
        location: 'yard_a',
        maxCapacity: 8,
        sizeCategory: 'medium',
        energyLevel: 'high',
        staffMemberId: 'staff-1',
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.playGroup.create).toHaveBeenCalledTimes(1);
  });

  it('accepts AM/PM formatted time slots for staff validation', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffMember.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      schedules: [{ shiftStart: '08:00', shiftEnd: '14:00' }],
      playGroups: [{ id: 'group-a', timeSlot: '2:30pm-3:30pm' }],
    });
    prismaMock.playGroup.create.mockResolvedValue({ id: 'group-new', name: 'Morning Zoomies' });

    const response = await POST(
      makeRequest({
        name: 'Morning Zoomies',
        date: '2026-05-16T00:00:00.000Z',
        timeSlot: '9:00am - 11:00am',
        location: 'yard_a',
        maxCapacity: 8,
        sizeCategory: 'medium',
        energyLevel: 'high',
        staffMemberId: 'staff-1',
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.playGroup.create).toHaveBeenCalledTimes(1);
  });
});
