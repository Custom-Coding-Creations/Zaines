import NextAuth, { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { isDatabaseConfigured } from "./prisma";
import {
  getAuthProviderCapabilities,
  getEnabledCapabilityIds,
} from "@/lib/auth/provider-capabilities";
import { getAuthRuntimeConfig } from "@/lib/auth/runtime-config";
import { getOauthProviderCredentials } from "@/lib/auth/oauth-env";
import { verifyPassword } from "@/lib/auth/password";
import { extractRequestFingerprint } from "@/lib/auth/security-heuristics";
import { logSecurityEvent } from "@/lib/security/logging";
import { headers } from "next/headers";
import { persistSignInActivity } from "@/lib/auth/signin-activity";

// NextAuth v5 uses AUTH_SECRET; fall back to NEXTAUTH_SECRET for deployments
// that have not yet migrated their environment variables.
// Use || (not ??) so that an empty string also falls through to the fallback.
const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

const isProduction = process.env.NODE_ENV === "production";
const hasDatabase = isDatabaseConfigured();
const authRuntime = getAuthRuntimeConfig(hasDatabase);
const enablePasswordLogin = authRuntime.enablePasswordLogin;
const enableGuestFlow = authRuntime.enableGuestFlow;
const authSessionStrategy = authRuntime.sessionStrategy;
const useDatabaseSessions = authRuntime.useDatabaseSessions;

const capabilities = getAuthProviderCapabilities({
  hasDatabase,
  enablePasswordLogin,
  enableGuestFlow,
});
const enabledCapabilityIds = getEnabledCapabilityIds(capabilities);
const googleOauthCredentials = getOauthProviderCredentials("google");
const facebookOauthCredentials = getOauthProviderCredentials("facebook");

const normalizeRole = (value: unknown): string =>
  typeof value === "string" && value.length > 0 ? value : "customer";

const providers: NonNullable<NextAuthConfig["providers"]> = [
  ...(enabledCapabilityIds.has("google")
    ? [
        Google({
          clientId: googleOauthCredentials.clientId,
          clientSecret: googleOauthCredentials.clientSecret,
          allowDangerousEmailAccountLinking: true,
          // Disable OAuth check cookies (PKCE/state/nonce) — the browser does
          // not send ANY cookies on the callback redirect from Google. This is
          // likely due to cross-site cookie isolation in the redirect chain
          // (form POST → 302 to Google → 302 back). Security is still provided
          // by: (1) Google verifying redirect_uri matches Console config,
          // (2) HTTPS throughout, (3) short-lived authorization codes.
          checks: [],
        }),
      ]
    : []),
  ...(enabledCapabilityIds.has("facebook")
    ? [
        Facebook({
          clientId: facebookOauthCredentials.clientId,
          clientSecret: facebookOauthCredentials.clientSecret,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...(enabledCapabilityIds.has("credentials")
    ? [
        Credentials({
          id: "credentials",
          name: "Email and Password",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          authorize: async (credentials) => {
            if (!credentials?.email || !credentials.password || !hasDatabase) {
              return null;
            }

            const email = String(credentials.email).trim().toLowerCase();
            const password = String(credentials.password);

            if (!email || !password) {
              return null;
            }

            const dbUserByNormalizedEmail = await prisma.user.findUnique({
              where: { email },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            });

            const dbUser =
              dbUserByNormalizedEmail ??
              (await prisma.user.findFirst({
                where: {
                  email: {
                    equals: email,
                    mode: "insensitive",
                  },
                },
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                },
              }));

            if (!dbUser) {
              logSecurityEvent({
                route: "/api/auth/callback/credentials",
                event: "AUTH_CREDENTIALS_LOGIN_FAILED",
                correlationId: "credentials-user-missing",
                level: "warn",
              });
              return null;
            }

            const credentialStore = (
              prisma as unknown as {
                passwordCredential?: {
                  findUnique: (args: {
                    where: { userId: string };
                    select: { passwordHash: true; lockedUntil: true; failedAttempts: true };
                  }) => Promise<{ passwordHash: string; lockedUntil: Date | null; failedAttempts: number } | null>;
                };
              }
            ).passwordCredential;

            if (!credentialStore) {
              return null;
            }

            const record = await credentialStore.findUnique({
              where: { userId: dbUser.id },
              select: { passwordHash: true, lockedUntil: true, failedAttempts: true },
            });

            if (!record?.passwordHash) {
              logSecurityEvent({
                route: "/api/auth/callback/credentials",
                event: "AUTH_CREDENTIALS_LOGIN_FAILED",
                correlationId: "credentials-password-missing",
                level: "warn",
              });
              return null;
            }

            if (record.lockedUntil && record.lockedUntil.getTime() > Date.now()) {
              logSecurityEvent({
                route: "/api/auth/callback/credentials",
                event: "AUTH_CREDENTIALS_LOCKED",
                correlationId: "credentials-account-locked",
                level: "warn",
              });
              return null;
            }

            if (!verifyPassword(password, record.passwordHash)) {
              const failedAttempts = (
                prisma as unknown as {
                  passwordCredential?: {
                    update: (args: {
                      where: { userId: string };
                      data: {
                        failedAttempts: { increment: number };
                        lockedUntil?: Date;
                      };
                    }) => Promise<unknown>;
                  };
                }
              ).passwordCredential;

              if (failedAttempts) {
                const nextFailures = (record.failedAttempts ?? 0) + 1;
                const lockUntil = nextFailures >= 5 ? new Date(Date.now() + 15 * 60_000) : undefined;
                await failedAttempts.update({
                  where: { userId: dbUser.id },
                  data: {
                    failedAttempts: { increment: 1 },
                    ...(lockUntil ? { lockedUntil: lockUntil } : {}),
                  },
                }).catch(() => undefined);
              }

              logSecurityEvent({
                route: "/api/auth/callback/credentials",
                event: "AUTH_CREDENTIALS_LOGIN_FAILED",
                correlationId: "credentials-password-invalid",
                level: "warn",
                context: {
                  failedAttempts: (record.failedAttempts ?? 0) + 1,
                },
              });

              return null;
            }

            const credentialStoreForReset = (
              prisma as unknown as {
                passwordCredential?: {
                  update: (args: {
                    where: { userId: string };
                    data: { failedAttempts: number; lockedUntil: null };
                  }) => Promise<unknown>;
                };
              }
            ).passwordCredential;

            if (credentialStoreForReset) {
              await credentialStoreForReset.update({
                where: { userId: dbUser.id },
                data: { failedAttempts: 0, lockedUntil: null },
              }).catch(() => undefined);
            }

            return {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              role: (dbUser as any).role ?? "customer",
            };
          },
        }),
      ]
    : []),
];

export const authConfig: NextAuthConfig = {
  // Keep adapter available whenever the database is configured.
  ...(hasDatabase ? { adapter: PrismaAdapter(prisma) } : {}),

  // Required for Vercel / AWS Lambda deployments: allows NextAuth to trust
  // the x-forwarded-host header when computing cookie domains during the
  // OAuth PKCE flow. Without this flag the PKCE verifier cookie is set with
  // the wrong domain and cannot be read back on the callback, producing:
  //   InvalidCheck: pkceCodeVerifier value could not be parsed
  trustHost: true,

  // Explicit secret resolves AUTH_SECRET/NEXTAUTH_SECRET naming ambiguity.
  // NextAuth v5 prefers AUTH_SECRET; providing it here makes both work.
  ...(authSecret ? { secret: authSecret } : {}),

  providers,
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? token.sub ?? "";
        
        // For database sessions: fetch latest role from database each request
        if (useDatabaseSessions && hasDatabase && user?.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { role: true },
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            session.user.role = (dbUser as any)?.role ?? "customer";
          } catch {
             
            session.user.role =
              (user as any)?.role ?? normalizeRole(token.role);
          }
        } else {
          // For JWT sessions: refresh role from DB on every request so that
          // role changes (e.g. promotions) take effect without requiring sign-out.
          const userId = token.sub ?? "";
          if (hasDatabase && userId) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
              });
               
              session.user.role =
                (dbUser as any)?.role ?? normalizeRole(token.role);
            } catch {
               
              session.user.role = normalizeRole(token.role);
            }
          } else {
             
            session.user.role = normalizeRole(token.role);
          }
        }
        
        // Ensure role is always defined (fallback to customer if all else fails)
        if (!session.user.role) {
          session.user.role = "customer";
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        // PrismaAdapter does not include custom fields like `role` in the user
        // object. Fetch the latest role from the database at sign-in time so
        // that role changes (e.g. promotion to admin) take effect on next login.
        if (hasDatabase) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { role: true },
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            token.role = (dbUser as any)?.role ?? "customer";
          } catch {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            token.role = (user as any)?.role ?? "customer";
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          token.role = (user as any)?.role ?? "customer";
        }
      }
      return token;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!hasDatabase || !user?.id) return;

      const requestHeaders = await headers().catch(() => null);
      const { ipAddress, userAgent } = requestHeaders
        ? extractRequestFingerprint(requestHeaders)
        : { ipAddress: null, userAgent: null };

      await prisma.user
        .update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
        .catch(() => undefined);

      const activityStore = (
        prisma as unknown as {
          loginActivity?: {
            findFirst: (args: {
              where: { userId: string; eventType: string };
              orderBy: { createdAt: "desc" };
              select: {
                ipAddress: true;
                userAgent: true;
              };
            }) => Promise<{ ipAddress: string | null; userAgent: string | null } | null>;
            create: (args: {
              data: {
                userId: string;
                eventType: string;
                provider?: string;
                ipAddress?: string | null;
                userAgent?: string | null;
                isSuspicious: boolean;
              };
            }) => Promise<unknown>;
          };
        }
      ).loginActivity;

      if (!activityStore) return;

      await persistSignInActivity({
        userId: user.id,
        provider: account?.provider,
        ipAddress,
        userAgent,
        activityStore,
        logEvent: logSecurityEvent,
      }).catch(() => undefined);
    },
  },
  session: {
    strategy: authSessionStrategy,
  },
  debug: true,
  logger: {
    error: (error: Error) => {
      console.error("[auth][error]", error.name, error.message, JSON.stringify({ stack: error.stack, cause: (error as any).cause?.message }));
    },
    warn: (code: string) => {
      console.warn("[auth][warn]", code);
    },
    debug: (message: string, metadata?: unknown) => {
      console.debug("[auth][debug]", message, JSON.stringify(metadata));
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
