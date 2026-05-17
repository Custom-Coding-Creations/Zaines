import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  generateAutomatedRemindersMock,
  dispatchDueAutomatedRemindersMock,
  logSecurityEventMock,
} = vi.hoisted(() => ({
  generateAutomatedRemindersMock: vi.fn(),
  dispatchDueAutomatedRemindersMock: vi.fn(),
  logSecurityEventMock: vi.fn(),
}));

vi.mock('@/lib/reminders', () => ({
  generateAutomatedReminders: generateAutomatedRemindersMock,
  dispatchDueAutomatedReminders: dispatchDueAutomatedRemindersMock,
}));

vi.mock('@/lib/security/logging', () => ({
  logSecurityEvent: logSecurityEventMock,
}));

import { GET } from '@/app/api/cron/reminders/route';

function makeRequest(secret?: string) {
  return new NextRequest('http://localhost/api/cron/reminders', {
    method: 'GET',
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

describe('GET /api/cron/reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('returns 401 when the cron secret is missing', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('runs reminder generation and dispatch when authorized', async () => {
    generateAutomatedRemindersMock.mockResolvedValue({ generated: 4 });
    dispatchDueAutomatedRemindersMock.mockResolvedValue({ dispatched: 3, queued: 1 });

    const res = await GET(makeRequest('test-cron-secret'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ generated: 4, dispatched: 3, queued: 1 });
    expect(generateAutomatedRemindersMock).toHaveBeenCalledTimes(1);
    expect(dispatchDueAutomatedRemindersMock).toHaveBeenCalledWith(100);
    expect(logSecurityEventMock).toHaveBeenCalledTimes(1);
  });
});
