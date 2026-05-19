/**
 * OAuth Configuration Regression Tests
 *
 * Guards against the two failure modes that broke Google OAuth:
 * 1. OIDC discovery bypass — explicit endpoint overrides leave jwks_uri undefined
 * 2. Database schema drift — Prisma schema defines columns that don't exist in DB
 *
 * Run: pnpm vitest tests/oauth-config-regression.test.ts
 */
import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";

describe("OAuth Configuration Regression Guards", () => {
  describe("Google provider OIDC discovery", () => {
    it("should NOT have explicit token/userinfo/authorization endpoint overrides", async () => {
      // Read the auth config source to ensure no endpoint overrides are present.
      // Overrides bypass OIDC discovery which leaves jwks_uri undefined,
      // breaking id_token signature verification.
      const authSource = fs.readFileSync(
        path.resolve(__dirname, "../src/lib/auth.ts"),
        "utf-8",
      );

      // These patterns indicate endpoint overrides that break OIDC discovery
      expect(authSource).not.toMatch(
        /Google\(\s*\{[^}]*authorization\s*:\s*["'`{]/s,
      );
      expect(authSource).not.toMatch(
        /Google\(\s*\{[^}]*token\s*:\s*["'`{]/s,
      );
      expect(authSource).not.toMatch(
        /Google\(\s*\{[^}]*userinfo\s*:\s*["'`{]/s,
      );
    });

    it("should use type:oidc provider (not oauth) for id_token support", () => {
      // The Google provider from @auth/core must be type "oidc" so that
      // processAuthorizationCodeResponse validates the id_token using JWKS.
      const googleProvider = require("@auth/core/providers/google").default;
      const config = googleProvider({ clientId: "test", clientSecret: "test" });
      expect(config.type).toBe("oidc");
      expect(config.issuer).toBe("https://accounts.google.com");
    });

    it("should configure Google with only clientId, clientSecret, and allowDangerousEmailAccountLinking", async () => {
      // Any extra config (authorization, token, userinfo, checks) risks breaking discovery
      const authSource = fs.readFileSync(
        path.resolve(__dirname, "../src/lib/auth.ts"),
        "utf-8",
      );

      // Find the Google({ ... }) block
      const googleMatch = authSource.match(
        /Google\(\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\)/s,
      );
      expect(googleMatch).not.toBeNull();

      const googleConfig = googleMatch![1];
      // Only allowed keys in Google config
      const allowedKeys = [
        "clientId",
        "clientSecret",
        "allowDangerousEmailAccountLinking",
      ];
      // Extract key names from the config block
      const configKeys = [...googleConfig.matchAll(/^\s*(\w+)\s*:/gm)].map(
        (m) => m[1],
      );
      for (const key of configKeys) {
        expect(allowedKeys).toContain(key);
      }
    });
  });

  describe("Database schema sync (auth tables)", () => {
    it("should have all User model fields defined in the Prisma schema", () => {
      const schema = fs.readFileSync(
        path.resolve(__dirname, "../prisma/schema.prisma"),
        "utf-8",
      );

      // Extract User model block
      const userModel = schema.match(
        /model User \{([\s\S]*?)^\}/m,
      );
      expect(userModel).not.toBeNull();
      const userBlock = userModel![1];

      // These fields are required by PrismaAdapter + our app
      const requiredFields = [
        "id",
        "name",
        "email",
        "emailVerified",
        "image",
        "accounts",
        "sessions",
      ];

      for (const field of requiredFields) {
        expect(userBlock).toContain(field);
      }
    });

    it("should have all Account model fields required by PrismaAdapter", () => {
      const schema = fs.readFileSync(
        path.resolve(__dirname, "../prisma/schema.prisma"),
        "utf-8",
      );

      const accountModel = schema.match(
        /model Account \{([\s\S]*?)^\}/m,
      );
      expect(accountModel).not.toBeNull();
      const accountBlock = accountModel![1];

      // Fields required by @auth/prisma-adapter for OAuth
      const requiredFields = [
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
      ];

      for (const field of requiredFields) {
        expect(accountBlock).toContain(field);
      }

      // Must have compound unique for PrismaAdapter's getUserByAccount
      expect(accountBlock).toMatch(/@@unique\(\[provider,\s*providerAccountId\]\)/);
    });

    it("should have a migration for every schema field on the User model", () => {
      // Ensure smsNotificationsEnabled (and any future fields) have migrations
      const schema = fs.readFileSync(
        path.resolve(__dirname, "../prisma/schema.prisma"),
        "utf-8",
      );

      const userModel = schema.match(
        /model User \{([\s\S]*?)^\}/m,
      );
      expect(userModel).not.toBeNull();

      // Extract scalar fields (not relations)
      const scalarFields = [...userModel![1].matchAll(
        /^\s+(\w+)\s+(String|Boolean|DateTime|Int|Float)/gm,
      )].map((m) => m[1]);

      // Read all migration SQL files
      const migrationsDir = path.resolve(__dirname, "../prisma/migrations");
      const migrationDirs = fs.readdirSync(migrationsDir).filter(
        (d) => !d.endsWith(".toml") && fs.statSync(path.join(migrationsDir, d)).isDirectory(),
      );
      const allSql = migrationDirs
        .map((d) => {
          const sqlPath = path.join(migrationsDir, d, "migration.sql");
          return fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, "utf-8") : "";
        })
        .join("\n");

      // Each field should appear in at least one migration (CREATE TABLE or ALTER TABLE)
      for (const field of scalarFields) {
        const found =
          allSql.includes(`"${field}"`) || allSql.includes(`${field} `);
        expect(found, `Field "${field}" not found in any migration`).toBe(true);
      }
    });
  });

  describe("PKCE configuration", () => {
    it("should configure PKCE cookie with correct settings for production", () => {
      const authSource = fs.readFileSync(
        path.resolve(__dirname, "../src/lib/auth.ts"),
        "utf-8",
      );

      // Must have explicit PKCE cookie config
      expect(authSource).toContain("pkceCodeVerifier");
      expect(authSource).toContain("__Secure-authjs.pkce.code_verifier");
      // SameSite must be lax for cross-site redirect from Google
      expect(authSource).toMatch(/sameSite.*lax/i);
      // Must have trustHost for serverless environments
      expect(authSource).toContain("trustHost: true");
    });
  });
});
