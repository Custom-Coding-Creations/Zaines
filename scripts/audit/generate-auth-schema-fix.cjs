#!/usr/bin/env node
/**
 * Auth Schema SQL Fix Generator
 *
 * This script generates the SQL commands needed to fix auth table schema.
 * Use this if Prisma migrations cannot be applied directly.
 *
 * Usage:
 *   node scripts/audit/generate-auth-schema-fix.cjs
 *   node scripts/audit/generate-auth-schema-fix.cjs > auth-schema-fix.sql
 *
 * Then apply to production:
 *   psql $DATABASE_URL -f auth-schema-fix.sql
 */

// SQL to ensure auth tables exist with correct schema
const SQL_COMMANDS = {
  ensureUsersTable: `
-- Ensure users table exists with all required columns
CREATE TABLE IF NOT EXISTS "users" (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMP WITH TIME ZONE,
  image TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS image TEXT;
`,

  ensureAccountsTable: `
-- Ensure accounts table exists with OAuth adapter columns
CREATE TABLE IF NOT EXISTS "accounts" (
  id TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,

  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key"
  ON "accounts"(provider, "providerAccountId");

-- Add missing columns to existing accounts table
ALTER TABLE "accounts"
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'oauth',
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "providerAccountId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS expires_at BIGINT,
  ADD COLUMN IF NOT EXISTS token_type TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS id_token TEXT,
  ADD COLUMN IF NOT EXISTS session_state TEXT;

-- Ensure expected unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key"
  ON "accounts"(provider, "providerAccountId");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");
`,

  ensureSessionsTable: `
-- Ensure sessions table exists for database sessions
CREATE TABLE IF NOT EXISTS "sessions" (
  id TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,

  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add missing columns
ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "sessionToken" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expires TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure expected unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- Create indexes
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
`,

  ensureVerificationTokensTable: `
-- Ensure verification_tokens table exists for email verification
CREATE TABLE IF NOT EXISTS "verification_tokens" (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,

  CONSTRAINT "verification_tokens_identifier_token_key" UNIQUE (identifier, token)
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"(token);
`,

  addAuthColumns: `
-- Add auth-related columns if they don't exist
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE;
`,

  createIndexes: `
-- Create additional indexes for auth performance
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"(email);
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
`,
};

// Color codes for CLI output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
};

function main() {
  const outputMode = process.argv[2] || "display";

  if (outputMode === "--raw") {
    // Output raw SQL for piping
    Object.values(SQL_COMMANDS).forEach((sql) => {
      console.log(sql);
      console.log("-- ---\n");
    });
  } else {
    // Display with documentation
    console.log(
      `${colors.bright}${colors.blue}Auth Schema SQL Fix Script${colors.reset}\n`,
    );

    console.log(
      `${colors.bright}This script generates SQL to fix auth schema issues.${colors.reset}\n`,
    );

    console.log(`${colors.bright}Usage:${colors.reset}`);
    console.log(`  1. Generate SQL file:`);
    console.log(
      `     node scripts/audit/generate-auth-schema-fix.cjs --raw > auth-schema-fix.sql\n`,
    );
    console.log(`  2. Review the SQL file:`);
    console.log(`     cat auth-schema-fix.sql\n`);
    console.log(`  3. Apply to production (BACKUP FIRST!):`);
    console.log(
      `     DATABASE_URL="postgresql://..." pnpm exec psql -f auth-schema-fix.sql\n`,
    );
    console.log(`     ${colors.yellow}OR${colors.reset}\n`);
    console.log(
      `     psql YOUR_PRODUCTION_DB_CONNECTION_STRING -f auth-schema-fix.sql\n`,
    );

    console.log(`${colors.bright}Commands included:${colors.reset}`);
    console.log(`  • Ensure users table exists`);
    console.log(`  • Ensure accounts table exists with OAuth columns`);
    console.log(`  • Ensure sessions table exists for database sessions`);
    console.log(`  • Ensure verification_tokens table exists`);
    console.log(`  • Add auth-related columns`);
    console.log(`  • Create performance indexes\n`);

    console.log(
      `${colors.bright}${colors.green}SQL is idempotent - safe to run multiple times${colors.reset}\n`,
    );

    console.log(`${colors.bright}${colors.yellow}IMPORTANT:${colors.reset}`);
    console.log(`  1. Backup your database before running this script`);
    console.log(`  2. Test in development/staging first`);
    console.log(`  3. Run during a maintenance window if possible\n`);

    console.log(
      `${colors.bright}After running this SQL:${colors.reset}`,
    );
    console.log(`  1. Verify schema: pnpm audit:auth-diagnose`);
    console.log(`  2. Test OAuth: Visit /auth/signin`);
    console.log(`  3. Check logs: pnpm audit:admin:auth-health\n`,
    );

    console.log(`${colors.bright}To output raw SQL:${colors.reset}`);
    console.log(`  node scripts/audit/generate-auth-schema-fix.cjs --raw\n`);
  }
}

main();
