# Cloudflare Email Worker — Deployment Reference

**Status: Deployed and active.**

The Worker is live at `https://zaines-email-sender.davidtraversmailbox.workers.dev`.  
All environment variables are configured in Vercel production.

For full architecture documentation see [docs/EMAIL_SYSTEM.md](docs/EMAIL_SYSTEM.md).

---

## Current Configuration

| Item | Value |
|---|---|
| Worker URL | `https://zaines-email-sender.davidtraversmailbox.workers.dev` |
| Email provider | Resend API (key stored in Worker secrets) |
| Auth mechanism | Bearer token (`EMAIL_WORKER_SECRET`) |
| Vercel env vars | `EMAIL_WORKER_URL`, `EMAIL_WORKER_SECRET`, `EMAIL_FROM`, `OWNER_EMAIL`, `CONTACT_INBOX_EMAIL` |

> **Security note:** Never commit `RESEND_API_KEY`, `EMAIL_WORKER_SECRET`, or any other secrets to this repository. Manage them via `wrangler secret put` (Worker) and Vercel dashboard / GitHub Secrets (Next.js app).

---

## Maintenance Commands

```bash
# Deploy Worker code changes
cd workers/email-sender
pnpm install
pnpm wrangler deploy

# Stream live Worker logs
pnpm wrangler tail

# List current secrets (names only — values are not shown)
pnpm wrangler secret list

# Rotate RESEND_API_KEY
echo "re_new_key_here" | pnpm wrangler secret put RESEND_API_KEY

# Rotate EMAIL_WORKER_SECRET
echo "$(openssl rand -base64 32)" | pnpm wrangler secret put EMAIL_WORKER_SECRET
# Then update EMAIL_WORKER_SECRET in Vercel env and local .env
```

---

## Testing the Worker Directly

```bash
# Health check
curl https://zaines-email-sender.davidtraversmailbox.workers.dev
# Returns: {"status":"ok","service":"Zaines Email Worker","version":"1.0.0"}

# Send a test email (use your real EMAIL_WORKER_SECRET from .env)
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

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 Unauthorized from Worker | Secret mismatch | Verify `EMAIL_WORKER_SECRET` in Vercel matches the value in Worker secrets |
| 500 from Worker | Bad Resend key or quota exceeded | Check `pnpm wrangler tail` and Resend dashboard |
| Emails going to dev queue | `EMAIL_WORKER_URL` or `EMAIL_WORKER_SECRET` not set in Vercel | Add/verify env vars in Vercel dashboard, redeploy |
| Emails in spam | Deliverability issue | See [docs/EMAIL_DELIVERABILITY.md](docs/EMAIL_DELIVERABILITY.md) |

---

## Deploying to a New Account

If you ever need to deploy the Worker from scratch:

1. **Authenticate Wrangler**
   ```bash
   pnpm wrangler login
   ```

2. **Deploy the Worker**
   ```bash
   cd workers/email-sender
   pnpm install
   pnpm wrangler deploy
   # Note the deployed URL in the output
   ```

3. **Set Worker secrets**
   ```bash
   # Your Resend API key from resend.com/api-keys
   echo "re_your_key" | pnpm wrangler secret put RESEND_API_KEY

   # Generate and store a new auth secret
   SECRET=$(openssl rand -base64 32)
   echo "$SECRET" | pnpm wrangler secret put EMAIL_WORKER_SECRET
   echo "Save this secret: $SECRET"
   ```

4. **Update Next.js environment variables**
   ```env
   EMAIL_WORKER_URL=https://zaines-email-sender.YOUR-SUBDOMAIN.workers.dev
   EMAIL_WORKER_SECRET=<the secret from step 3>
   ```
   Set these in Vercel dashboard (Settings → Environment Variables) and in your local `.env`.

5. **Verify**
   ```bash
   curl -X POST $EMAIL_WORKER_URL \
     -H "Authorization: Bearer $EMAIL_WORKER_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"from":"info@zainesstayandplay.com","to":"you@example.com","subject":"Test","html":"<p>OK</p>"}'
   ```
