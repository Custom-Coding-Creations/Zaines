# Email System

This document describes the complete email architecture for Zaine's Stay & Play, covering how emails are routed, sent, templated, and logged.

## Architecture Overview

Outbound email uses a two-hop architecture. Next.js never calls Resend directly — it calls a Cloudflare Worker, which holds the Resend API key.

```
Next.js app (Vercel)
       │
       │  POST /  (Authorization: Bearer EMAIL_WORKER_SECRET)
       │  JSON: { from, to, cc?, subject, html, attachments? }
       ▼
Cloudflare Worker  (workers/email-sender/)
       │
       │  POST https://api.resend.com/emails
       │  (Authorization: Bearer RESEND_API_KEY)
       ▼
Resend API  →  recipient inbox
```

**Why the indirection?**

- The Resend API key lives in Cloudflare's secret store, never in Vercel's environment
- Cloudflare Workers are on Cloudflare's global network — lower latency for outbound HTTP than Vercel serverless
- The Worker adds auth validation and can be updated or swapped independently of the Next.js app

**Inbound email** is separate: `info@zainesstayandplay.com` receives mail via Cloudflare Email Routing (DNS MX records), which forwards it to the owner's inbox. This is pure DNS forwarding and has no relationship to the send path.

---

## Environment Variables

| Variable | Where it lives | Purpose |
|---|---|---|
| `EMAIL_WORKER_URL` | Vercel env / `.env` | Full URL of the Cloudflare Worker |
| `EMAIL_WORKER_SECRET` | Vercel env / `.env` | Bearer token Next.js uses to authenticate with the Worker |
| `RESEND_API_KEY` | Cloudflare Worker secrets | Resend account key — **not** in Vercel |
| `EMAIL_FROM` | Vercel env / `.env` | Fallback sender address if Admin Settings not configured |
| `OWNER_EMAIL` | Vercel env / `.env` | Recipient for owner/booking-alert notifications |
| `CONTACT_INBOX_EMAIL` | Vercel env / `.env` | Recipient for contact form submissions |

**Important:** `RESEND_API_KEY` must be set in the Cloudflare Worker secrets, not in Vercel. Setting it in Vercel has no effect.

---

## The Cloudflare Worker

**Location:** `workers/email-sender/src/index.ts`  
**Live URL:** `https://zaines-email-sender.davidtraversmailbox.workers.dev`

The Worker:

1. Validates `Authorization: Bearer <EMAIL_WORKER_SECRET>` — rejects anything else with 401
2. Validates required fields (`from`, `to`, `subject`, `html`)
3. Forwards to Resend's `/emails` endpoint
4. Returns `{ success: true, messageId }` or an error

Supported Resend fields: `to` (string or array), `cc[]`, `reply_to`, `text`, `attachments[]`

Attachments must be **base64-encoded** before reaching the Worker — Next.js handles that conversion (see Compose route below).

### Deploying or updating the Worker

```bash
cd workers/email-sender
pnpm install
pnpm wrangler deploy
```

### Rotating secrets

```bash
cd workers/email-sender

# Rotate Resend API key
echo "re_new_key" | pnpm wrangler secret put RESEND_API_KEY

# Rotate Worker auth secret
echo "$(openssl rand -base64 32)" | pnpm wrangler secret put EMAIL_WORKER_SECRET
# Then update EMAIL_WORKER_SECRET in Vercel env and local .env
```

### Live logs

```bash
cd workers/email-sender
pnpm wrangler tail
```

### Health check

```bash
curl https://zaines-email-sender.davidtraversmailbox.workers.dev
# Returns: {"status":"ok","service":"Zaines Email Worker","version":"1.0.0"}
```

### Direct send test

```bash
curl -X POST https://zaines-email-sender.davidtraversmailbox.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_WORKER_SECRET" \
  -d '{
    "from": "info@zainesstayandplay.com",
    "to": "you@example.com",
    "subject": "Test",
    "html": "<p>Hello from the Worker!</p>"
  }'
```

---

## Sending From Address

**Default:** `info@zainesstayandplay.com` — hardcoded fallback in every send function via `process.env.EMAIL_FROM`.

**Admin-configurable (runtime):** The compose and reply routes read from the `emailSettings` key in the `Settings` table (managed via `/admin/inbox/settings → Sender`). The `from` header becomes:

```
"Zaine's Stay & Play" <info@zainesstayandplay.com>
```

Both the display name and address are editable without redeployment. The Reply-To address is also configurable there.

**Owner alerts** use `process.env.OWNER_EMAIL` as the **recipient** (defaults to `info@zainesstayandplay.com`). All automated system emails still send _from_ `info@zainesstayandplay.com`.

---

## Retry Logic (`sendEmailViaWorker`)

**Location:** `src/lib/notifications.ts` — `sendEmailViaWorker()`

All automated notification sends flow through this function. It:

- Retries up to **4 times** with exponential backoff starting at 250 ms (only for 5xx responses)
- Logs every send attempt to the `EmailLog` database table (`status: sent | failed | queued`)
- On 4xx (validation error), returns immediately without retry
- Strips internal-only logging fields (`_logType`, `_bookingId`, `_userId`, `_cc`) from the Worker payload

---

## Dev-Mode Fallback

When `EMAIL_WORKER_URL` or `EMAIL_WORKER_SECRET` are absent (local dev), emails are **not delivered**. Instead:

- If `REDIS_URL` is set → entries go to a **BullMQ queue** for background processing
- Otherwise → entries are appended as JSON lines to `tmp/email-queue.log`

On module load, `processQueuedEntries()` runs automatically to flush any previously-queued items if the Worker is now configured.

Inspect the queue:
```bash
cat tmp/email-queue.log | jq .
```

Clear the queue (after fixing configuration):
```bash
rm tmp/email-queue.log
```

---

## Automated Notification Types

All triggered automatically by application events.

| Type | Trigger | Recipient |
|---|---|---|
| `booking_confirmation` | Booking paid/confirmed | Customer |
| `payment_notification` | Payment success or failure | Customer |
| `payment_recovery_link` | Admin resends payment link | Customer |
| `owner_booking_notification` | Booking paid/confirmed | Owner (`OWNER_EMAIL`) |
| `welcome_email` | New customer account created | Customer |
| `photo_digest` | Staff uploads daily photos | Customer |
| `report_card_notification` | Staff submits report card | Customer |
| `incident_notification` | Staff logs an incident | Customer |
| `contact_submission_notification` | Contact form submitted | Owner (`CONTACT_INBOX_EMAIL`) |
| `password_reset_notification` | User requests password reset | Customer |
| `booking_claim_notification` | Guest booking needs claiming | Customer |
| `automated_reminder` | Scheduler fires a reminder | Customer |

Each has a dedicated exported function in `src/lib/notifications.ts`.

---

## Admin Compose & Reply (Manual Emails)

Emails sent from the admin inbox (`/admin/inbox`) bypass `sendEmailViaWorker` and call the Cloudflare Worker directly, because they must handle file attachments.

**Compose:** `POST /api/admin/email-inbox/compose`  
**Reply:** `POST /api/admin/email-inbox/[id]/reply`

Flow:

1. Admin submits compose/reply form with Vercel Blob attachment URLs
2. The API route fetches each attachment from Blob storage and converts it to base64 in-memory
3. POSTs `{ from, to, cc, reply_to, subject, html, attachments[] }` directly to `EMAIL_WORKER_URL`
4. The Worker forwards to Resend with base64 `attachments`
5. The result (including `resendId`) is written to `EmailLog`

The admin's configured email signature (`emailSettings.signatureHtml`) is appended as HTML separated by a `<hr>` before sending.

**Attachment storage:** Files are uploaded to Vercel Blob at `email-attachments/{slug}/{filename}` via `POST /api/admin/email-inbox/attachments`. Only the Blob URL + metadata is stored in `EmailLog.attachments` (JSON). The base64 conversion happens at send time and is never persisted.

**Supported attachment types:** PDF, images (jpg/png/gif/webp), DOCX, TXT, CSV — max 10 MB per file.

---

## Email Templates

Templates are stored in the `email_templates` database table (model: `EmailTemplate`). There are 12 system templates, seeded by:

```bash
npx tsx scripts/seed-email-templates.mts
```

The seed script uses `upsert` with `update: {}` — it creates missing templates but never overwrites admin edits.

### Editing templates

Go to `/admin/inbox/settings → Templates`. Each template has:
- **Enable/disable toggle** — disabled templates won't be used for notifications
- **Edit** — opens a Tiptap rich-text editor with variable chip hints and live preview
- **Reset to Default** (system templates only) — re-renders the React Email component with mock data

### React Email components

Six templates use React Email components (`@react-email/components` + `render()`):

| Component | File |
|---|---|
| `BookingConfirmation` | `src/emails/BookingConfirmation.tsx` |
| `PaymentReceipt` | `src/emails/PaymentReceipt.tsx` |
| `WelcomeEmail` | `src/emails/WelcomeEmail.tsx` |
| `PhotoDigest` | `src/emails/PhotoDigest.tsx` |
| `PasswordReset` | `src/emails/PasswordReset.tsx` |
| `BookingClaim` | `src/emails/BookingClaim.tsx` |
| `IncidentNotification` | `src/emails/IncidentNotification.tsx` |
| `ReportCard` | `src/emails/ReportCard.tsx` |
| `AutomatedReminder` | `src/emails/AutomatedReminder.tsx` |
| `OwnerNotification` | `src/emails/OwnerNotification.tsx` |

The remaining two (`owner_booking_notification`, `contact_submission_notification`) use inline template-literal HTML with `escapeHtml()` sanitization.

### Previewing templates in the browser

```
GET /api/email/preview/[template]
```

Available template slugs: `booking-confirmation`, `payment-receipt`, `welcome`, `photo-digest`, `vaccine-expiry`, `password-reset`, `booking-claim`, `owner-notification`, `incident-notification`, `report-card`, `automated-reminder`.

---

## Email Log (Admin Inbox)

Every outbound email is recorded in the `EmailLog` table (`email_logs`). Fields include:

| Field | Description |
|---|---|
| `direction` | Always `outbound` for sent emails |
| `type` | Notification type (e.g. `booking_confirmation`, `compose`) |
| `fromAddress` | Sender address used |
| `toAddress` | Primary recipient |
| `cc` | Comma-separated CC addresses (nullable) |
| `subject` | Email subject |
| `html` | Full rendered HTML body |
| `resendId` | Resend message ID (for tracking) |
| `status` | `sent`, `failed`, or `queued` |
| `attachments` | JSON array of `{ url, filename, size, mimeType }` |
| `isRead`, `isStarred`, `isArchived` | Admin inbox state |

Admins can view, reply, forward, star, archive, and bulk-manage all sent emails at `/admin/inbox`.

---

## Admin Email Settings

Configurable at `/admin/inbox/settings` without redeployment.

| Setting | Description |
|---|---|
| From Name | Display name in the `From` header |
| From Address | Sender email address |
| Reply-To | Address customer replies go to |
| Email Signature | Rich HTML appended to all composed/reply emails |

Stored in the `Settings` key-value table under key `admin.email_settings`.

---

## DNS & Deliverability

The domain `zainesstayandplay.com` has these email DNS records configured:

| Record | Value | Purpose |
|---|---|---|
| MX | `route1/2/3.mx.cloudflare.net` | Inbound routing via Cloudflare |
| SPF | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Authorizes Cloudflare to send |
| DKIM | `cf2024-1._domainkey` (Cloudflare-managed) | Signs outbound messages |
| DMARC | `v=DMARC1; p=none; rua=mailto:david@customcodingcreations.com` | Policy + reporting |

DMARC aggregate reports are delivered to `david@customcodingcreations.com`. Monitor the pass rate (target >95%) and complaint rate (target <0.1%) via [Google Postmaster Tools](https://postmaster.google.com).

See [EMAIL_DELIVERABILITY.md](EMAIL_DELIVERABILITY.md) for warm-up guidance and spam-avoidance best practices.

---

## Key Files

| File | Purpose |
|---|---|
| `workers/email-sender/src/index.ts` | Cloudflare Worker source |
| `src/lib/notifications.ts` | All automated send functions + `sendEmailViaWorker` |
| `src/app/api/admin/email-inbox/compose/route.ts` | Admin compose endpoint |
| `src/app/api/admin/email-inbox/[id]/reply/route.ts` | Admin reply endpoint |
| `src/app/api/admin/email-inbox/attachments/route.ts` | Attachment upload to Vercel Blob |
| `src/app/api/admin/email-inbox/templates/route.ts` | Template CRUD |
| `src/app/api/admin/email-inbox/templates/[id]/reset/route.ts` | Re-render template from React Email component |
| `src/app/api/admin/email-inbox/settings/route.ts` | Read/write email sender settings |
| `src/app/api/email/preview/[template]/route.ts` | Preview any template in browser |
| `src/emails/` | React Email template components |
| `scripts/seed-email-templates.mts` | Seeds 12 system templates into DB |
| `src/components/admin/EmailInboxPanel.tsx` | Admin inbox list view |
| `src/components/admin/EmailComposeModal.tsx` | Compose sheet (Tiptap editor, CC, attachments, templates) |
| `src/components/admin/EmailDetailSheet.tsx` | Email detail + reply panel |
| `src/components/admin/inbox/` | Settings page components |
