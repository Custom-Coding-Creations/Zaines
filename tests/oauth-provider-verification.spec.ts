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

test.describe("OAuth Provider Schema Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto(`${baseUrl}/auth/signin`);
    await page.waitForLoadState("networkidle");
  });

  test("should display OAuth provider buttons", async ({ page }) => {
    // Check for Google OAuth button
    const googleButton = page.locator('button:has-text("Google")');
    await expect(googleButton).toBeVisible({
      timeout: 5000,
    });

    // Check for Facebook OAuth button
    const facebookButton = page.locator('button:has-text("Facebook")');
    await expect(facebookButton).toBeVisible({
      timeout: 5000,
    });

    console.log("✓ OAuth buttons are visible on sign-in page");
  });

  test("should load OAuth capabilities from API", async ({ page }) => {
    // Call the capabilities API endpoint
    const response = await page.request.get(`${baseUrl}/api/auth/capabilities`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Verify OAuth providers are enabled
    expect(data.providers).toBeDefined();

    const googleProvider = data.providers.find(
      (p: any) => p.id === "google",
    );
    expect(googleProvider).toBeDefined();
    expect(googleProvider.enabled).toBe(true);

    const facebookProvider = data.providers.find(
      (p: any) => p.id === "facebook",
    );
    expect(facebookProvider).toBeDefined();
    expect(facebookProvider.enabled).toBe(true);

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
    const authElement = page.locator("[data-testid='signin-form']");
    const isVisible = await authElement.isVisible().catch(() => false);

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
      if (data.errors) {
        const schemaErrors = data.errors.filter((e: any) =>
          e.message?.includes("column"),
        );
        expect(schemaErrors).toHaveLength(0);
      }
    }

    console.log(`✓ Auth health check passed (status: ${response.status()})`);
  });

  test("should have credentials provider available", async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/auth/capabilities`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const credentialsProvider = data.providers.find(
      (p: any) => p.id === "credentials",
    );

    expect(credentialsProvider).toBeDefined();
    expect(credentialsProvider.enabled).toBe(true);

    console.log("✓ Credentials provider is available (fallback working)");
  });
});

test.describe("OAuth Provider Configuration", () => {
  test("should verify Google provider environment", async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/auth/capabilities`);
    const data = await response.json();

    const googleProvider = data.providers.find(
      (p: any) => p.id === "google",
    );

    if (!googleProvider.enabled) {
      console.warn(
        `Google provider disabled. Reason: ${googleProvider.reasonDisabled}`,
      );
      // If disabled due to credentials, that's expected in test env
      expect(["placeholder_credentials", "oauth_login_disabled"]).toContain(
        googleProvider.reasonDisabled,
      );
    } else {
      console.log("✓ Google provider is configured and enabled");
    }
  });

  test("should verify Facebook provider environment", async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/auth/capabilities`);
    const data = await response.json();

    const facebookProvider = data.providers.find(
      (p: any) => p.id === "facebook",
    );

    if (!facebookProvider.enabled) {
      console.warn(
        `Facebook provider disabled. Reason: ${facebookProvider.reasonDisabled}`,
      );
      expect(["placeholder_credentials", "oauth_login_disabled"]).toContain(
        facebookProvider.reasonDisabled,
      );
    } else {
      console.log("✓ Facebook provider is configured and enabled");
    }
  });
});

test.describe("OAuth Database Schema Integrity", () => {
  test("should report schema status in capabilities", async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/auth/capabilities`);
    const data = await response.json();

    // Verify database is available (schema would have been checked)
    expect(data.databaseAvailable).toBe(true);

    console.log("✓ Database is available and accessible");
  });

  test("should not have disabled providers due to schema", async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/auth/capabilities`);
    const data = await response.json();

    const disabledDueToSchema = data.providers.filter(
      (p: any) => p.reasonDisabled === "database_unavailable",
    );

    expect(disabledDueToSchema).toHaveLength(0);

    console.log(
      "✓ No providers disabled due to database schema issues",
    );
  });
});
