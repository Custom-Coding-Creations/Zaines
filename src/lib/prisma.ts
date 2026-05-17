import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Check if DATABASE_URL is configured
export function isDatabaseConfigured(): boolean {
  return (
    !!process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
  );
}

// Create a connection pool with fallback for missing DATABASE_URL
function createPool(): Pool {
  if (!isDatabaseConfigured()) {
    // In development without DATABASE_URL, create a dummy pool that won't connect
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  DATABASE_URL is not set. Database operations will fail.\n" +
          "   To fix: Create a .env file with DATABASE_URL=postgresql://user:password@localhost:5432/dbname",
      );
    }
    // Create a pool with max: 0 so it initializes but never connects
    return new Pool({
      connectionString: "postgresql://localhost:5432/notconfigured",
      max: 0,
    });
  }

  try {
    return new Pool({ connectionString: process.env.DATABASE_URL });
  } catch (error) {
    console.error("Failed to initialize PostgreSQL pool", error);
    return new Pool({
      connectionString: "postgresql://localhost:5432/notconfigured",
      max: 0,
    });
  }
}

// Create a connection pool
const pool = globalForPrisma.pool ?? createPool();
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
