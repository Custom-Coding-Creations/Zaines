# Auth Schema Resolution - Quick Reference

## TL;DR - Fix OAuth in Production

```bash
# 1. Diagnose the issue
DATABASE_URL="postgresql://..." pnpm audit:auth-diagnose

# 2. Apply Prisma migrations (recommended)
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy

# 3. Verify it worked
DATABASE_URL="postgresql://..." pnpm audit:auth-diagnose
# Expected: ✅ Auth schema is valid!

# 4. Test OAuth
pnpm test:e2e:oauth
```

---

## Available Commands

### Diagnostics

| Command | Purpose | Output |
|---------|---------|--------|
| `pnpm audit:auth-schema-validation` | CI gate - validates schema exists (exits 1 if issues) | Machine-readable JSON, exit code |
| `pnpm audit:auth-diagnose` | Interactive diagnostic - shows exactly what's missing | Human-readable table with remediation steps |

### Fixes

| Command | Purpose | Usage |
|---------|---------|-------|
| `pnpm prisma migrate deploy` | Apply pending migrations (RECOMMENDED) | `DATABASE_URL="..." pnpm prisma migrate deploy` |
| `pnpm audit:auth-schema-fix:sql` | Generate manual SQL fix | `pnpm audit:auth-schema-fix:sql > auth-schema-fix.sql` |

### Verification

| Command | Purpose | Output |
|---------|---------|--------|
| `pnpm audit:admin:auth-health` | Health check with live database probe | JSON report, logs to docs/audit_logs/ADMIN_AUTH_HEALTH_PROBE.json |
| `pnpm test:e2e:oauth` | Test OAuth sign-in flows end-to-end | Pass/fail for each provider, browser logs |

---

## Decision Tree

### "I see OAuth errors in production"

```
1. Run: pnpm audit:auth-diagnose
   ↓
   • Shows: ❌ CRITICAL missing columns
   ↓
2. Choose fix method:
   A. (Recommended) pnpm prisma migrate deploy
   B. (Manual) Generate & run SQL: pnpm audit:auth-schema-fix:sql
   ↓
3. Verify: pnpm audit:auth-diagnose
   ↓
   • Shows: ✅ Auth schema is valid!
   ↓
4. Test: pnpm test:e2e:oauth
   ↓
   • All tests pass
   ✓ OAuth is fixed
```

### "I don't know if there's a schema issue"

```
1. Run: pnpm audit:auth-diagnose
   ↓
   Output will tell you:
   • ✅ Schema is valid → Move on
   • ❌ X issues found → Follow "OAuth errors" tree above
```

### "CI is failing on auth schema validation"

```
1. CI output shows: Schema validation failed
2. Get details: pnpm audit:auth-diagnose
3. Fix: pnpm prisma migrate deploy
4. Push: Schema validation will pass on next CI run
```

### "OAuth works in dev but not production"

```
1. Check production DATABASE_URL is correct:
   echo $DATABASE_URL
   
2. Run diagnostic against production:
   DATABASE_URL="postgresql://prod-db..." pnpm audit:auth-diagnose
   
3. If schema is invalid:
   • Same fix as "OAuth errors" tree
   
4. If schema is valid:
   • Check credentials: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
   • Check database connection: psql $DATABASE_URL -c "SELECT 1"
```

---

## What Each Tool Does

### `pnpm audit:auth-schema-validation`

**Purpose:** CI gate - ensures schema exists before deployment  
**Exit Codes:**
- `0` = Schema valid, proceed with deploy
- `1` = Schema issues found, block deploy
- `2` = Database connection error

**Output:** Minimal JSON for CI parsing

**When it runs:** Every CI build (before app starts)

```bash
# Local
pnpm audit:auth-schema-validation

# Against production
DATABASE_URL="postgresql://..." pnpm audit:auth-schema-validation
```

---

### `pnpm audit:auth-diagnose`

**Purpose:** Interactive diagnostic - shows exactly what's wrong  
**Output:** Human-readable table with remediation steps

**What it reports:**
- ✅ Tables that exist
- ❌ Columns that are missing
- 🔴 CRITICAL issues (will break OAuth)
- 🟡 WARNING issues (may cause problems)
- 📋 Remediation steps

**Example Output:**

```
❌ Auth schema has 5 issues:

🔴 CRITICAL (will break OAuth):
  • accounts.provider: Column missing
  • accounts.access_token: Column missing

📋 Remediation:
1. Run migrations: pnpm prisma migrate deploy
2. If still missing: pnpm prisma db pull
```

---

### `pnpm prisma migrate deploy`

**Purpose:** Apply all pending migrations to production  
**Pros:**
- Safe: handles transactions and rollback
- Audited: records in prisma_migrations
- Recommended: use this method

**Steps:**
```bash
# 1. Check what's pending
DATABASE_URL="..." pnpm prisma migrate status

# 2. Apply
DATABASE_URL="..." pnpm prisma migrate deploy

# 3. Verify
DATABASE_URL="..." pnpm audit:auth-diagnose
```

---

### `pnpm audit:auth-schema-fix:sql`

**Purpose:** Generate manual SQL if migrations can't be applied  
**Pros:**
- Works if Prisma is broken
- Can be code-reviewed before applying

**Steps:**
```bash
# 1. Generate SQL
pnpm audit:auth-schema-fix:sql > auth-fix.sql

# 2. Review
cat auth-fix.sql

# 3. Apply (BACKUP FIRST!)
psql $DATABASE_URL -f auth-fix.sql

# 4. Verify
DATABASE_URL="..." pnpm audit:auth-diagnose
```

---

### `pnpm test:e2e:oauth`

**Purpose:** Test actual OAuth sign-in flows  
**What it tests:**
- Google OAuth button appears
- Facebook OAuth button appears
- Capabilities API returns enabled providers
- No schema errors in console
- Auth health check passes

**Requirements:**
- Database must be accessible
- OAuth credentials must be configured
- App must be running or E2E_WEB_BASE_URL set

**Run:**
```bash
# Against local dev server
pnpm dev  # in another terminal
pnpm test:e2e:oauth

# Against production
E2E_WEB_BASE_URL="https://zainesstayandplay.com" pnpm test:e2e:oauth
```

---

## Required Columns (Reference)

### accounts table (CRITICAL for OAuth)
- `id` - Primary key
- `userId` - Foreign key to users
- `type` - "oauth" or "credentials"
- `provider` - "google", "facebook", etc. **← Missing causes OAuth to fail**
- `providerAccountId` - OAuth account ID **← Missing causes OAuth to fail**
- `access_token` - OAuth token for API calls
- `refresh_token` - OAuth refresh token
- `expires_at` - Token expiry timestamp
- `token_type` - Usually "Bearer"
- `scope` - OAuth scope
- `id_token` - OpenID token
- `session_state` - Session state

### sessions table
- `id` - Primary key
- `sessionToken` - Unique session token
- `userId` - Foreign key to users
- `expires` - Session expiry

### users table
- `id` - Primary key
- `email` - User email
- `emailVerified` - Email verification timestamp
- `name` - User name
- `image` - Avatar URL

### verification_tokens table
- `identifier` - Email or identifier
- `token` - Verification token
- `expires` - Token expiry

---

## Rollback (if something goes wrong)

```bash
# If migrations broke something:
pnpm prisma migrate resolve --rolled-back <migration_name>

# Then check status:
pnpm prisma migrate status

# Reapply later:
pnpm prisma migrate deploy
```

---

## Prevention

Schema validation now runs in CI:
- ✅ Every PR / push to main
- ❌ Blocks deploy if schema issues found
- 🚀 Only deployed code has valid schema

To skip validation (not recommended):
```bash
# This is set in .github/workflows/auth-reliability.yml
# Modify if needed:
# - name: Validate auth schema
#   run: pnpm audit:auth-schema-validation
```

---

## Still Having Issues?

1. **Run full diagnostic:**
   ```bash
   DATABASE_URL="postgresql://..." pnpm audit:auth-diagnose
   ```

2. **Check auth health:**
   ```bash
   E2E_WEB_BASE_URL="https://zainesstayandplay.com" pnpm audit:admin:auth-health
   ```

3. **Verify database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. **Check credentials:**
   ```bash
   # Are these set?
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   echo $AUTH_SECRET
   ```

5. **See full docs:**
   - [OAUTH_SCHEMA_DRIFT_RESOLUTION.md](./OAUTH_SCHEMA_DRIFT_RESOLUTION.md)
