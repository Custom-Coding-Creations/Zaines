import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  isDatabaseConfiguredMock,
  prismaMock,
  getAdminSettingsMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  isDatabaseConfiguredMock: vi.fn(() => true),
  prismaMock: {
    booking: { count: vi.fn() },
    message: { count: vi.fn() },
    payment: { count: vi.fn() },
    automatedReminder: { count: vi.fn() },
    inventoryItem: { count: vi.fn(), fields: { reorderLevel: 'reorderLevel' } },
    customerPackage: { count: vi.fn() },
    playGroup: { count: vi.fn(), findMany: vi.fn() },
    staffMember: { count: vi.fn() },
    staffSchedule: { findMany: vi.fn() },
  },
  getAdminSettingsMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/prisma', () => ({
  isDatabaseConfigured: isDatabaseConfiguredMock,
  prisma: prismaMock,
}));

vi.mock('@/lib/api/admin-settings', () => ({
  getAdminSettings: getAdminSettingsMock,
}));

import { GET } from '@/app/api/admin/operations/queue/route';

describe('GET /api/admin/operations/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseConfiguredMock.mockReturnValue(true);
  });

  it('returns 401 without session', async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns queue data for staff', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });
    getAdminSettingsMock.mockResolvedValue({
      stripeCapabilityFlags: {
        disputesEnabled: false,
      },
    });

    prismaMock.booking.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    prismaMock.message.count.mockResolvedValueOnce(4);
    prismaMock.automatedReminder.count.mockResolvedValueOnce(2);
    prismaMock.inventoryItem.count.mockResolvedValueOnce(1);
    prismaMock.customerPackage.count.mockResolvedValueOnce(3);
    prismaMock.playGroup.count.mockResolvedValueOnce(2);
    prismaMock.playGroup.findMany.mockResolvedValueOnce([
      {
        id: 'group-1',
        timeSlot: '09:00-11:00',
        staffMember: {
          id: 'staff-1',
          schedules: [{ shiftStart: '12:00', shiftEnd: '16:00' }],
        },
      },
      {
        id: 'group-2',
        timeSlot: '13:00-14:00',
        staffMember: {
          id: 'staff-2',
          schedules: [{ shiftStart: '12:00', shiftEnd: '16:00' }],
        },
      },
    ]);
    prismaMock.staffMember.count.mockResolvedValueOnce(4);
    prismaMock.staffSchedule.findMany.mockResolvedValueOnce([
      { staffMemberId: 'staff-1', shiftStart: '08:00', shiftEnd: '11:00' },
      { staffMemberId: 'staff-1', shiftStart: '10:30', shiftEnd: '13:00' },
      { staffMemberId: 'staff-2', shiftStart: '12:00', shiftEnd: '16:00' },
    ]);
    prismaMock.payment.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(14);
    expect(body.data.items.find((item: { id: string }) => item.id === 'failed_payments')?.count).toBe(5);
    expect(body.data.items.find((item: { id: string }) => item.id === 'pending_reminders')?.count).toBe(2);
    expect(body.data.items.find((item: { id: string }) => item.id === 'low_stock_items')?.count).toBe(1);
    expect(body.data.items.find((item: { id: string }) => item.id === 'expiring_packages')?.count).toBe(3);
    expect(body.data.items.find((item: { id: string }) => item.id === 'unassigned_play_groups')?.count).toBe(2);
    expect(body.data.items.find((item: { id: string }) => item.id === 'unscheduled_staff_today')?.count).toBe(4);
    expect(body.data.items.find((item: { id: string }) => item.id === 'staffed_groups_without_shift')?.count).toBe(1);
    expect(body.data.items.find((item: { id: string }) => item.id === 'overlapping_staff_shifts')?.count).toBe(1);
    const disputeItem = body.data.items.find((item: { id: string }) => item.id === 'dispute_deadlines');
    expect(disputeItem?.capabilityBlocked).toBe(true);
    expect(disputeItem?.count).toBe(0);
  });
});
