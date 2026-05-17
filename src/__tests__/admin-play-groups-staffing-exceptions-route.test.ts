import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    playGroup: {
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

import { GET } from '@/app/api/admin/play-groups/staffing-exceptions/route';

describe('admin play groups staffing exceptions route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(new NextRequest('http://localhost/api/admin/play-groups/staffing-exceptions'));

    expect(response.status).toBe(401);
  });

  it('returns staffing exceptions and summary counts', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-unassigned',
        name: 'No Lead',
        date: new Date('2026-05-16T00:00:00.000Z'),
        timeSlot: '09:00-10:00',
        staffMemberId: null,
        staffMember: null,
      },
      {
        id: 'group-invalid-slot',
        name: 'Bad Slot',
        date: new Date('2026-05-16T00:00:00.000Z'),
        timeSlot: 'invalid slot',
        staffMemberId: 'staff-1',
        staffMember: {
          user: { name: 'Alex', email: 'alex@example.com' },
          schedules: [{ shiftStart: '08:00', shiftEnd: '17:00' }],
        },
      },
      {
        id: 'group-unscheduled',
        name: 'No Shift Coverage',
        date: new Date('2026-05-16T00:00:00.000Z'),
        timeSlot: '10:00-11:00',
        staffMemberId: 'staff-2',
        staffMember: {
          user: { name: 'Sam', email: 'sam@example.com' },
          schedules: [{ shiftStart: '12:00', shiftEnd: '16:00' }],
        },
      },
      {
        id: 'group-overlap-a',
        name: 'Overlap A',
        date: new Date('2026-05-16T00:00:00.000Z'),
        timeSlot: '13:00-14:30',
        staffMemberId: 'staff-3',
        staffMember: {
          user: { name: 'Jordan', email: 'jordan@example.com' },
          schedules: [{ shiftStart: '08:00', shiftEnd: '18:00' }],
        },
      },
      {
        id: 'group-overlap-b',
        name: 'Overlap B',
        date: new Date('2026-05-16T00:00:00.000Z'),
        timeSlot: '14:00-15:00',
        staffMemberId: 'staff-3',
        staffMember: {
          user: { name: 'Jordan', email: 'jordan@example.com' },
          schedules: [{ shiftStart: '08:00', shiftEnd: '18:00' }],
        },
      },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/admin/play-groups/staffing-exceptions?date=2026-05-16'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.summary.total).toBe(5);
    expect(payload.data.summary.unassigned).toBe(1);
    expect(payload.data.summary.invalidTimeSlot).toBe(1);
    expect(payload.data.summary.withoutShiftCoverage).toBe(1);
    expect(payload.data.summary.overlapConflicts).toBe(2);

    const invalidSlot = payload.data.items.find((item: { groupId: string }) => item.groupId === 'group-invalid-slot');
    expect(invalidSlot.canAutoFix).toBe(false);
    expect(invalidSlot.recommendedAction).toContain('Correct time slot format');

    const unassigned = payload.data.items.find((item: { groupId: string }) => item.groupId === 'group-unassigned');
    expect(unassigned.canAutoFix).toBe(true);
    expect(unassigned.recommendedAction).toContain('auto-assign recommendation');
  });
});
