import { expect, test, type Page } from "@playwright/test";

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
};

const callbackUrl = "/dashboard";

async function getCapabilities(page: Page) {
  const response = await page.request.get("/api/auth/capabilities");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CapabilitiesPayload;
}

function randomUserEmail() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return `auth-smoke-${suffix}@example.com`;
}

const testPassword = "SmokeTestPass123!";

async function signInWithCredentials(page: Page, params: { email: string; password: string }) {
  const csrfResponse = await page.request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  expect(typeof csrfPayload.csrfToken).toBe("string");

  const callbackResponse = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrfPayload.csrfToken ?? "",
      email: params.email,
      password: params.password,
      callbackUrl,
    },
    maxRedirects: 0,
  });

  expect(callbackResponse.status()).toBeGreaterThanOrEqual(300);
  expect(callbackResponse.status()).toBeLessThan(400);

  const locationHeader = callbackResponse.headers()["location"] ?? "";
  expect(locationHeader).toContain("/dashboard");

  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.ok()).toBeTruthy();
  const sessionPayload = (await sessionResponse.json()) as {
    user?: { email?: string };
  };
  expect(sessionPayload.user?.email?.toLowerCase()).toBe(params.email.toLowerCase());
}

test.describe("Auth smoke", () => {
  test("Google OAuth initiation redirects to Google", async ({ page }) => {
    const capabilities = await getCapabilities(page);
    const google = capabilities.capabilities.find((entry) => entry.id === "google");

    test.skip(!google?.enabled, `Google provider disabled (${google?.reasonDisabled ?? "unknown"})`);

    const csrfResponse = await page.request.get("/api/auth/csrf");
    expect(csrfResponse.ok()).toBeTruthy();
    const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
    expect(typeof csrfPayload.csrfToken).toBe("string");

    const oauthResponse = await page.request.post("/api/auth/signin/google", {
      form: {
        csrfToken: csrfPayload.csrfToken ?? "",
        callbackUrl,
      },
      maxRedirects: 0,
    });

    expect(oauthResponse.status()).toBeGreaterThanOrEqual(300);
    expect(oauthResponse.status()).toBeLessThan(400);

    const locationHeader = oauthResponse.headers()["location"] ?? "";
    expect(locationHeader).toContain("accounts.google.com");
  });

  test("Create Account flow creates account and can authenticate", async ({ page }) => {
    const capabilities = await getCapabilities(page);
    const credentials = capabilities.capabilities.find((entry) => entry.id === "credentials");

    test.skip(!credentials?.enabled, `Credentials provider disabled (${credentials?.reasonDisabled ?? "unknown"})`);

    const email = randomUserEmail();

    const registerResponse = await page.request.post("/api/auth/register", {
      data: {
        name: "Auth Smoke User",
        email,
        password: testPassword,
      },
    });
    expect(registerResponse.status()).toBe(201);

    await signInWithCredentials(page, { email, password: testPassword });
  });

  test("Email/password callback returns dashboard redirect", async ({ page }) => {
    const capabilities = await getCapabilities(page);
    const credentials = capabilities.capabilities.find((entry) => entry.id === "credentials");

    test.skip(!credentials?.enabled, `Credentials provider disabled (${credentials?.reasonDisabled ?? "unknown"})`);

    const email = randomUserEmail();

    const registerResponse = await page.request.post("/api/auth/register", {
      data: {
        name: "Auth Smoke Credentials User",
        email,
        password: testPassword,
      },
    });

    expect(registerResponse.ok()).toBeTruthy();

    await signInWithCredentials(page, { email, password: testPassword });
  });
});
