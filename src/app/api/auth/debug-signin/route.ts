import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { Auth, raw, skipCSRFCheck, createActionURL } from "@auth/core";
import { authConfig } from "@/lib/auth";

/**
 * Diagnostic endpoint that simulates the server-side signIn flow
 * and returns the error details instead of redirecting.
 */
export async function GET() {
  try {
    const hdrs = new Headers(await nextHeaders());
    const proto = hdrs.get("x-forwarded-proto");
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    
    // Step 1: Check what URL createActionURL would produce
    const signInURL = createActionURL(
      "signin",
      proto ?? "https",
      hdrs,
      process.env,
      authConfig
    );
    
    const fullUrl = `${signInURL}/google?`;
    
    // Step 2: Construct the same request the signIn function would
    const reqHeaders = new Headers(hdrs);
    reqHeaders.set("Content-Type", "application/x-www-form-urlencoded");
    const body = new URLSearchParams({ callbackUrl: "/" });
    const req = new Request(fullUrl, { method: "POST", headers: reqHeaders, body });
    
    // Step 3: Call Auth directly (same as server action does)
    let res: unknown;
    try {
      res = await Auth(req, { ...authConfig, raw, skipCSRFCheck });
    } catch (authError: unknown) {
      const err = authError as Error & { type?: string; cause?: unknown };
      return NextResponse.json({
        status: "auth_threw",
        step: "Auth() threw an error",
        errorName: err.name,
        errorType: (err as { type?: string }).type,
        errorMessage: err.message,
        errorStack: err.stack?.split("\n").slice(0, 8),
        cause: err.cause instanceof Error ? {
          name: err.cause.name,
          message: err.cause.message,
        } : String(err.cause),
        debug: {
          proto,
          host,
          signInURL: signInURL.toString(),
          fullUrl,
          basePath: authConfig.basePath,
          hasProviders: authConfig.providers?.length,
        }
      }, { status: 500 });
    }
    
    // Step 4: Analyze the response
    if (res instanceof Response) {
      const location = res.headers.get("Location");
      const bodyText = await res.clone().text().catch(() => null);
      return NextResponse.json({
        status: "got_response_object",
        message: "Auth returned a Response (not ResponseInternal)",
        responseStatus: res.status,
        location,
        bodyPreview: bodyText?.substring(0, 200),
        debug: {
          proto,
          host,
          signInURL: signInURL.toString(),
          fullUrl,
          basePath: authConfig.basePath,
        }
      });
    }
    
    // Step 5: If it's ResponseInternal (success case)
    const internalRes = res as { redirect?: string; cookies?: unknown[]; body?: unknown; status?: number };
    return NextResponse.json({
      status: "success",
      redirect: internalRes.redirect,
      cookieCount: internalRes.cookies?.length ?? 0,
      hasBody: !!internalRes.body,
      responseStatus: internalRes.status,
      debug: {
        proto,
        host,
        signInURL: signInURL.toString(),
        fullUrl,
        basePath: authConfig.basePath,
      }
    });
    
  } catch (outerError: unknown) {
    const err = outerError as Error;
    return NextResponse.json({
      status: "outer_error",
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack?.split("\n").slice(0, 8),
    }, { status: 500 });
  }
}

