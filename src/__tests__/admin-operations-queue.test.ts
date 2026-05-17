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
    prismaMock.payment.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(10);
    expect(body.data.items.find((item: { id: string }) => item.id === 'failed_payments')?.count).toBe(5);
    expect(body.data.items.find((item: { id: string }) => item.id === 'pending_reminders')?.count).toBe(2);
    expect(body.data.items.find((item: { id: string }) => item.id === 'low_stock_items')?.count).toBe(1);
    expect(body.data.items.find((item: { id: string }) => item.id === 'expiring_packages')?.count).toBe(3);
    const disputeItem = body.data.items.find((item: { id: string }) => item.id === 'dispute_deadlines');
    expect(disputeItem?.capabilityBlocked).toBe(true);
    expect(disputeItem?.count).toBe(0);
  });
});
