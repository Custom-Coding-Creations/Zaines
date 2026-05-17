import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    staffSchedule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({ auth: authMock }));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  isDatabaseConfigured: vi.fn(() => true),
}));

import { DELETE, GET, POST, PUT } from '@/app/api/admin/staff/[id]/schedules/route';

describe('admin staff schedules route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(new NextRequest('http://localhost/api/admin/staff/staff-1/schedules'), {
      params: Promise.resolve({ id: 'staff-1' }),
    });
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(401);
  });

  it('creates a schedule for a staff member', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffSchedule.findFirst.mockResolvedValue(null);
    prismaMock.staffSchedule.create.mockResolvedValue({
      id: 'schedule-1',
      staffMemberId: 'staff-1',
      shiftStart: '08:00',
      shiftEnd: '12:00',
    });

    const response = await POST(
      new NextRequest('http://localhost/api/admin/staff/staff-1/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2026-05-16T00:00:00.000Z',
          shiftStart: '08:00',
          shiftEnd: '12:00',
          breakMinutes: 30,
        }),
      }),
      { params: Promise.resolve({ id: 'staff-1' }) },
    );
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(201);
    expect(prismaMock.staffSchedule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ staffMemberId: 'staff-1', shiftStart: '08:00', shiftEnd: '12:00' }),
      }),
    );
  });

  it('rejects overlapping schedule creation', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffSchedule.findFirst.mockResolvedValue({ id: 'schedule-existing' });

    const response = await POST(
      new NextRequest('http://localhost/api/admin/staff/staff-1/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2026-05-16T00:00:00.000Z',
          shiftStart: '09:00',
          shiftEnd: '11:00',
          breakMinutes: 15,
        }),
      }),
      { params: Promise.resolve({ id: 'staff-1' }) },
    );
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(409);
    expect(prismaMock.staffSchedule.create).not.toHaveBeenCalled();
  });

  it('updates a schedule when there is no overlap', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.staffSchedule.findUnique.mockResolvedValue({ id: 'schedule-1', staffMemberId: 'staff-1' });
    prismaMock.staffSchedule.findFirst.mockResolvedValue(null);
    prismaMock.staffSchedule.update.mockResolvedValue({ id: 'schedule-1', shiftStart: '10:00', shiftEnd: '14:00' });

    const response = await PUT(
      new NextRequest('http://localhost/api/admin/staff/staff-1/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: 'schedule-1',
          date: '2026-05-16T00:00:00.000Z',
          shiftStart: '10:00',
          shiftEnd: '14:00',
          breakMinutes: 20,
        }),
      }),
      { params: Promise.resolve({ id: 'staff-1' }) },
    );
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(200);
    expect(prismaMock.staffSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'schedule-1' },
        data: expect.objectContaining({ shiftStart: '10:00', shiftEnd: '14:00' }),
      }),
    );
  });

  it('deletes a schedule for the target staff member', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-admin', role: 'staff' } });
    prismaMock.staffSchedule.findUnique.mockResolvedValue({ id: 'schedule-1', staffMemberId: 'staff-1' });

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/staff/staff-1/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: 'schedule-1' }),
      }),
      { params: Promise.resolve({ id: 'staff-1' }) },
    );
    if (!response) throw new Error('Expected response');

    expect(response.status).toBe(200);
    expect(prismaMock.staffSchedule.delete).toHaveBeenCalledWith({ where: { id: 'schedule-1' } });
  });
});
