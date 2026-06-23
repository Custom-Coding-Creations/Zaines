# Email System

This document describes the complete email architecture for Zaine's Stay & Play, covering how emails are routed, sent, templated, and logged.

## Architecture Overview

The email system has two paths — outbound (sending) and inbound (receiving), each handled by a dedicated Cloudflare Worker.

### Outbound

Next.js never calls Resend directly — it calls a Cloudflare Worker, which holds the Resend API key.

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

### Inbound

`info@zainesstayandplay.com` receives mail via Cloudflare Email Routing (DNS MX records). Routing sends it to `zaines-email-receiver`, a Cloudflare Email Worker that:

1. Forwards the email to the owner's Gmail (preserving existing delivery)
2. Parses the raw MIME bytes with `postal-mime`
3. POSTs the parsed email to `/api/email/inbound` in the background (never blocks delivery)

```
Customer email
       │
       ▼
Cloudflare Email Routing  (MX records for zainesstayandplay.com)
       │
       ▼
zaines-email-receiver Worker  (workers/email-receiver/)
       ├── message.forward(FORWARD_TO)         → Gmail (owner's copy, preserved)
       └── ctx.waitUntil(parseAndPost(...))
                 │
                 │  POST /api/email/inbound
                 │  (Authorization: Bearer INBOUND_WEBHOOK_SECRET)
                 ▼
         Next.js app (Vercel)
                 │
                 ▼
         EmailLog (direction: "inbound", status: "received")
                 │
                 ▼
         Admin inbox → Inbox tab
```

**Key design decisions:**
- Raw bytes are buffered from `message.raw` **before** calling `message.forward()` — the stream can only be consumed once
- `ctx.waitUntil()` runs the parse/POST after the SMTP handshake completes, so forwarding latency is unaffected
- Parse failures fall back to a stub record so the email always appears in the inbox

---

## Environment Variables

| Variable | Where it lives | Purpose |
|---|---|---|
| `EMAIL_WORKER_URL` | Vercel env / `.env` | Full URL of `zaines-email-sender` |
| `EMAIL_WORKER_SECRET` | Vercel env / `.env` | Bearer token Next.js uses to call the outbound Worker |
| `RESEND_API_KEY` | `zaines-email-sender` Worker secrets | Resend account key — **not** in Vercel |
| `EMAIL_FROM` | Vercel env / `.env` | Fallback sender address if Admin Settings not configured |
| `OWNER_EMAIL` | Vercel env / `.env` | Recipient for owner/booking-alert notifications |
| `CONTACT_INBOX_EMAIL` | Vercel env / `.env` | Recipient for contact form submissions |
| `INBOUND_WEBHOOK_SECRET` | Vercel env / `.env` **and** `zaines-email-receiver` Worker secrets | Shared Bearer token for the inbound email webhook — must match in both places |
| `FORWARD_TO` | `zaines-email-receiver` Worker secrets | Gmail address to forward inbound emails to (must be a verified Cloudflare destination address) |
| `APP_URL` | `zaines-email-receiver` Worker secrets | Base URL of the Next.js app (e.g. `https://zainesstayandplay.com`) |

**Important:** `RESEND_API_KEY` must be set in the `zaines-email-sender` Worker secrets, not in Vercel. `INBOUND_WEBHOOK_SECRET` must be set in **both** Vercel and the `zaines-email-receiver` Worker secrets with the same value.

---

## The Cloudflare Workers

### Email Sender (Outbound)

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

### Email Receiver (Inbound)

**Location:** `workers/email-receiver/src/index.ts`  
**Deployed as:** `zaines-email-receiver` (Cloudflare Email Worker, not an HTTP Worker)

This is a Cloudflare **Email Worker** — it exports an `email` handler, not a `fetch` handler. It is triggered by Cloudflare Email Routing, not HTTP.

#### Deploying or updating

```bash
cd workers/email-receiver
pnpm install
pnpm exec wrangler deploy
# or: CLOUDFLARE_API_TOKEN="cfat_..." CLOUDFLARE_ACCOUNT_ID="..." pnpm exec wrangler deploy
```

#### Setting secrets

These secrets must all be set after every fresh deploy:

```bash
cd workers/email-receiver

# Gmail address to forward inbound emails to (must be a verified Cloudflare destination)
echo "zainestayandplay@gmail.com" | pnpm exec wrangler secret put FORWARD_TO

# Base URL of the Next.js app
echo "https://zainesstayandplay.com" | pnpm exec wrangler secret put APP_URL

# Same value as INBOUND_WEBHOOK_SECRET in Vercel
echo "your-secret-here" | pnpm exec wrangler secret put INBOUND_WEBHOOK_SECRET
```

**Critical:** `FORWARD_TO` must be an address that has been added and verified under Cloudflare Email Routing → Destination Addresses. `message.forward()` throws if the address is unverified, causing the email to bounce.

#### Cloudflare dashboard routing rule

After deploying, set the routing rule in the Cloudflare dashboard:

1. Cloudflare → zainesstayandplay.com → Email → Email Routing → Routes
2. Edit the rule for `info@zainesstayandplay.com`
3. Set **Action** to **Send to a Worker** → select `zaines-email-receiver`
4. Save — the Worker handles forwarding internally; remove any separate forwarding action

#### Live logs

```bash
cd workers/email-receiver
pnpm exec wrangler tail
```

#### Inbound webhook endpoint

The Worker POSTs to `/api/email/inbound` with `Authorization: Bearer INBOUND_WEBHOOK_SECRET`. The endpoint:
- Validates the Bearer token against `process.env.INBOUND_WEBHOOK_SECRET`
- Creates an `EmailLog` with `direction: "inbound"`, `status: "received"`, `isRead: false`
- Returns `201` on success

Test it manually:

```bash
curl -X POST https://zainesstayandplay.com/api/email/inbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -d '{
    "from": "customer@example.com",
    "to": "info@zainesstayandplay.com",
    "subject": "Test inbound",
    "html": "<p>Test</p>"
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

All emails — sent and received — are recorded in the `EmailLog` table (`email_logs`). Fields include:

| Field | Description |
|---|---|
| `direction` | `outbound` for sent emails, `inbound` for received emails |
| `type` | Email type: notification type (e.g. `booking_confirmation`), `compose` for manually sent, or `inbound` for received |
| `fromAddress` | Sender address |
| `toAddress` | Primary recipient |
| `cc` | Comma-separated CC addresses (nullable) |
| `subject` | Email subject |
| `html` | Full rendered HTML body |
| `resendId` | Resend message ID (outbound only) |
| `status` | `sent` (delivered), `failed` (send error), `queued` (dev fallback), or `received` (inbound) |
| `attachments` | JSON array of `{ url, filename, size, mimeType }` (outbound only) |
| `isRead`, `isStarred`, `isArchived` | Admin inbox state |

The admin inbox at `/admin/inbox` has two tabs:
- **Inbox** — shows `direction: "inbound"` emails. The unread badge on the operations dashboard counts these.
- **Sent** — shows `direction: "outbound"` emails.

Admins can view, reply (direction-aware — replies to inbound go to the original sender), star, archive, and bulk-manage emails from both tabs.

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
| `workers/email-sender/src/index.ts` | Outbound email Cloudflare Worker |
| `workers/email-receiver/src/index.ts` | Inbound email Cloudflare Email Worker |
| `src/app/api/email/inbound/route.ts` | Inbound email webhook (called by `zaines-email-receiver`) |
| `src/lib/notifications.ts` | All automated send functions + `sendEmailViaWorker` |
| `src/app/api/admin/email-inbox/compose/route.ts` | Admin compose endpoint |
| `src/app/api/admin/email-inbox/[id]/reply/route.ts` | Admin reply endpoint (direction-aware) |
| `src/app/api/admin/email-inbox/attachments/route.ts` | Attachment upload to Vercel Blob |
| `src/app/api/admin/email-inbox/templates/route.ts` | Template CRUD |
| `src/app/api/admin/email-inbox/templates/[id]/reset/route.ts` | Re-render template from React Email component |
| `src/app/api/admin/email-inbox/settings/route.ts` | Read/write email sender settings |
| `src/app/api/email/preview/[template]/route.ts` | Preview any template in browser |
| `src/emails/` | React Email template components |
| `scripts/seed-email-templates.mts` | Seeds 12 system templates into DB |
| `src/components/admin/EmailInboxPanel.tsx` | Admin inbox list view (Inbox + Sent tabs) |
| `src/components/admin/EmailComposeModal.tsx` | Compose sheet with template variable panel |
| `src/components/admin/EmailDetailSheet.tsx` | Email detail + reply panel |
| `src/components/admin/inbox/` | Settings page components |
