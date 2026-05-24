import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth";

/**
 * This endpoint attempts to reproduce the exact auth initialization
 * that happens in the [...nextauth] handler to diagnose Configuration errors.
 */
export async function GET(request: Request) {
  const diagnostics: Record<string, unknown> = {};

  try {
    // 1. Check if authConfig is properly exported
    diagnostics.configExists = !!authConfig;
    diagnostics.configKeys = Object.keys(authConfig);
    
    // 2. Check providers
    diagnostics.providerCount = authConfig.providers?.length ?? 0;
    diagnostics.providerTypes = authConfig.providers?.map((p) => {
      const provider = typeof p === "function" ? p() : p;
      return { id: provider.id, type: provider.type, hasClientId: !!(provider as any).clientId };
    });
    
    // 3. Check secret
    diagnostics.hasSecret = !!(authConfig as any).secret;
    diagnostics.secretLength = ((authConfig as any).secret as string)?.length ?? 0;
    
    // 4. Check trustHost
    diagnostics.trustHost = (authConfig as any).trustHost;
    
    // 5. Check session strategy
    diagnostics.sessionStrategy = authConfig.session?.strategy;
    
    // 6. Check adapter
    diagnostics.hasAdapter = !!(authConfig as any).adapter;
    
    // 7. Check pages
    diagnostics.pages = authConfig.pages;

    // 8. Try to mimic what Auth() does - import the handler and test
    try {
      const { Auth } = await import("@auth/core");
      
      // Create a fake request similar to what would come in
      const fakeUrl = new URL("/api/auth/signin/google", request.url);
      const fakeRequest = new Request(fakeUrl.toString(), {
        method: "GET",
        headers: new Headers({
          "host": new URL(request.url).host,
          "x-forwarded-host": new URL(request.url).host,
          "x-forwarded-proto": "https",
        }),
      });
      
      // Apply setEnvDefaults like next-auth does
      const { setEnvDefaults } = await import("next-auth/lib/env" as any).catch(() => ({ setEnvDefaults: null }));
      const configCopy = { ...authConfig, providers: [...authConfig.providers] };
      if (setEnvDefaults) {
        setEnvDefaults(configCopy);
      }
      
      diagnostics.configAfterEnvDefaults = {
        hasSecret: !!(configCopy as any).secret,
        secretLength: typeof (configCopy as any).secret === "string" 
          ? (configCopy as any).secret.length 
          : Array.isArray((configCopy as any).secret) 
            ? (configCopy as any).secret.length 
            : 0,
        basePath: (configCopy as any).basePath,
        trustHost: (configCopy as any).trustHost,
      };

      // Try calling Auth directly
      const response = await Auth(fakeRequest, configCopy);
      diagnostics.authResponse = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        redirectLocation: response.headers.get("Location"),
      };
      
      if (response.status >= 400) {
        const body = await response.text();
        diagnostics.authResponseBody = body.substring(0, 500);
      }
    } catch (authError: unknown) {
      diagnostics.authError = {
        name: (authError as Error)?.name,
        message: (authError as Error)?.message,
        stack: (authError as Error)?.stack?.split("\n").slice(0, 5),
      };
    }

  } catch (error: unknown) {
    diagnostics.fatalError = {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
    };
  }

  return NextResponse.json(diagnostics);
}
