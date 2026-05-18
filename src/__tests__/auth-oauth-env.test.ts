import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOauthProviderCredentials,
  getOauthProviderDebugInfo,
} from "@/lib/auth/oauth-env";

const OAUTH_ENV_KEYS = [
  "AUTH_GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
  "AUTH_GOOGLE_CLIENT_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "AUTH_FACEBOOK_CLIENT_ID",
  "FACEBOOK_CLIENT_ID",
  "AUTH_FACEBOOK_CLIENT_SECRET",
  "FACEBOOK_CLIENT_SECRET",
] as const;

function clearOauthEnv() {
  for (const key of OAUTH_ENV_KEYS) {
    delete process.env[key];
  }
}

afterEach(() => {
  clearOauthEnv();
  vi.restoreAllMocks();
});

describe("oauth env resolution", () => {
  it("prefers AUTH_GOOGLE keys over legacy keys", () => {
    process.env.GOOGLE_CLIENT_ID = "legacy-google-id";
    process.env.AUTH_GOOGLE_CLIENT_ID = "auth-google-id";
    process.env.GOOGLE_CLIENT_SECRET = "legacy-google-secret";
    process.env.AUTH_GOOGLE_CLIENT_SECRET = "auth-google-secret";

    const credentials = getOauthProviderCredentials("google");

    expect(credentials.clientId).toBe("auth-google-id");
    expect(credentials.clientSecret).toBe("auth-google-secret");
    expect(credentials.clientIdKey).toBe("AUTH_GOOGLE_CLIENT_ID");
    expect(credentials.clientSecretKey).toBe("AUTH_GOOGLE_CLIENT_SECRET");
  });

  it("falls back to legacy keys when AUTH_* keys are absent", () => {
    process.env.GOOGLE_CLIENT_ID = "legacy-google-id";
    process.env.GOOGLE_CLIENT_SECRET = "legacy-google-secret";

    const credentials = getOauthProviderCredentials("google");

    expect(credentials.clientId).toBe("legacy-google-id");
    expect(credentials.clientSecret).toBe("legacy-google-secret");
    expect(credentials.clientIdKey).toBe("GOOGLE_CLIENT_ID");
    expect(credentials.clientSecretKey).toBe("GOOGLE_CLIENT_SECRET");
  });

  it("warns when multiple aliases are defined for the same provider", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    process.env.AUTH_GOOGLE_CLIENT_ID = "auth-google-id";
    process.env.GOOGLE_CLIENT_ID = "legacy-google-id";
    process.env.AUTH_GOOGLE_CLIENT_SECRET = "auth-google-secret";
    process.env.GOOGLE_CLIENT_SECRET = "legacy-google-secret";

    const credentials = getOauthProviderCredentials("google");

    expect(credentials.clientIdKey).toBe("AUTH_GOOGLE_CLIENT_ID");
    expect(credentials.clientSecretKey).toBe("AUTH_GOOGLE_CLIENT_SECRET");
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("Multiple google clientId env keys are set");
    expect(warnSpy.mock.calls[1]?.[0]).toContain("Multiple google clientSecret env keys are set");
  });

  it("exposes selected env keys in debug info with redacted client id", () => {
    process.env.AUTH_GOOGLE_CLIENT_ID = "1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com";
    process.env.AUTH_GOOGLE_CLIENT_SECRET = "auth-google-secret";

    const debugInfo = getOauthProviderDebugInfo("google");

    expect(debugInfo.clientIdKey).toBe("AUTH_GOOGLE_CLIENT_ID");
    expect(debugInfo.clientSecretKey).toBe("AUTH_GOOGLE_CLIENT_SECRET");
    expect(debugInfo.redactedClientId).toMatch(/^12345678\.\.\..+/);
  });
});
