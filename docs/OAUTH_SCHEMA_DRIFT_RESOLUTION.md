# OAuth Schema Drift Resolution Guide

## Problem

Production database auth tables are missing columns required by the Auth.js Prisma adapter. This causes OAuth sign-in flows (Google, Facebook) to fail with:

```
The column `(not available)` does not exist in the current database
```

Credentials-based sign-in (email/password) works fine because it doesn't use these columns.

## Root Cause

The Prisma schema expects Auth.js adapter tables with these columns:

**accounts table** (required for OAuth linkage):
- `id`, `userId`, `type`, `provider`, `providerAccountId` (primary keys)
- `refresh_token`, `access_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state` (OAuth token storage)

**sessions table** (required for database sessions):
- `id`, `sessionToken`, `userId`, `expires`

**users table** (required for account storage):
- `id`, `email`, `emailVerified`, `name`, `image`

**verification_tokens table** (required for email verification):
- `identifier`, `token`, `expires`

If production database is missing any of these, OAuth adapter fails.

## Step 1: Diagnose the Exact Problem

Run the diagnostic script to identify exactly which columns are missing:

```bash
# Against production
DATABASE_URL="postgresql://user:pass@prod.db.host/zaines" pnpm audit:auth-diagnose

# Or against local test database
pnpm audit:auth-diagnose
```

This will output:
- ✅ Which tables exist
- ❌ Which columns are missing
- 🔴 CRITICAL issues (will break OAuth)
- 🟡 WARNING issues (may cause problems)
- 📋 Remediation steps

**Example output if accounts table is missing columns:**

```
❌ Auth schema has 5 issues:

🔴 CRITICAL (will break OAuth):
  • accounts.provider: Column missing (required by Auth.js)
  • accounts.providerAccountId: Column missing (required by Auth.js)
  • accounts.access_token: Column missing (required by Auth.js)
  • accounts.refresh_token: Column missing (required by Auth.js)
  • accounts.expires_at: Column missing (required by Auth.js)

📋 Remediation:
1. Run migrations to create missing tables:
   pnpm prisma migrate deploy
```

## Step 2: Identify Missing Migrations

Check if there are pending migrations:

```bash
# Check migration status
DATABASE_URL="postgresql://..." pnpm prisma migrate status

# List pending migrations
pnpm prisma migrate status --verbose
```

You should see:
```
Following migrations have not yet been applied:
  20260510_add_auth_adapter_columns
  20260515_add_session_state_column
```

## Step 3: Apply Migrations

### Option A: If migrations are pending (recommended)

```bash
# Apply all pending migrations
DATABASE_URL="postgresql://user:pass@prod.db.host/zaines" pnpm prisma migrate deploy
```

This is the safest approach. Prisma handles schema validation and rollback on failure.

### Option B: Manual SQL (if migrations are corrupted/lost)

Get the SQL from the Prisma schema and apply manually:

```sql
-- Add missing columns to accounts table
ALTER TABLE "accounts" 
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
```

### Option C: If migrations are applied but columns still missing

This indicates a database/environment mismatch:

```bash
# Verify you're connected to the right database
echo $DATABASE_URL

# Check actual database columns
psql $DATABASE_URL -c "\d accounts"

# If schema doesn't match Prisma schema, pull latest:
pnpm prisma db pull

# Review changes, then regenerate
pnpm prisma generate
```

## Step 4: Verify OAuth Tables

After applying migrations, verify schema is correct:

```bash
# Run diagnostic again
DATABASE_URL="postgresql://..." pnpm audit:auth-diagnose

# Expected output:
# ✅ Auth schema is valid!
# All required tables and columns are present.
# OAuth flows should work correctly.
```

## Step 5: Test OAuth Flows

Once schema is fixed, test OAuth sign-in:

1. Visit sign-in page: https://zainesstayandplay.com/auth/signin
2. Click "Sign in with Google" or "Sign in with Facebook"
3. Complete OAuth flow
4. Verify you're logged in

If it fails, check:
- Auth logs: `pnpm audit:admin:auth-health`
- Database connection: `echo $DATABASE_URL`
- Prisma client regenerated: `pnpm prisma:generate`

## Step 6: Verify in CI

The auth schema validation now runs in CI:

```yaml
# .github/workflows/auth-reliability.yml
- name: Validate auth schema
  run: pnpm audit:auth-schema-validation
```

This prevents schema drift from being deployed again.

## Prevention

- Schema validation runs on every CI build
- If schema issues detected, CI fails before deploy
- Keep DATABASE_URL in .env.production synchronized
- Run `pnpm prisma migrate status` before deploys

## Rollback (if needed)

If applying migrations breaks something:

```bash
# Rollback to previous migration
pnpm prisma migrate resolve --rolled-back <migration_name>

# Reapply later
pnpm prisma migrate deploy
```

## Questions/Troubleshooting

**Q: OAuth still fails after applying migrations**
- Run `pnpm audit:auth-diagnose` again to verify all columns exist
- Check logs: `pnpm audit:admin:auth-health`
- Verify DATABASE_URL points to production in your deploy environment

**Q: Migrations won't apply**
- Check database connectivity: `psql $DATABASE_URL -c "SELECT 1"`
- Check permissions: must be able to ALTER TABLE
- Try manual SQL approach (Option B)

**Q: Which columns are most critical?**
- `accounts.provider` and `accounts.providerAccountId` — MUST exist for OAuth linking
- `accounts.access_token` — needed for API calls after sign-in
- `accounts.refresh_token` — needed for token refresh
- All others → required by Prisma schema but less immediately critical

**Q: Can I use the temporary OAuth disable flag?**
- Not recommended — we want OAuth working
- Flag `AUTH_ENABLE_OAUTH_LOGIN` is there as safety valve only
- Fix the schema instead (it's the permanent solution)
