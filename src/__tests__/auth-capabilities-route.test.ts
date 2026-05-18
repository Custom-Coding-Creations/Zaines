import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isDatabaseConfiguredMock,
  passwordCredentialFindFirstMock,
  queryRawUnsafeMock,
} = vi.hoisted(() => ({
  isDatabaseConfiguredMock: vi.fn(),
  passwordCredentialFindFirstMock: vi.fn(),
  queryRawUnsafeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordCredential: {
      findFirst: passwordCredentialFindFirstMock,
    },
    $queryRawUnsafe: queryRawUnsafeMock,
  },
  isDatabaseConfigured: isDatabaseConfiguredMock,
}));

import { GET } from "@/app/api/auth/capabilities/route";

type Capability = {
  id: string;
  enabled: boolean;
  reasonDisabled?: string;
};

const originalEnv = { ...process.env };

describe("auth capabilities route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    passwordCredentialFindFirstMock.mockResolvedValue({ id: "cred-1" });
    queryRawUnsafeMock.mockImplementation(async (_query: string, tableName: string) => {
      if (tableName === "users") {
        return [
          { column_name: "id" },
          { column_name: "email" },
          { column_name: "emailVerified" },
          { column_name: "name" },
          { column_name: "image" },
          { column_name: "role" },
        ];
      }
      if (tableName === "accounts") {
        return [
          { column_name: "id" },
          { column_name: "userId" },
          { column_name: "type" },
          { column_name: "provider" },
          { column_name: "providerAccountId" },
          { column_name: "refresh_token" },
          { column_name: "access_token" },
          { column_name: "expires_at" },
          { column_name: "token_type" },
          { column_name: "scope" },
          { column_name: "id_token" },
          { column_name: "session_state" },
        ];
      }
      if (tableName === "sessions") {
        return [
          { column_name: "id" },
          { column_name: "sessionToken" },
          { column_name: "userId" },
          { column_name: "expires" },
        ];
      }
      return [];
    });
    process.env = { ...originalEnv };
    process.env.AUTH_SECRET = "test-auth-secret";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
    delete process.env.AUTH_ENABLE_PASSWORD_LOGIN;
    delete process.env.AUTH_ENABLE_GUEST_FLOW;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns capabilities payload with expected defaults", async () => {
    isDatabaseConfiguredMock.mockReturnValueOnce(true);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.capabilities)).toBe(true);
    expect(typeof body.generatedAt).toBe("string");
    expect(body.authOperational).toBe(true);
    expect(body.authIssues).toEqual([]);

    const byId = new Map<string, Capability>(
      (body.capabilities as Capability[]).map((capability) => [
        capability.id,
        capability,
      ]),
    );

    expect(byId.get("credentials")?.enabled).toBe(true);
    expect(byId.get("guest")?.enabled).toBe(true);
  });

  it("reflects configured providers and disabled feature flags", async () => {
    isDatabaseConfiguredMock.mockReturnValueOnce(true);
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.AUTH_ENABLE_PASSWORD_LOGIN = "false";
    process.env.AUTH_ENABLE_GUEST_FLOW = "false";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);

    const byId = new Map<string, Capability>(
      (body.capabilities as Capability[]).map((capability) => [
        capability.id,
        capability,
      ]),
    );

    expect(byId.get("google")?.enabled).toBe(true);
    expect(byId.get("credentials")?.enabled).toBe(false);
    expect(byId.get("credentials")?.reasonDisabled).toBe("password_login_disabled");
    expect(byId.get("guest")?.enabled).toBe(false);
    expect(byId.get("guest")?.reasonDisabled).toBe("guest_flow_disabled");
    expect(body.authOperational).toBe(true);
    expect(body.authIssues).toEqual([]);
  });

  it("treats non-false feature flag strings as enabled", async () => {
    isDatabaseConfiguredMock.mockReturnValueOnce(true);
    process.env.AUTH_ENABLE_PASSWORD_LOGIN = "0";
    process.env.AUTH_ENABLE_GUEST_FLOW = "yes";

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);

    const byId = new Map<string, Capability>(
      (body.capabilities as Capability[]).map((capability) => [
        capability.id,
        capability,
      ]),
    );

    expect(byId.get("credentials")?.enabled).toBe(true);
    expect(byId.get("guest")?.enabled).toBe(true);
    expect(body.authOperational).toBe(true);
    expect(body.authIssues).toEqual([]);
  });

  it("disables database-dependent providers when database is unavailable", async () => {
    isDatabaseConfiguredMock.mockReturnValueOnce(false);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);

    const byId = new Map<string, Capability>(
      (body.capabilities as Capability[]).map((capability) => [
        capability.id,
        capability,
      ]),
    );

    expect(byId.get("credentials")?.enabled).toBe(false);
    expect(byId.get("credentials")?.reasonDisabled).toBe("credential_store_unavailable");
    expect(body.authOperational).toBe(false);
    expect(body.authIssues).toContain("no_auth_provider_enabled");
  });

  it("marks credentials unavailable when credential store health check fails", async () => {
    isDatabaseConfiguredMock.mockReturnValueOnce(true);
    passwordCredentialFindFirstMock.mockRejectedValueOnce(new Error("relation does not exist"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);

    const byId = new Map<string, Capability>(
      (body.capabilities as Capability[]).map((capability) => [
        capability.id,
        capability,
      ]),
    );

    expect(byId.get("credentials")?.enabled).toBe(false);
    expect(byId.get("credentials")?.reasonDisabled).toBe("credential_store_unavailable");
    expect(body.authOperational).toBe(false);
    expect(body.authIssues).toContain("no_auth_provider_enabled");
  });

  it("reports non-operational auth when secret is missing", async () => {
    isDatabaseConfiguredMock.mockReturnValueOnce(true);
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authOperational).toBe(false);
    expect(body.authIssues).toContain("missing_auth_secret");
  });

  it("disables oauth providers when auth schema is missing required columns", async () => {
    isDatabaseConfiguredMock.mockReturnValueOnce(true);
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    queryRawUnsafeMock.mockImplementation(async (_query: string, tableName: string) => {
      if (tableName === "users") {
        return [
          { column_name: "id" },
          { column_name: "email" },
          { column_name: "emailVerified" },
          { column_name: "name" },
          { column_name: "image" },
          { column_name: "role" },
        ];
      }
      if (tableName === "accounts") {
        return [
          { column_name: "id" },
          { column_name: "userId" },
          { column_name: "type" },
          { column_name: "provider" },
          // intentionally missing providerAccountId
        ];
      }
      if (tableName === "sessions") {
        return [
          { column_name: "id" },
          { column_name: "sessionToken" },
          { column_name: "userId" },
          { column_name: "expires" },
        ];
      }
      return [];
    });

    const response = await GET();
    const body = await response.json();

    const byId = new Map<string, Capability>(
      (body.capabilities as Capability[]).map((capability) => [
        capability.id,
        capability,
      ]),
    );

    expect(byId.get("google")?.enabled).toBe(false);
    expect(byId.get("google")?.reasonDisabled).toBe("oauth_schema_unavailable");
    expect(body.authIssues).toContain("oauth_schema_unavailable");
    expect(Array.isArray(body.oauthSchemaIssues)).toBe(true);
    expect(body.oauthSchemaIssues).toContain("accounts.providerAccountId");
  });
});
