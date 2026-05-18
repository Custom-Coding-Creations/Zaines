import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userFindUniqueMock,
  userFindFirstMock,
  passwordCredentialFindUniqueMock,
  passwordCredentialUpdateMock,
  verifyPasswordMock,
  mockCredentialsProvider,
  logSecurityEventMock,
} = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  passwordCredentialFindUniqueMock: vi.fn(),
  passwordCredentialUpdateMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  mockCredentialsProvider: vi.fn((config: unknown) => config),
  logSecurityEventMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn((config: unknown) => config),
}));

vi.mock("next-auth/providers/facebook", () => ({
  default: vi.fn((config: unknown) => config),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: mockCredentialsProvider,
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock,
      findFirst: userFindFirstMock,
    },
    passwordCredential: {
      findUnique: passwordCredentialFindUniqueMock,
      update: passwordCredentialUpdateMock,
    },
  },
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: verifyPasswordMock,
}));

vi.mock("@/lib/security/logging", () => ({
  logSecurityEvent: logSecurityEventMock,
}));

import { authConfig } from "@/lib/auth";

type CredentialsProviderConfig = {
  id?: string;
  authorize?: (credentials: Record<string, unknown>) => Promise<unknown>;
};

function getCredentialsAuthorize() {
  const providers = (authConfig.providers ?? []) as CredentialsProviderConfig[];
  const credentialsProvider = providers.find((provider) => provider.id === "credentials");
  if (!credentialsProvider?.authorize) {
    throw new Error("Credentials authorize callback is not configured");
  }
  return credentialsProvider.authorize;
}

describe("credentials authorize lockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      role: "customer",
    });
    userFindFirstMock.mockResolvedValue(null);
    verifyPasswordMock.mockReturnValue(false);
    passwordCredentialUpdateMock.mockResolvedValue({ id: "cred-1" });
  });

  it("falls back to case-insensitive email lookup when normalized lookup misses", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    userFindFirstMock.mockResolvedValueOnce({
      id: "user-1",
      email: "User@Example.com",
      name: "User",
      role: "customer",
    });
    passwordCredentialFindUniqueMock.mockResolvedValueOnce({
      passwordHash: "stored-hash",
      lockedUntil: null,
      failedAttempts: 0,
    });
    verifyPasswordMock.mockReturnValueOnce(true);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({
      email: "user@example.com",
      password: "CorrectPassword123!",
    });

    expect(userFindFirstMock).toHaveBeenCalledWith({
      where: {
        email: {
          equals: "user@example.com",
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    expect(logSecurityEventMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: "credentials-user-missing" }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: "user-1",
        email: "User@Example.com",
      }),
    );
  });

  it("increments failed attempts without lock before threshold", async () => {
    passwordCredentialFindUniqueMock.mockResolvedValueOnce({
      passwordHash: "stored-hash",
      lockedUntil: null,
      failedAttempts: 2,
    });

    const authorize = getCredentialsAuthorize();
    const result = await authorize({
      email: "user@example.com",
      password: "WrongPassword123!",
    });

    expect(result).toBeNull();
    expect(passwordCredentialUpdateMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        failedAttempts: { increment: 1 },
      },
    });
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AUTH_CREDENTIALS_LOGIN_FAILED",
        correlationId: "credentials-password-invalid",
        level: "warn",
        context: {
          failedAttempts: 3,
        },
      }),
    );
  });

  it("locks account when failed attempts reaches threshold", async () => {
    passwordCredentialFindUniqueMock.mockResolvedValueOnce({
      passwordHash: "stored-hash",
      lockedUntil: null,
      failedAttempts: 4,
    });

    const authorize = getCredentialsAuthorize();
    const result = await authorize({
      email: "user@example.com",
      password: "WrongPassword123!",
    });

    expect(result).toBeNull();
    expect(passwordCredentialUpdateMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        failedAttempts: { increment: 1 },
        lockedUntil: expect.any(Date),
      },
    });

    const lockArg = passwordCredentialUpdateMock.mock.calls[0]?.[0]?.data?.lockedUntil;
    expect(lockArg).toBeInstanceOf(Date);
    expect((lockArg as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it("denies login when account lock is still active", async () => {
    passwordCredentialFindUniqueMock.mockResolvedValueOnce({
      passwordHash: "stored-hash",
      lockedUntil: new Date(Date.now() + 15 * 60_000),
      failedAttempts: 5,
    });

    const authorize = getCredentialsAuthorize();
    const result = await authorize({
      email: "user@example.com",
      password: "CorrectPassword123!",
    });

    expect(result).toBeNull();
    expect(verifyPasswordMock).not.toHaveBeenCalled();
    expect(passwordCredentialUpdateMock).not.toHaveBeenCalled();
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AUTH_CREDENTIALS_LOCKED",
        correlationId: "credentials-account-locked",
        level: "warn",
      }),
    );
  });

  it("resets failed attempts and clears lock on successful login", async () => {
    passwordCredentialFindUniqueMock.mockResolvedValueOnce({
      passwordHash: "stored-hash",
      lockedUntil: new Date(Date.now() - 60_000),
      failedAttempts: 3,
    });
    verifyPasswordMock.mockReturnValueOnce(true);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({
      email: "user@example.com",
      password: "CorrectPassword123!",
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "customer",
      }),
    );
    expect(passwordCredentialUpdateMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  });

  it("logs and denies when user does not exist", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({
      email: "missing@example.com",
      password: "WrongPassword123!",
    });

    expect(result).toBeNull();
    expect(passwordCredentialFindUniqueMock).not.toHaveBeenCalled();
    expect(passwordCredentialUpdateMock).not.toHaveBeenCalled();
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AUTH_CREDENTIALS_LOGIN_FAILED",
        correlationId: "credentials-user-missing",
        level: "warn",
      }),
    );
  });

  it("logs and denies when password credential record is missing", async () => {
    passwordCredentialFindUniqueMock.mockResolvedValueOnce(null);

    const authorize = getCredentialsAuthorize();
    const result = await authorize({
      email: "user@example.com",
      password: "WrongPassword123!",
    });

    expect(result).toBeNull();
    expect(verifyPasswordMock).not.toHaveBeenCalled();
    expect(passwordCredentialUpdateMock).not.toHaveBeenCalled();
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AUTH_CREDENTIALS_LOGIN_FAILED",
        correlationId: "credentials-password-missing",
        level: "warn",
      }),
    );
  });
});
