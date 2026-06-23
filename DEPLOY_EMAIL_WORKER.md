# Cloudflare Email Workers — Deployment Reference

Two Cloudflare Workers handle all email for Zaine's Stay & Play:

| Worker | Type | Purpose |
|---|---|---|
| `zaines-email-sender` | HTTP Worker | Outbound email via Resend API |
| `zaines-email-receiver` | Email Worker | Inbound email capture + Gmail forwarding |

**Status: Both deployed and active.**

For full architecture documentation see [docs/EMAIL_SYSTEM.md](docs/EMAIL_SYSTEM.md).

---

## zaines-email-sender (Outbound)

**Live URL:** `https://zaines-email-sender.davidtraversmailbox.workers.dev`  
**Location:** `workers/email-sender/`

### Current Configuration

| Item | Value |
|---|---|
| Worker URL | `https://zaines-email-sender.davidtraversmailbox.workers.dev` |
| Email provider | Resend API (key stored in Worker secrets) |
| Auth mechanism | Bearer token (`EMAIL_WORKER_SECRET`) |
| Vercel env vars | `EMAIL_WORKER_URL`, `EMAIL_WORKER_SECRET`, `EMAIL_FROM`, `OWNER_EMAIL`, `CONTACT_INBOX_EMAIL` |

### Maintenance Commands

```bash
cd workers/email-sender

# Deploy code changes
pnpm install
pnpm exec wrangler deploy

# Stream live logs
pnpm exec wrangler tail

# List secrets (names only)
pnpm exec wrangler secret list

# Rotate RESEND_API_KEY
echo "re_new_key_here" | pnpm exec wrangler secret put RESEND_API_KEY

# Rotate EMAIL_WORKER_SECRET (update Vercel env too)
echo "$(openssl rand -base64 32)" | pnpm exec wrangler secret put EMAIL_WORKER_SECRET
```

### Testing

```bash
# Health check
curl https://zaines-email-sender.davidtraversmailbox.workers.dev
# Returns: {"status":"ok","service":"Zaines Email Worker","version":"1.0.0"}

# Send a test email
curl -X POST https://zaines-email-sender.davidtraversmailbox.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_WORKER_SECRET" \
  -d '{
    "from": "info@zainesstayandplay.com",
    "to": "you@example.com",
    "subject": "Worker test",
    "html": "<p>Test from Cloudflare Worker</p>"
  }'
```

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 Unauthorized from Worker | Secret mismatch | Verify `EMAIL_WORKER_SECRET` in Vercel matches Worker secrets |
| 500 from Worker | Bad Resend key or quota exceeded | Check `pnpm exec wrangler tail` and Resend dashboard |
| Emails going to dev queue | `EMAIL_WORKER_URL` or `EMAIL_WORKER_SECRET` not set in Vercel | Add/verify env vars in Vercel dashboard, redeploy |
| Emails in spam | Deliverability issue | See [docs/EMAIL_DELIVERABILITY.md](docs/EMAIL_DELIVERABILITY.md) |

### Deploying to a New Account

1. **Authenticate Wrangler**
   ```bash
   pnpm exec wrangler login
   # or: CLOUDFLARE_API_TOKEN="cfat_..." CLOUDFLARE_ACCOUNT_ID="..." pnpm exec wrangler deploy
   ```

2. **Deploy**
   ```bash
   cd workers/email-sender
   pnpm install
   pnpm exec wrangler deploy
   ```

3. **Set secrets**
   ```bash
   echo "re_your_key" | pnpm exec wrangler secret put RESEND_API_KEY
   SECRET=$(openssl rand -base64 32)
   echo "$SECRET" | pnpm exec wrangler secret put EMAIL_WORKER_SECRET
   echo "Copy this to Vercel: $SECRET"
   ```

4. **Update Vercel**
   ```env
   EMAIL_WORKER_URL=https://zaines-email-sender.YOUR-SUBDOMAIN.workers.dev
   EMAIL_WORKER_SECRET=<the secret from step 3>
   ```

---

## zaines-email-receiver (Inbound)

**Location:** `workers/email-receiver/`  
**Type:** Cloudflare Email Worker (triggered by Email Routing, not HTTP)

This Worker is wired into Cloudflare Email Routing for `zainesstayandplay.com`. When a customer emails `info@zainesstayandplay.com`, the Worker:
1. Forwards the message to the owner's Gmail
2. Parses the raw MIME email with `postal-mime`
3. POSTs to `/api/email/inbound` so it appears in the admin inbox

### Current Configuration

| Item | Value |
|---|---|
| Worker name | `zaines-email-receiver` |
| Secrets | `FORWARD_TO`, `APP_URL`, `INBOUND_WEBHOOK_SECRET` |
| Vercel env vars | `INBOUND_WEBHOOK_SECRET` (must match Worker secret) |

### Maintenance Commands

```bash
cd workers/email-receiver

# Deploy code changes
pnpm install
pnpm exec wrangler deploy

# Stream live logs (useful for debugging missed emails)
pnpm exec wrangler tail

# List secrets
pnpm exec wrangler secret list

# Update forwarding destination (must be a verified CF destination address)
echo "zainestayandplay@gmail.com" | pnpm exec wrangler secret put FORWARD_TO

# Rotate webhook secret (update Vercel INBOUND_WEBHOOK_SECRET too)
SECRET=$(openssl rand -base64 32)
echo "$SECRET" | pnpm exec wrangler secret put INBOUND_WEBHOOK_SECRET
```

### Cloudflare Dashboard — Email Routing Rule

After deploying, the routing rule must point to the Worker:

1. Cloudflare → `zainesstayandplay.com` → Email → Email Routing → Routes
2. Edit (or create) the rule for `info@zainesstayandplay.com`
3. Set **Action** to **Send to a Worker** → `zaines-email-receiver`
4. Save — the Worker handles Gmail forwarding internally

**Critical:** `FORWARD_TO` must be a verified address in Cloudflare Email Routing → **Destination Addresses**. `message.forward()` throws (causing a bounce/retry) if the address is unverified.

### Testing the Inbound Webhook

```bash
# Test the Next.js webhook endpoint directly
curl -X POST https://zainesstayandplay.com/api/email/inbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INBOUND_WEBHOOK_SECRET" \
  -d '{
    "from": "customer@example.com",
    "to": "info@zainesstayandplay.com",
    "subject": "Test inbound",
    "html": "<p>This is a test inbound email</p>"
  }'
# Expected: {"success":true,"data":{...}}

# Then check /admin/inbox — the Inbox tab should show the email
```

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 100% error rate in Worker dashboard | `FORWARD_TO` is not a verified destination address | Verify the address in CF Email Routing → Destination Addresses |
| Inbound emails appear in Gmail but not admin inbox | `INBOUND_WEBHOOK_SECRET` mismatch or Vercel hasn't redeployed | Check Vercel env var, trigger redeploy with `npx vercel --prod --yes` |
| `{"error":"Webhook not configured"}` from `/api/email/inbound` | `INBOUND_WEBHOOK_SECRET` not set in Vercel | Add it in Vercel dashboard and redeploy |
| No events in `wrangler tail` | Email Routing rule not pointing to the Worker | Check Cloudflare → Email Routing → Routes |

### Deploying to a New Account

1. **Deploy the Worker**
   ```bash
   cd workers/email-receiver
   pnpm install
   CLOUDFLARE_API_TOKEN="cfat_..." CLOUDFLARE_ACCOUNT_ID="..." pnpm exec wrangler deploy
   ```

2. **Set secrets**
   ```bash
   echo "zainestayandplay@gmail.com" | pnpm exec wrangler secret put FORWARD_TO
   echo "https://zainesstayandplay.com" | pnpm exec wrangler secret put APP_URL
   SECRET=$(openssl rand -base64 32)
   echo "$SECRET" | pnpm exec wrangler secret put INBOUND_WEBHOOK_SECRET
   echo "Copy this to Vercel INBOUND_WEBHOOK_SECRET: $SECRET"
   ```

3. **Add `INBOUND_WEBHOOK_SECRET` to Vercel** and redeploy

4. **Update Email Routing rule** in Cloudflare dashboard (see above)

5. **Verify the destination address** (`FORWARD_TO` value) is listed in Cloudflare Email Routing → Destination Addresses

6. **Send a test email** to `info@zainesstayandplay.com` and confirm it appears in both Gmail and the admin inbox

> **Security note:** Never commit `RESEND_API_KEY`, `EMAIL_WORKER_SECRET`, `INBOUND_WEBHOOK_SECRET`, or any other secrets to this repository.
