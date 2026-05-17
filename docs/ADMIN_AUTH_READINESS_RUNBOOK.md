# Admin Auth Readiness Runbook

This runbook prevents and triages admin API outages caused by auth runtime issues.

## Pre-deploy Gate

Run this in CI and before production rollout:

- `pnpm auth:readiness`

The command exits non-zero when critical auth prerequisites are missing.

## Required Runtime Configuration

- `AUTH_SECRET` (preferred) or `NEXTAUTH_SECRET`
- `DATABASE_URL` when `AUTH_ENABLE_DATABASE_SESSIONS=true`

Recommended for all production environments:

- `DATABASE_URL` always present
- `AUTH_ENABLE_DATABASE_SESSIONS=true` only when database connectivity is verified

## Health Endpoint

Use the admin auth health endpoint for fast diagnostics:

- `GET /api/admin/health/auth`

Response includes:

- `status`: `ok`, `degraded`, or `misconfigured`
- `code`: machine-readable readiness code
- `checks`: auth secret/db/session-strategy probes

This endpoint sends `Cache-Control: no-store` and does not expose secret values.

## Failure Codes and Meaning

- `ADMIN_AUTH_READY`: auth runtime checks passed
- `ADMIN_AUTH_UNAVAILABLE`: auth subsystem unavailable (retry after infra check)
- `ADMIN_AUTH_MISCONFIGURED`: secret missing/misconfigured auth setup
- `ADMIN_AUTH_DATABASE_REQUIRED`: database session strategy enabled without database configuration
- `ADMIN_AUTH_INVALID_SESSION`: request session invalid/expired; client should re-authenticate

Finance auth equivalents:

- `ADMIN_FINANCE_AUTH_UNAVAILABLE`
- `ADMIN_FINANCE_AUTH_MISCONFIGURED`
- `ADMIN_FINANCE_AUTH_INVALID_SESSION`

## Triage Checklist

1. Confirm auth secret is present in runtime environment.
2. Confirm database connectivity from runtime.
3. Verify `AUTH_ENABLE_DATABASE_SESSIONS` matches deployment reality.
4. Check logs for `Admin auth failure` and `Finance auth failure` with error type.
5. Re-test `GET /api/admin/health/auth` after fixes.

## Fast Verification Commands

- `pnpm auth:readiness`
- `pnpm typecheck`
- `curl -sS https://<host>/api/admin/health/auth | jq .`
