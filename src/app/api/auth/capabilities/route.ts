import { NextResponse } from "next/server";
import { getAuthProviderCapabilities } from "@/lib/auth/provider-capabilities";
import { getOauthProviderDebugInfo } from "@/lib/auth/oauth-env";
import { getAuthRuntimeConfig } from "@/lib/auth/runtime-config";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

const OAUTH_SCHEMA_REQUIREMENTS: Record<string, string[]> = {
  users: ["id", "email", "emailVerified", "name", "image", "role"],
  accounts: [
    "id",
    "userId",
    "type",
    "provider",
    "providerAccountId",
    "refresh_token",
    "access_token",
    "expires_at",
    "token_type",
    "scope",
    "id_token",
    "session_state",
  ],
  sessions: ["id", "sessionToken", "userId", "expires"],
};

async function isCredentialStoreOperational(hasDatabase: boolean): Promise<boolean> {
  if (!hasDatabase) return false;

  const credentialStore = (
    prisma as unknown as {
      passwordCredential?: {
        findFirst: (args: { select: { id: boolean } }) => Promise<{ id: string } | null>;
      };
    }
  ).passwordCredential;

  if (!credentialStore) {
    return false;
  }

  try {
    await credentialStore.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

async function getMissingOauthSchemaColumns(hasDatabase: boolean): Promise<string[]> {
  if (!hasDatabase) return [];

  const missing: string[] = [];

  try {
    for (const [table, requiredColumns] of Object.entries(OAUTH_SCHEMA_REQUIREMENTS)) {
      const rows = await (prisma as unknown as {
        $queryRawUnsafe: (query: string, ...params: unknown[]) => Promise<Array<{ column_name: string }>>;
      }).$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        table,
      );

      const actualColumns = new Set(rows.map((row) => row.column_name));

      if (actualColumns.size === 0) {
        missing.push(`${table}.*`);
        continue;
      }

      for (const column of requiredColumns) {
        if (!actualColumns.has(column)) {
          missing.push(`${table}.${column}`);
        }
      }
    }
  } catch {
    // If schema inspection fails, leave OAuth state unchanged and rely on existing checks.
    return [];
  }

  return missing;
}

export async function GET() {
  const hasDatabase = isDatabaseConfigured();
  const authRuntime = getAuthRuntimeConfig(hasDatabase);
  const [credentialStoreOperational, missingOauthSchemaColumns] = await Promise.all([
    isCredentialStoreOperational(hasDatabase),
    getMissingOauthSchemaColumns(hasDatabase),
  ]);

  const oauthSchemaOperational = missingOauthSchemaColumns.length === 0;

  const capabilities = getAuthProviderCapabilities({
    hasDatabase,
    enablePasswordLogin: authRuntime.enablePasswordLogin,
    enableGuestFlow: authRuntime.enableGuestFlow,
  }).map((capability) => {
    if (
      (capability.id === "google" || capability.id === "facebook") &&
      capability.enabled &&
      !oauthSchemaOperational
    ) {
      return {
        ...capability,
        enabled: false,
        reasonDisabled: "oauth_schema_unavailable",
      };
    }

    if (capability.id !== "credentials") {
      return capability;
    }

    if (!credentialStoreOperational) {
      return {
        ...capability,
        enabled: false,
        reasonDisabled: "credential_store_unavailable",
      };
    }

    return capability;
  });

  const enabledProviderIds = new Set(
    capabilities.filter((capability) => capability.enabled).map((capability) => capability.id),
  );
  const hasEnabledAuthProvider =
    enabledProviderIds.has("credentials") ||
    enabledProviderIds.has("google") ||
    enabledProviderIds.has("facebook");

  const authIssues: string[] = [];
  if (!authRuntime.hasAuthSecret) {
    authIssues.push("missing_auth_secret");
  }
  if (!oauthSchemaOperational) {
    authIssues.push("oauth_schema_unavailable");
  }
  if (!hasEnabledAuthProvider) {
    authIssues.push("no_auth_provider_enabled");
  }

  const oauthDebug = {
    google: getOauthProviderDebugInfo("google"),
    facebook: getOauthProviderDebugInfo("facebook"),
  };

  return NextResponse.json({
    capabilities,
    authOperational: authIssues.length === 0,
    authIssues,
    oauthSchemaIssues: missingOauthSchemaColumns,
    oauthDebug,
    generatedAt: new Date().toISOString(),
  });
}
