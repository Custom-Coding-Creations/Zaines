import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/debug-cookies
 * 
 * Diagnostic endpoint that shows which auth-related cookies are present
 * in the current request. Helps diagnose whether PKCE cookies survive
 * the OAuth redirect flow.
 */
export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  
  const authCookies = allCookies
    .filter(c => c.name.includes("authjs") || c.name.includes("next-auth"))
    .map(c => ({
      name: c.name,
      valueLength: c.value.length,
      valuePreview: c.value.substring(0, 30) + (c.value.length > 30 ? "..." : ""),
    }));

  return NextResponse.json({
    totalCookies: allCookies.length,
    authCookies,
    allCookieNames: allCookies.map(c => c.name),
    hasPkce: allCookies.some(c => c.name.includes("pkce")),
    hasCsrf: allCookies.some(c => c.name.includes("csrf")),
    hasCallbackUrl: allCookies.some(c => c.name.includes("callback-url")),
  });
}
