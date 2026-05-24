import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/prisma";
import { getOauthProviderCredentials } from "@/lib/auth/oauth-env";
import { getAuthRuntimeConfig } from "@/lib/auth/runtime-config";

export async function GET() {
  const hasDatabase = isDatabaseConfigured();
  const runtime = getAuthRuntimeConfig(hasDatabase);
  const googleCreds = getOauthProviderCredentials("google");

  // Test OIDC discovery fetch
  let discoveryResult: { ok: boolean; status?: number; error?: string; data?: unknown } = { ok: false };
  try {
    const res = await fetch("https://accounts.google.com/.well-known/openid-configuration", {
      cache: "no-store",
    });
    discoveryResult = {
      ok: res.ok,
      status: res.status,
      data: res.ok ? await res.json() : await res.text(),
    };
  } catch (err: unknown) {
    discoveryResult = { ok: false, error: String(err) };
  }

  // Check secret
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const secretInfo = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    resolvedSecretLength: authSecret?.length ?? 0,
    secretFirstChars: authSecret ? authSecret.substring(0, 4) + "..." : "undefined",
  };

  // Check Google credentials
  const googleInfo = {
    clientIdDefined: !!googleCreds.clientId,
    clientSecretDefined: !!googleCreds.clientSecret,
    clientIdLength: googleCreds.clientId?.length ?? 0,
    clientSecretLength: googleCreds.clientSecret?.length ?? 0,
    clientIdKey: googleCreds.clientIdKey,
    clientSecretKey: googleCreds.clientSecretKey,
    clientIdEndsWithGoogleusercontent: googleCreds.clientId?.endsWith(".apps.googleusercontent.com") ?? false,
  };

  // Check env vars directly
  const envCheck = {
    AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
    AUTH_GOOGLE_CLIENT_ID: !!process.env.AUTH_GOOGLE_CLIENT_ID,
    AUTH_GOOGLE_CLIENT_SECRET: !!process.env.AUTH_GOOGLE_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    AUTH_URL: process.env.AUTH_URL ?? "not set",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "not set",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? "not set",
    VERCEL: process.env.VERCEL ?? "not set",
    NODE_ENV: process.env.NODE_ENV,
  };

  // Try to simulate the assert config check
  let assertSimulation: { pass: boolean; reason?: string } = { pass: true };
  if (!authSecret || authSecret.length === 0) {
    assertSimulation = { pass: false, reason: "MissingSecret" };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    hasDatabase,
    runtime,
    secretInfo,
    googleInfo,
    envCheck,
    discoveryResult: {
      ok: discoveryResult.ok,
      status: discoveryResult.status,
      error: discoveryResult.error,
      hasAuthorizationEndpoint: !!(discoveryResult.data as Record<string, unknown>)?.authorization_endpoint,
    },
    assertSimulation,
  });
}
