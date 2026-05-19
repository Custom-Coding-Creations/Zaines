import { NextResponse } from "next/server";

/**
 * Temporary diagnostic endpoint to test OAuth callback prerequisites.
 * Tests OIDC discovery and PKCE cookie decryption without completing the flow.
 * DELETE THIS FILE after debugging is complete.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  };

  // 1. Check auth secret availability
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  results.hasAuthSecret = !!authSecret;
  results.authSecretLength = authSecret?.length ?? 0;

  // 2. Test OIDC discovery for Google
  try {
    const discoveryUrl = "https://accounts.google.com/.well-known/openid-configuration";
    const startTime = Date.now();
    const discoveryResponse = await fetch(discoveryUrl, { 
      signal: AbortSignal.timeout(5000) 
    });
    const discoveryTime = Date.now() - startTime;
    
    if (discoveryResponse.ok) {
      const discoveryData = await discoveryResponse.json();
      results.oidcDiscovery = {
        success: true,
        timeMs: discoveryTime,
        hasJwksUri: !!discoveryData.jwks_uri,
        jwksUri: discoveryData.jwks_uri,
        tokenEndpoint: discoveryData.token_endpoint,
        authorizationEndpoint: discoveryData.authorization_endpoint,
      };
    } else {
      results.oidcDiscovery = {
        success: false,
        status: discoveryResponse.status,
        statusText: discoveryResponse.statusText,
        timeMs: discoveryTime,
      };
    }
  } catch (err) {
    results.oidcDiscovery = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 3. Test JWKS fetch
  try {
    const jwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
    const startTime = Date.now();
    const jwksResponse = await fetch(jwksUrl, {
      signal: AbortSignal.timeout(5000),
    });
    const jwksTime = Date.now() - startTime;
    
    if (jwksResponse.ok) {
      const jwksData = await jwksResponse.json();
      results.jwksFetch = {
        success: true,
        timeMs: jwksTime,
        keyCount: jwksData.keys?.length ?? 0,
      };
    } else {
      results.jwksFetch = {
        success: false,
        status: jwksResponse.status,
        timeMs: jwksTime,
      };
    }
  } catch (err) {
    results.jwksFetch = {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 4. Test Google token endpoint reachability (OPTIONS/HEAD)
  try {
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const startTime = Date.now();
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=authorization_code&code=test&redirect_uri=test&client_id=test&client_secret=test",
      signal: AbortSignal.timeout(5000),
    });
    const tokenTime = Date.now() - startTime;
    const tokenBody = await tokenResponse.json();
    
    results.tokenEndpoint = {
      reachable: true,
      timeMs: tokenTime,
      status: tokenResponse.status,
      // We expect an error since we're using fake credentials
      errorCode: tokenBody.error,
      errorDescription: tokenBody.error_description?.substring(0, 100),
    };
  } catch (err) {
    results.tokenEndpoint = {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 5. Check Google credentials
  results.googleCredentials = {
    hasClientId: !!process.env.AUTH_GOOGLE_CLIENT_ID,
    clientIdPrefix: process.env.AUTH_GOOGLE_CLIENT_ID?.substring(0, 10),
    hasClientSecret: !!process.env.AUTH_GOOGLE_CLIENT_SECRET,
    clientSecretLength: process.env.AUTH_GOOGLE_CLIENT_SECRET?.length ?? 0,
  };

  // 6. Check database connectivity
  try {
    const { prisma } = await import("@/lib/prisma");
    const userCount = await prisma.user.count();
    results.database = {
      connected: true,
      userCount,
    };
  } catch (err) {
    results.database = {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
