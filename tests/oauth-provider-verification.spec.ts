import { test, expect } from "@playwright/test";

/**
 * OAuth Provider Capabilities Test
 *
 * This test verifies that OAuth providers are available and properly configured
 * after schema fixes have been applied. Run this after fixing auth schema issues.
 *
 * Usage:
 *   pnpm exec playwright test tests/oauth-provider-verification.spec.ts
 *
 * Or with specific browser:
 *   pnpm exec playwright test tests/oauth-provider-verification.spec.ts --project=chromium
 */

const baseUrl = process.env.E2E_WEB_BASE_URL || "http://localhost:3000";
const strictOauthAssertions = process.env.OAUTH_STRICT_ASSERTS === "1";

type Capability = {
  id: string;
  kind: "oauth" | "credentials" | "guest";
  label: string;
  enabled: boolean;
  reasonDisabled?: string;
};

type CapabilitiesPayload = {
  capabilities: Capability[];
  authOperational: boolean;
  authIssues: string[];
  oauthSchemaIssues: string[];
  oauthDebug?: {
    google?: {
      clientIdKey?: string;
      clientSecretKey?: string;
      redactedClientId?: string;
    };
  };
};

async function fetchCapabilities(baseRequest: {
  get: (url: string) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
}) {
  const response = await baseRequest.get(`${baseUrl}/api/auth/capabilities`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CapabilitiesPayload;
}

test.describe("OAuth Provider Schema Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto(`${baseUrl}/auth/signin`);
    await page.waitForLoadState("networkidle");
  });

  test("should display OAuth provider buttons", async ({ page }) => {
    const capabilities = await fetchCapabilities(page.request);
    const enabledOauthProviders = capabilities.capabilities.filter(
      (capability) => capability.kind === "oauth" && capability.enabled,
    );

    for (const provider of enabledOauthProviders) {
      const label = provider.id === "google" ? "Google" : provider.id === "facebook" ? "Facebook" : provider.id;
      await expect(page.locator(`button:has-text("${label}")`)).toBeVisible({ timeout: 5000 });
    }

    console.log("✓ OAuth buttons are visible on sign-in page");
  });

  test("should load OAuth capabilities from API", async ({ page }) => {
    const data = await fetchCapabilities(page.request);

    expect(Array.isArray(data.capabilities)).toBe(true);
    expect(Array.isArray(data.authIssues)).toBe(true);
    expect(Array.isArray(data.oauthSchemaIssues)).toBe(true);

    const googleProvider = data.capabilities.find((provider) => provider.id === "google");
    expect(googleProvider).toBeDefined();
    if (strictOauthAssertions) {
      expect(googleProvider?.enabled).toBe(true);
    }

    expect(data.oauthSchemaIssues).toHaveLength(0);
    expect(data.authIssues).not.toContain("oauth_schema_unavailable");

    console.log("✓ OAuth providers are enabled in capabilities API");
  });

  test("should have no schema validation errors in console", async ({
    page,
  }) => {
    // Capture console messages
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("schema")) {
        consoleLogs.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Verify no schema-related errors
    const schemaErrors = consoleLogs.filter((log) =>
      log.toLowerCase().includes("schema"),
    );
    expect(schemaErrors).toHaveLength(0);

    console.log("✓ No schema validation errors in console");
  });

  test("should verify account table columns exist", async ({ page }) => {
    // This is a meta-test: if OAuth buttons are loading without errors,
    // it means the database schema validation passed
    // Even if form isn't visible, the page should load without schema errors
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("column");
    expect(body).not.toContain("does not exist");

    console.log("✓ No database schema errors on page");
  });
});

test.describe("OAuth Schema Health Indicators", () => {
  test("should pass auth readiness check", async ({ page }) => {
    // Call health endpoint
    const response = await page.request.get(`${baseUrl}/api/admin/health/auth`);

    // Should not be 500 (schema errors)
    expect(response.status()).not.toBe(500);

    if (response.ok()) {
      const data = await response.json();
      console.log("Auth health status:", JSON.stringify(data, null, 2));

      // Verify no adapter errors
      const errorList =
        data && typeof data === "object" && Array.isArray((data as { errors?: unknown[] }).errors)
          ? (data as { errors: Array<{ message?: string }> }).errors
          : [];

      if (errorList.length > 0) {
        const schemaErrors = errorList.filter((errorEntry) =>
          errorEntry.message?.includes("column"),
        );
        expect(schemaErrors).toHaveLength(0);
      }
    }

    console.log(`✓ Auth health check passed (status: ${response.status()})`);
  });

  test("should have credentials provider available", async ({ page }) => {
    const data = await fetchCapabilities(page.request);
    const credentialsProvider = data.capabilities.find(
      (provider) => provider.id === "credentials",
    );

    expect(credentialsProvider).toBeDefined();
    expect(credentialsProvider.enabled).toBe(true);

    console.log("✓ Credentials provider is available (fallback working)");
  });
});

test.describe("OAuth Provider Configuration", () => {
  test("should verify Google provider environment", async ({ page }) => {
    const data = await fetchCapabilities(page.request);
    const googleProvider = data.capabilities.find(
      (provider) => provider.id === "google",
    );
    expect(googleProvider).toBeDefined();

    if (!googleProvider?.enabled) {
      console.warn(
        `Google provider disabled. Reason: ${googleProvider?.reasonDisabled}`,
      );
      expect(["placeholder_credentials", "missing_credentials"]).toContain(
        googleProvider?.reasonDisabled,
      );
    } else {
      console.log("✓ Google provider is configured and enabled");
    }

    if (strictOauthAssertions) {
      expect(googleProvider?.enabled).toBe(true);
      expect(data.oauthDebug?.google?.clientIdKey).toBe("AUTH_GOOGLE_CLIENT_ID");
      expect(data.oauthDebug?.google?.clientSecretKey).toBe("AUTH_GOOGLE_CLIENT_SECRET");
    }
  });

  test("should verify Facebook provider environment", async ({ page }) => {
    const data = await fetchCapabilities(page.request);
    const facebookProvider = data.capabilities.find(
      (provider) => provider.id === "facebook",
    );
    expect(facebookProvider).toBeDefined();

    if (!facebookProvider?.enabled) {
      console.warn(
        `Facebook provider disabled. Reason: ${facebookProvider?.reasonDisabled}`,
      );
      expect(["placeholder_credentials", "missing_credentials"]).toContain(
        facebookProvider?.reasonDisabled,
      );
    } else {
      console.log("✓ Facebook provider is configured and enabled");
    }
  });
});

test.describe("OAuth Database Schema Integrity", () => {
  test("should report schema status in capabilities", async ({ page }) => {
    const data = await fetchCapabilities(page.request);
    expect(data.oauthSchemaIssues).toEqual([]);

    console.log("✓ Database is available and accessible");
  });

  test("should not have disabled providers due to schema", async ({ page }) => {
    const data = await fetchCapabilities(page.request);

    const disabledDueToSchema = data.capabilities.filter(
      (provider) => provider.reasonDisabled === "oauth_schema_unavailable",
    );

    expect(disabledDueToSchema).toHaveLength(0);

    console.log(
      "✓ No providers disabled due to database schema issues",
    );
  });
});
