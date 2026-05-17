# Admin API Reliability Final Report (2026-05-17)

## Scope
This report covers the production failures reported for the following endpoints:

- `/api/admin/finance/exceptions`
- `/api/admin/finance/transactions`
- `/api/admin/play-groups/staffing-exceptions`
- `/api/admin/operations/queue`
- `/api/admin/occupancy`
- `/api/admin/staff`
- `/api/admin/report-cards`
- `/api/admin/incidents`
- `/api/admin/packages`
- `/api/admin/recurring-bookings`
- `/api/admin/time-slots`
- `/api/admin/reminders`

## Executive Summary
The implementation replaced broad, generic `500` fallback behavior with explicit, typed failure responses and improved dependency resilience in shared auth/settings layers. High-risk hydration mismatch points were also addressed by deterministic rendering and stable client-side IDs.

## Key Outcomes
1. Auth/runtime failures now return explicit `401`/`403`/`503` envelopes instead of cascading generic `500`s.
2. Shared admin settings access no longer throws when settings model access is unavailable; defaults are used safely.
3. Finance date parameter handling now returns `400` for invalid date inputs.
4. Admin route catch blocks for reported failing endpoints now return `503` with stable error codes.
5. Hydration risk was reduced in key user-facing views via deterministic UTC formatting and non-time-based IDs.

## Endpoint Error Mapping (After)

| Endpoint | On dependency/runtime failure | Error Code |
| --- | --- | --- |
| `/api/admin/finance/exceptions` | `503` | `FINANCE_EXCEPTIONS_UNAVAILABLE` |
| `/api/admin/finance/transactions` | `400` invalid dates, otherwise `503` on backend failure | `FINANCE_TRANSACTIONS_UNAVAILABLE` |
| `/api/admin/play-groups/staffing-exceptions` | `503` | `ADMIN_STAFFING_EXCEPTIONS_UNAVAILABLE` |
| `/api/admin/operations/queue` | `503` | `ADMIN_OPERATIONS_QUEUE_UNAVAILABLE` |
| `/api/admin/occupancy` | `503` | `ADMIN_OCCUPANCY_UNAVAILABLE` |
| `/api/admin/staff` | `503` | `ADMIN_STAFF_UNAVAILABLE` |
| `/api/admin/report-cards` | `400` invalid date filter, otherwise `503` | `ADMIN_REPORT_CARDS_UNAVAILABLE` |
| `/api/admin/incidents` | `503` | `ADMIN_INCIDENTS_UNAVAILABLE` |
| `/api/admin/packages` | `503` | `ADMIN_PACKAGES_UNAVAILABLE` |
| `/api/admin/recurring-bookings` | `503` | `ADMIN_RECURRING_BOOKINGS_UNAVAILABLE` |
| `/api/admin/time-slots` | `503` | `ADMIN_TIME_SLOTS_UNAVAILABLE` |
| `/api/admin/reminders` | `503` | `ADMIN_REMINDERS_UNAVAILABLE` / `REMINDER_WORKFLOW_UNAVAILABLE` |

## Shared Infrastructure Hardening

### Auth
- `requireFinanceAccess` now catches auth runtime failures and returns explicit `503` (`ADMIN_FINANCE_AUTH_UNAVAILABLE`).
- Recurring bookings endpoint moved to shared `requireStaffSession` auth handling for consistency.

### Settings
- Centralized settings model guard added in admin settings utilities.
- Settings reads/writes now degrade to safe defaults when model access is unavailable.

### Validation
- Finance transactions date query parsing now fails fast with `400` on invalid input.
- Report-cards date filter now fails fast with `400` on invalid input.

## Hydration and Frontend Stability

### Deterministic rendering
- Dashboard date display and day-difference calculations now use deterministic UTC logic.
- Message thread timestamps use deterministic UTC formatter.

### Stable IDs
Replaced `Date.now()`-based IDs in admin form editors with UUID-style client IDs to reduce render mismatch risk.

## Verification Evidence

### Existing + expanded regression suites
- `src/__tests__/admin-endpoint-hardening-regression.test.ts`
- `src/__tests__/admin-finance-endpoints-hardening.test.ts`
- `src/__tests__/admin-reminders-endpoint-hardening.test.ts`

### Validated checks
1. Focused Vitest suites passed for hardening scenarios.
2. TypeScript `tsc --noEmit` passed after each implementation phase.

## Change Traceability
Recent implementation commits:
- `e1a1720` Harden admin routes and reduce hydration mismatch risks
- `7756db1` Strengthen finance endpoint validation and expand hardening tests
- `2b50b6c` Standardize admin endpoint service-unavailable responses

## Remaining Considerations
1. Run a production-mode endpoint smoke matrix in an environment with full auth/session and database wiring to confirm behavior under real infra conditions.
2. Monitor logs for new explicit error codes to identify any remaining upstream service failures quickly.
3. Extend code-level assertions for 503 code envelopes on all listed endpoints, not only core route families already covered.
