import { isDatabaseConfigured, prisma } from "@/lib/prisma";

type SchemaColumn = {
  column: string;
  type: string;
  required: boolean;
};

type TableSchema = {
  columns: SchemaColumn[];
};

const REQUIRED_SCHEMA: Record<string, TableSchema> = {
  users: {
    columns: [
      { column: "id", type: "TEXT", required: true },
      { column: "email", type: "TEXT", required: false },
      { column: "emailVerified", type: "TIMESTAMP", required: false },
      { column: "name", type: "TEXT", required: false },
      { column: "image", type: "TEXT", required: false },
      { column: "role", type: "TEXT", required: true },
      { column: "createdAt", type: "TIMESTAMP", required: true },
      { column: "updatedAt", type: "TIMESTAMP", required: true },
    ],
  },
  accounts: {
    columns: [
      { column: "id", type: "TEXT", required: true },
      { column: "userId", type: "TEXT", required: true },
      { column: "type", type: "TEXT", required: true },
      { column: "provider", type: "TEXT", required: true },
      { column: "providerAccountId", type: "TEXT", required: true },
      { column: "refresh_token", type: "TEXT", required: false },
      { column: "access_token", type: "TEXT", required: false },
      { column: "expires_at", type: "INTEGER", required: false },
      { column: "token_type", type: "TEXT", required: false },
      { column: "scope", type: "TEXT", required: false },
      { column: "id_token", type: "TEXT", required: false },
      { column: "session_state", type: "TEXT", required: false },
    ],
  },
  sessions: {
    columns: [
      { column: "id", type: "TEXT", required: true },
      { column: "sessionToken", type: "TEXT", required: true },
      { column: "userId", type: "TEXT", required: true },
      { column: "expires", type: "TIMESTAMP", required: true },
    ],
  },
  verification_tokens: {
    columns: [
      { column: "identifier", type: "TEXT", required: true },
      { column: "token", type: "TEXT", required: true },
      { column: "expires", type: "TIMESTAMP", required: true },
    ],
  },
};

async function getTableColumns(tableName: string): Promise<Set<string>> {
  try {
    const result = await (prisma as any).$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      tableName,
    );
    return new Set((result as Array<{ column_name: string }>).map((r) => r.column_name));
  } catch (error) {
    return new Set();
  }
}

async function validateSchema(): Promise<{
  valid: boolean;
  issues: Array<{
    table: string;
    column: string;
    issue: string;
  }>;
}> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured. Cannot validate schema.");
  }

  const issues: Array<{ table: string; column: string; issue: string }> = [];

  for (const [tableName, tableSchema] of Object.entries(REQUIRED_SCHEMA)) {
    const actualColumns = await getTableColumns(tableName);

    if (actualColumns.size === 0) {
      issues.push({
        table: tableName,
        column: "N/A",
        issue: `Table "${tableName}" does not exist in database`,
      });
      continue;
    }

    for (const col of tableSchema.columns) {
      if (!actualColumns.has(col.column)) {
        const severity = col.required ? "MISSING_REQUIRED" : "MISSING_OPTIONAL";
        issues.push({
          table: tableName,
          column: col.column,
          issue: severity,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

async function main() {
  console.log("Starting auth schema validation...\n");

  const result = await validateSchema();

  if (result.valid) {
    console.log("✓ Auth schema validation PASSED");
    console.log(`  All required tables and columns exist in the database.`);
    process.exitCode = 0;
  } else {
    console.error("✗ Auth schema validation FAILED\n");
    console.error("Issues found:");

    const byTable = new Map<string, Array<{ column: string; issue: string }>>();
    for (const issue of result.issues) {
      if (!byTable.has(issue.table)) {
        byTable.set(issue.table, []);
      }
      byTable.get(issue.table)!.push({ column: issue.column, issue: issue.issue });
    }

    for (const [table, issues] of byTable) {
      console.error(`\n  Table: ${table}`);
      for (const issue of issues) {
        const prefix = issue.issue === "MISSING_REQUIRED" ? "  ⚠ CRITICAL" : "  ℹ";
        console.error(`    ${prefix}: ${issue.column} - ${issue.issue}`);
      }
    }

    console.error("\nRemedy:");
    console.error("  1. Run `prisma migrate deploy` to apply pending migrations.");
    console.error("  2. If migrations are already applied, verify production DATABASE_URL points to the correct database.");
    console.error("  3. Re-run this script after fixes: pnpm audit:auth-schema-validation");

    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Auth schema validation failed:", error);
    process.exitCode = 2;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
