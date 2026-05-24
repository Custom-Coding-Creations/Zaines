import { NextRequest, NextResponse } from "next/server";
import { Auth, skipCSRFCheck, raw } from "@auth/core";
import { authConfig } from "@/lib/auth";

/**
 * GET /api/auth/oauth-start?provider=google&callbackUrl=/
 *
 * Initiates the OAuth flow via a simple browser navigation (no JavaScript
 * cookie handling). This route:
 *   1. Calls Auth() to generate the authorization URL + PKCE code_verifier
 *   2. Returns a standard 302 redirect with proper Set-Cookie headers
 *
 * The browser stores the cookies AND follows the redirect in a single step,
 * eliminating any timing/race issues that can occur with fetch+navigate or
 * server-action-based approaches.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  if (!provider) {
    return NextResponse.json(
      { error: "Missing provider parameter" },
      { status: 400 },
    );
  }

  // Build a synthetic POST request that Auth() expects for signin
  const url = new URL(
    `/api/auth/signin/${provider}`,
    request.nextUrl.origin,
  );

  const body = new URLSearchParams({ callbackUrl });

  const signinRequest = new Request(url.toString(), {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      host: request.headers.get("host") || "",
      "x-forwarded-host": request.headers.get("x-forwarded-host") || request.headers.get("host") || "",
      "x-forwarded-proto": request.headers.get("x-forwarded-proto") || "https",
    }),
    body,
  });

  // Call Auth in raw mode (returns object with redirect + cookies) and skip
  // CSRF since this is a server-initiated request from our own route.
  const result = await Auth(signinRequest, {
    ...authConfig,
    raw,
    skipCSRFCheck,
  });

  // Build a standard HTTP redirect response with all cookies
  const redirectUrl =
    result instanceof Response
      ? result.headers.get("Location") || callbackUrl
      : result?.redirect || callbackUrl;

  const response = NextResponse.redirect(redirectUrl, { status: 302 });

  // Propagate all cookies from the Auth result (PKCE verifier, callback URL, etc.)
  const cookies = result instanceof Response ? [] : (result?.cookies ?? []);
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
