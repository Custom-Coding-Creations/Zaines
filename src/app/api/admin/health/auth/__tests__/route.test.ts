import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, isDatabaseConfiguredMock, getAuthRuntimeConfigMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  isDatabaseConfiguredMock: vi.fn(() => true),
  getAuthRuntimeConfigMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/prisma', () => ({
  isDatabaseConfigured: isDatabaseConfiguredMock,
}));

vi.mock('@/lib/auth/runtime-config', () => ({
  getAuthRuntimeConfig: getAuthRuntimeConfigMock,
}));

import { GET as getAuthHealth } from '@/app/api/admin/health/auth/route';

describe('GET /api/admin/health/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseConfiguredMock.mockReturnValue(true);
    getAuthRuntimeConfigMock.mockReturnValue({
      hasDatabase: true,
      hasAuthSecret: true,
      enablePasswordLogin: true,
      enableGuestFlow: true,
      sessionStrategy: 'database',
      useDatabaseSessions: true,
    });
  });

  it('returns ready when auth probe succeeds', async () => {
    authMock.mockResolvedValue({ user: { id: 'staff-1', role: 'staff' } });

    const response = await getAuthHealth();
    expect(response.status).toBe(200);

    const body = (await response.json()) as { code?: string; status?: string };
    expect(body.code).toBe('ADMIN_AUTH_READY');
    expect(body.status).toBe('ok');
  });

  it('returns ready when probe fails due to invalid session token', async () => {
    authMock.mockRejectedValue({ type: 'SessionTokenError' });

    const response = await getAuthHealth();
    expect(response.status).toBe(200);

    const body = (await response.json()) as { code?: string; checks?: { authProbe?: { kind?: string } } };
    expect(body.code).toBe('ADMIN_AUTH_READY');
    expect(body.checks?.authProbe?.kind).toBe('invalid_session');
  });

  it('returns misconfigured when auth secret is missing', async () => {
    getAuthRuntimeConfigMock.mockReturnValue({
      hasDatabase: true,
      hasAuthSecret: false,
      enablePasswordLogin: true,
      enableGuestFlow: true,
      sessionStrategy: 'database',
      useDatabaseSessions: true,
    });
    authMock.mockResolvedValue(null);

    const response = await getAuthHealth();
    expect(response.status).toBe(500);

    const body = (await response.json()) as { code?: string; status?: string };
    expect(body.code).toBe('ADMIN_AUTH_MISCONFIGURED');
    expect(body.status).toBe('misconfigured');
  });

  it('returns misconfigured when database sessions are enabled without database', async () => {
    isDatabaseConfiguredMock.mockReturnValue(false);
    getAuthRuntimeConfigMock.mockReturnValue({
      hasDatabase: false,
      hasAuthSecret: true,
      enablePasswordLogin: true,
      enableGuestFlow: true,
      sessionStrategy: 'database',
      useDatabaseSessions: true,
    });
    authMock.mockResolvedValue(null);

    const response = await getAuthHealth();
    expect(response.status).toBe(500);

    const body = (await response.json()) as { code?: string; status?: string };
    expect(body.code).toBe('ADMIN_AUTH_DATABASE_REQUIRED');
    expect(body.status).toBe('misconfigured');
  });

  it('returns degraded when auth probe is unavailable', async () => {
    authMock.mockRejectedValue(new Error('backend down'));

    const response = await getAuthHealth();
    expect(response.status).toBe(503);

    const body = (await response.json()) as { code?: string; status?: string };
    expect(body.code).toBe('ADMIN_AUTH_UNAVAILABLE');
    expect(body.status).toBe('degraded');
  });
});
