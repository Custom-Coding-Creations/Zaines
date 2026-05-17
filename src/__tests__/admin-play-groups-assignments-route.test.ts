import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    playGroup: {
      findUnique: vi.fn(),
    },
    playGroupAssignment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
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

import { DELETE, POST } from '@/app/api/admin/play-groups/[id]/assignments/route';

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/play-groups/group-1/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/play-groups/group-1/assignments', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin play group assignments route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(makePostRequest({ petId: 'pet-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });

    expect(response.status).toBe(401);
  });

  it('returns 409 when group capacity is full', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    prismaMock.playGroup.findUnique.mockResolvedValue({
      id: 'group-1',
      maxCapacity: 1,
      assignments: [{ id: 'a-1', petId: 'pet-2' }],
    });

    const response = await POST(makePostRequest({ petId: 'pet-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('Play group is at full capacity');
  });

  it('creates assignment when capacity is available', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findUnique.mockResolvedValue({
      id: 'group-1',
      maxCapacity: 3,
      assignments: [{ id: 'a-1', petId: 'pet-2' }],
    });
    prismaMock.playGroupAssignment.create.mockResolvedValue({
      id: 'assignment-1',
      pet: { id: 'pet-1', name: 'Scout', breed: 'Lab', weight: 48 },
      booking: { id: 'booking-1', bookingNumber: 'PB-0001' },
    });

    const response = await POST(
      makePostRequest({ petId: 'pet-1', bookingId: 'booking-1' }),
      { params: Promise.resolve({ id: 'group-1' }) },
    );

    expect(response.status).toBe(201);
    expect(prismaMock.playGroupAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ playGroupId: 'group-1', petId: 'pet-1' }),
      }),
    );
  });

  it('deletes assignment for the group', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    prismaMock.playGroupAssignment.findUnique.mockResolvedValue({ id: 'assignment-1', playGroupId: 'group-1' });

    const response = await DELETE(makeDeleteRequest({ assignmentId: 'assignment-1' }), {
      params: Promise.resolve({ id: 'group-1' }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.playGroupAssignment.delete).toHaveBeenCalledWith({ where: { id: 'assignment-1' } });
  });
});
