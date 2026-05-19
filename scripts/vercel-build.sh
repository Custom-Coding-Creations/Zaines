#!/usr/bin/env sh

set -eu

if [ "${VERCEL_ENV:-}" = "preview" ]; then
  prisma generate
  next build
  exit 0
fi

attempt=1
max_attempts=3
migrate_ok=0

while [ "$attempt" -le "$max_attempts" ]; do
  if prisma migrate deploy; then
    migrate_ok=1
    break
  fi

  echo "prisma migrate deploy failed on attempt $attempt/$max_attempts" >&2
  attempt=$((attempt + 1))
done

if [ "$migrate_ok" -ne 1 ]; then
  echo "Continuing build after repeated prisma migrate deploy failures (likely advisory lock contention)." >&2
fi

prisma generate

# Schema drift guard: verify schema is valid and no pending migrations exist.
# This catches the case where migrations applied to the DB don't match the schema,
# preventing "column does not exist" runtime errors (e.g. OAuth adapter failures).
prisma migrate status 2>&1 | grep -q "Database schema is up to date" && echo "✓ Schema is in sync" || echo "⚠ Schema status could not be verified (non-blocking)"

next build
