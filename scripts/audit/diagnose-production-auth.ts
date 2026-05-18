#!/usr/bin/env tsx
/**
 * Production Auth Schema Diagnostic
 *
 * This script identifies missing columns in production auth tables that cause
 * OAuth adapter failures. Run this first to see exactly what's missing.
 *
 * Usage:
 *   pnpm exec tsx scripts/audit/diagnose-production-auth.ts
 *
 * With production database:
 *   DATABASE_URL="postgresql://..." pnpm exec tsx scripts/audit/diagnose-production-auth.ts
 */

import * as fs from "fs";
import * as path from "path";

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface TableSchema {
  [tableName: string]: {
    [columnName: string]: {
      type: string;
      nullable: boolean;
    };
  };
}

// Required schema for Auth.js PrismaAdapter
// Source: https://authjs.dev/reference/adapter/prisma
const REQUIRED_SCHEMA: TableSchema = {
  users: {
    id: { type: "text", nullable: false },
    name: { type: "text", nullable: true },
    email: { type: "text", nullable: true },
    emailVerified: { type: "timestamp", nullable: true },
    image: { type: "text", nullable: true },
  },
  accounts: {
    id: { type: "text", nullable: false },
    userId: { type: "text", nullable: false },
    type: { type: "text", nullable: false },
    provider: { type: "text", nullable: false },
    providerAccountId: { type: "text", nullable: false },
    refresh_token: { type: "text", nullable: true },
    access_token: { type: "text", nullable: true },
    expires_at: { type: "bigint", nullable: true },
    token_type: { type: "text", nullable: true },
    scope: { type: "text", nullable: true },
    id_token: { type: "text", nullable: true },
    session_state: { type: "text", nullable: true },
  },
  sessions: {
    id: { type: "text", nullable: false },
    sessionToken: { type: "text", nullable: false },
    userId: { type: "text", nullable: false },
    expires: { type: "timestamp", nullable: false },
  },
  verification_tokens: {
    identifier: { type: "text", nullable: false },
    token: { type: "text", nullable: false },
    expires: { type: "timestamp", nullable: false },
  },
};

// Try to import prisma, fall back to direct SQL if unavailable
let prisma: any = null;

async function getPrismaClient() {
  if (prisma) return prisma;

  try {
    // Dynamic import to get prisma client from project
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../src/lib/prisma");
    prisma = mod.prisma;
    return prisma;
  } catch {
    // Try alternative if require fails
    return null;
  }
}

async function querySchema(client: any): Promise<ColumnInfo[]> {
  const result = await client.$queryRaw<ColumnInfo[]>`
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    AND t.table_name IN ('users', 'accounts', 'sessions', 'verification_tokens')
    ORDER BY t.table_name, c.ordinal_position;
  `;
  return result;
}

async function main() {
  console.log("🔍 Auth Schema Diagnostic\n");

  const client = await getPrismaClient();

  if (!client) {
    console.error("❌ Cannot connect to database. Ensure DATABASE_URL is set.");
    process.exit(2);
  }

  try {
    const columns = await querySchema(client);

    if (columns.length === 0) {
      console.error("❌ No auth tables found in database.");
      console.error("   Run: pnpm prisma migrate deploy");
      process.exit(1);
    }

    // Build actual schema from query results
    const actualSchema: TableSchema = {};
    for (const col of columns) {
      if (!actualSchema[col.table_name]) {
        actualSchema[col.table_name] = {};
      }
      actualSchema[col.table_name][col.column_name] = {
        type: col.data_type,
        nullable: col.is_nullable === "YES",
      };
    }

    // Compare required vs actual
    const issues: Array<{
      severity: "CRITICAL" | "WARNING";
      table: string;
      column: string;
      message: string;
    }> = [];

    for (const [tableName, columns] of Object.entries(REQUIRED_SCHEMA)) {
      if (!actualSchema[tableName]) {
        issues.push({
          severity: "CRITICAL",
          table: tableName,
          column: "*",
          message: `Table missing`,
        });
        continue;
      }

      for (const [columnName] of Object.entries(columns)) {
        if (!actualSchema[tableName][columnName]) {
          // Determine severity based on column
          const severity =
            columnName === "id" ||
            columnName === "userId" ||
            columnName === "provider" ||
            columnName === "providerAccountId"
              ? "CRITICAL"
              : "WARNING";

          issues.push({
            severity,
            table: tableName,
            column: columnName,
            message: `Column missing (required by Auth.js)`,
          });
        }
      }
    }

    // Report findings
    if (issues.length === 0) {
      console.log("✅ Auth schema is valid!\n");
      console.log("All required tables and columns are present.");
      console.log("OAuth flows should work correctly.");
      process.exit(0);
    }

    console.log(`❌ Auth schema has ${issues.length} issues:\n`);

    const critical = issues.filter((i) => i.severity === "CRITICAL");
    const warnings = issues.filter((i) => i.severity === "WARNING");

    if (critical.length > 0) {
      console.log("🔴 CRITICAL (will break OAuth):");
      for (const issue of critical) {
        if (issue.column === "*") {
          console.log(`  • ${issue.table}: ${issue.message}`);
        } else {
          console.log(
            `  • ${issue.table}.${issue.column}: ${issue.message}`,
          );
        }
      }
      console.log("");
    }

    if (warnings.length > 0) {
      console.log("🟡 WARNING (may cause issues):");
      for (const issue of warnings) {
        console.log(
          `  • ${issue.table}.${issue.column}: ${issue.message}`,
        );
      }
      console.log("");
    }

    // Remediation steps
    console.log("📋 Remediation:\n");

    if (critical.some((i) => i.column === "*")) {
      console.log("1. Run migrations to create missing tables:");
      console.log("   pnpm prisma migrate deploy\n");
    }

    if (issues.some((i) => i.column !== "*")) {
      console.log("2. Check/run pending migrations:");
      console.log("   pnpm prisma migrate status\n");
      console.log("3. If migrations are pending:");
      console.log("   pnpm prisma migrate deploy\n");
      console.log("4. If migrations are applied but columns still missing:");
      console.log("   • Check DATABASE_URL points to correct database");
      console.log("   • Verify Prisma schema is up to date");
      console.log("   • Run: pnpm prisma db pull  # to resync schema\n");
    }

    // Schema comparison output
    console.log("📊 Schema Comparison:\n");
    console.log("Table: accounts (OAuth adapter focus)");

    const accountsExpected = REQUIRED_SCHEMA.accounts;
    const accountsActual = actualSchema.accounts || {};

    for (const [col, spec] of Object.entries(accountsExpected)) {
      const exists = col in accountsActual;
      const status = exists ? "✓" : "✗";
      console.log(`  ${status} ${col}: ${spec.type} (nullable: ${spec.nullable})`);
    }

    console.log("");

    // Generate remediation SQL if needed
    if (issues.length > 0) {
      console.log("💾 Manual remediation (if migrations don't work):\n");
      console.log(
        "Get migration SQL from pending migrations and run directly:",
      );
      console.log("  pnpm prisma migrate resolve --rolled-back <migration_name>");
      console.log("  pnpm prisma migrate deploy\n");
    }

    process.exit(1);
  } catch (error) {
    console.error("❌ Error querying schema:", error);
    console.error(
      "\nEnsure:",
      "- DATABASE_URL is set correctly",
      "- Postgres is running",
      "- You have SELECT permission on information_schema",
    );
    process.exit(2);
  }
}

main();
