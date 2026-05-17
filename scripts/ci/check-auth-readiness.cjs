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

const hasAuthSecret = hasValue(process.env.AUTH_SECRET) || hasValue(process.env.NEXTAUTH_SECRET);
const hasDatabaseUrl = hasValue(process.env.DATABASE_URL);
const isProduction = (process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const sessionStrategy = getSessionStrategy(hasDatabaseUrl, process.env.AUTH_ENABLE_DATABASE_SESSIONS);
const enablePasswordLogin = toBool(process.env.AUTH_ENABLE_PASSWORD_LOGIN, true);
const enableGuestFlow = toBool(process.env.AUTH_ENABLE_GUEST_FLOW, true);

const failures = [];
const warnings = [];

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
