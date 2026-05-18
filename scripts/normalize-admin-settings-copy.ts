import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string, options?: { override?: boolean }): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const override = options?.override ?? false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex < 1) continue;

    const key = line.slice(0, equalIndex).trim();
    if (!key) continue;
    if (!override && process.env[key] !== undefined) continue;

    let value = line.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

const repoRoot = path.resolve(__dirname, "..");

function parseFlagValue(flag: string): string | null {
  const idx = process.argv.findIndex((arg) => arg === flag);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return null;
  return next;
}

const explicitEnvFile = parseFlagValue("--env-file");
const preferPrismaUrl = process.argv.includes("--prefer-postgres-prisma-url");
const preferUnpooledUrl = process.argv.includes("--prefer-unpooled-url");

if (explicitEnvFile) {
  const absoluteEnvPath = path.resolve(repoRoot, explicitEnvFile);
  loadEnvFile(absoluteEnvPath, { override: true });
} else {
  // Prefer deployment-equivalent env values first, then local fallbacks.
  loadEnvFile(path.join(repoRoot, ".env.vercel.production"));
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, ".env"));
}

if (preferPrismaUrl && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

if (preferUnpooledUrl && process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

import { prisma } from "../src/lib/prisma";

type SettingRow = {
  id: string;
  key: string;
  value: string;
};

const REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /doggy daycare/gi, replacement: "private dog boarding" },
  { pattern: /book a playday/gi, replacement: "check availability" },
  { pattern: /only\s+3\s+private\s+suites/gi, replacement: "limited private suites" },
  { pattern: /only\s+3\s+suites/gi, replacement: "limited suites" },
  { pattern: /three-suite/gi, replacement: "limited-suite" },
  { pattern: /three\s+suites/gi, replacement: "limited suite availability" },
];

function normalizeString(input: string): string {
  let output = input;
  for (const { pattern, replacement } of REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function normalizeUnknown(value: unknown): unknown {
  if (typeof value === "string") return normalizeString(value);
  if (Array.isArray(value)) return value.map(normalizeUnknown);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeUnknown(v)]),
    );
  }
  return value;
}

function tryNormalizeStoredValue(raw: string): { normalized: string; changed: boolean } {
  const asString = normalizeString(raw);

  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalizedJson = normalizeUnknown(parsed);
    const serialized = JSON.stringify(normalizedJson);
    return {
      normalized: serialized,
      changed: serialized !== raw,
    };
  } catch {
    return {
      normalized: asString,
      changed: asString !== raw,
    };
  }
}

function previewDiff(before: string, after: string): string {
  const max = 180;
  const compactBefore = before.replace(/\s+/g, " ").slice(0, max);
  const compactAfter = after.replace(/\s+/g, " ").slice(0, max);
  return `before: ${compactBefore}${before.length > max ? "..." : ""}\nafter:  ${compactAfter}${after.length > max ? "..." : ""}`;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const rows = (await prisma.settings.findMany({
    where: { key: { startsWith: "admin." } },
    orderBy: { key: "asc" },
  })) as SettingRow[];

  const updates: Array<{ id: string; key: string; before: string; after: string }> = [];

  for (const row of rows) {
    const { normalized, changed } = tryNormalizeStoredValue(row.value);
    if (changed) {
      updates.push({
        id: row.id,
        key: row.key,
        before: row.value,
        after: normalized,
      });
    }
  }

  if (updates.length === 0) {
    console.log("No legacy phrases found in persisted admin settings.");
    return;
  }

  console.log(`Found ${updates.length} setting record(s) with legacy phrases.`);
  for (const update of updates) {
    console.log(`\n- ${update.key}`);
    console.log(previewDiff(update.before, update.after));
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to persist updates.");
    return;
  }

  for (const update of updates) {
    await prisma.settings.update({
      where: { id: update.id },
      data: { value: update.after },
    });
  }

  console.log(`\nApplied ${updates.length} setting update(s).`);
}

main()
  .catch((error) => {
    console.error("Failed to normalize admin settings copy:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
