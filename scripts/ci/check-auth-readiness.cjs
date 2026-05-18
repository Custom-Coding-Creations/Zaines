#!/usr/bin/env node

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toBool(value, defaultValue) {
  if (value === undefined) return defaultValue;
  return value.trim().toLowerCase() !== "false";
}

function getSessionStrategy(hasDatabase, databaseSessionsFlag) {
  const databaseSessionsEnabled =
    typeof databaseSessionsFlag === "string" && databaseSessionsFlag.trim().toLowerCase() === "true";

  return hasDatabase && databaseSessionsEnabled ? "database" : "jwt";
}

function isPlaceholder(value) {
  if (!hasValue(value)) return false;
  const lowered = value.trim().toLowerCase();
  return (
    lowered.includes("your_") ||
    lowered.includes("placeholder") ||
    lowered.includes("example")
  );
}

function getDefinedEnvKeys(keys) {
  return keys.filter((key) => hasValue(process.env[key]));
}

function checkOauthProviderEnvConflicts(provider, aliases, failures, warnings) {
  const definedClientIdKeys = getDefinedEnvKeys(aliases.clientId);
  const definedClientSecretKeys = getDefinedEnvKeys(aliases.clientSecret);

  if (definedClientIdKeys.length > 1) {
    failures.push(
      `${provider} OAuth client id is defined in multiple env keys (${definedClientIdKeys.join(
        ", ",
      )}). Keep only one key to avoid drift.`,
    );
  }

  if (definedClientSecretKeys.length > 1) {
    failures.push(
      `${provider} OAuth client secret is defined in multiple env keys (${definedClientSecretKeys.join(
        ", ",
      )}). Keep only one key to avoid drift.`,
    );
  }

  const hasClientId = definedClientIdKeys.length > 0;
  const hasClientSecret = definedClientSecretKeys.length > 0;
  if (hasClientId !== hasClientSecret) {
    const message = `${provider} OAuth env is partially configured (clientId=${hasClientId}, clientSecret=${hasClientSecret}).`;
    if (isProduction) {
      failures.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (hasClientId && hasClientSecret) {
    const selectedClientId = process.env[definedClientIdKeys[0]];
    const selectedClientSecret = process.env[definedClientSecretKeys[0]];
    if (isPlaceholder(selectedClientId) || isPlaceholder(selectedClientSecret)) {
      const message = `${provider} OAuth env uses placeholder credentials in ${definedClientIdKeys[0]} and/or ${definedClientSecretKeys[0]}.`;
      if (isProduction) {
        failures.push(message);
      } else {
        warnings.push(message);
      }
    }
  }
}

const hasAuthSecret = hasValue(process.env.AUTH_SECRET) || hasValue(process.env.NEXTAUTH_SECRET);
const hasDatabaseUrl = hasValue(process.env.DATABASE_URL);
const isProduction = (process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const sessionStrategy = getSessionStrategy(hasDatabaseUrl, process.env.AUTH_ENABLE_DATABASE_SESSIONS);
const enablePasswordLogin = toBool(process.env.AUTH_ENABLE_PASSWORD_LOGIN, true);
const enableGuestFlow = toBool(process.env.AUTH_ENABLE_GUEST_FLOW, true);

const failures = [];
const warnings = [];

const oauthAliasRegistry = {
  Google: {
    clientId: ["AUTH_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"],
    clientSecret: [
      "AUTH_GOOGLE_CLIENT_SECRET",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_OAUTH_CLIENT_SECRET",
    ],
  },
  Facebook: {
    clientId: ["AUTH_FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_ID"],
    clientSecret: ["AUTH_FACEBOOK_CLIENT_SECRET", "FACEBOOK_CLIENT_SECRET"],
  },
};

for (const [provider, aliases] of Object.entries(oauthAliasRegistry)) {
  checkOauthProviderEnvConflicts(provider, aliases, failures, warnings);
}

if (!hasAuthSecret) {
  failures.push("AUTH secret missing. Set AUTH_SECRET (preferred) or NEXTAUTH_SECRET.");
}

if (sessionStrategy === "database" && !hasDatabaseUrl) {
  failures.push("Database sessions require DATABASE_URL, but DATABASE_URL is missing.");
}

if (!hasDatabaseUrl) {
  warnings.push("DATABASE_URL is missing. JWT sessions can still run, but DB-backed features will fail.");
}

if (!enablePasswordLogin) {
  warnings.push("Password login is disabled via AUTH_ENABLE_PASSWORD_LOGIN=false.");
}

if (!enableGuestFlow) {
  warnings.push("Guest flow is disabled via AUTH_ENABLE_GUEST_FLOW=false.");
}

console.log("Auth readiness check");
console.log(`  NODE_ENV: ${process.env.NODE_ENV || "(unset)"}`);
console.log(`  hasAuthSecret: ${hasAuthSecret}`);
console.log(`  hasDatabaseUrl: ${hasDatabaseUrl}`);
console.log(`  sessionStrategy: ${sessionStrategy}`);
console.log(`  enablePasswordLogin: ${enablePasswordLogin}`);
console.log(`  enableGuestFlow: ${enableGuestFlow}`);

if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`  - ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

if (isProduction && !hasDatabaseUrl) {
  console.error("\nProduction safety check failed: DATABASE_URL must be set in production.");
  process.exit(1);
}

console.log("\nPASS: auth runtime prerequisites look valid.");
