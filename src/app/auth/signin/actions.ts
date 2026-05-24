"use server";

import { signIn } from "@/lib/auth";

/**
 * Server action for OAuth sign-in. Uses the server-side signIn() which
 * handles the full redirect flow in a single request-response cycle,
 * ensuring PKCE/state cookies are properly set alongside the redirect.
 * This avoids timing issues with the client-side fetch+navigate pattern.
 */
export async function oauthSignIn(providerId: string, redirectTo: string) {
  await signIn(providerId, { redirectTo });
}
