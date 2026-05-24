import { NextResponse } from "next/server";
import { headers as nextHeaders, cookies } from "next/headers";

/**
 * Diagnostic endpoint that simulates the server-side signIn flow
 * and returns the error details instead of redirecting.
 */
export async function GET() {
  try {
    // Import the auth module dynamically to get the same config
    const { signIn } = await import("@/lib/auth");

    // Try calling signIn - this will throw NEXT_REDIRECT on success
    // or throw an error on failure
    try {
      await signIn("google", { redirect: false, redirectTo: "/" });
      return NextResponse.json({ status: "ok", message: "signIn returned without redirect" });
    } catch (error: unknown) {
      const err = error as Error & { digest?: string; type?: string; cause?: unknown };
      
      // Check if it's a redirect (success case)
      if (err.digest?.startsWith("NEXT_REDIRECT")) {
        const url = err.digest.replace("NEXT_REDIRECT;replace;", "").replace("NEXT_REDIRECT;push;", "");
        return NextResponse.json({
          status: "success",
          message: "signIn generated redirect URL successfully",
          redirectUrl: url,
        });
      }

      // It's an actual error
      return NextResponse.json({
        status: "error",
        errorName: err.name,
        errorType: err.type,
        errorMessage: err.message,
        errorDigest: err.digest,
        errorStack: err.stack?.split("\n").slice(0, 10),
        errorCause: err.cause instanceof Error ? {
          name: err.cause.name,
          message: err.cause.message,
          stack: err.cause.stack?.split("\n").slice(0, 5),
        } : String(err.cause),
      }, { status: 500 });
    }
  } catch (outerError: unknown) {
    const err = outerError as Error & { digest?: string };
    
    // Even the outer try might catch a NEXT_REDIRECT
    if (err.digest?.startsWith("NEXT_REDIRECT")) {
      const url = err.digest.replace("NEXT_REDIRECT;replace;", "").replace("NEXT_REDIRECT;push;", "");
      return NextResponse.json({
        status: "success",
        message: "signIn generated redirect URL (outer catch)",
        redirectUrl: url,
      });
    }
    
    return NextResponse.json({
      status: "outer_error",
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack?.split("\n").slice(0, 10),
    }, { status: 500 });
  }
}
