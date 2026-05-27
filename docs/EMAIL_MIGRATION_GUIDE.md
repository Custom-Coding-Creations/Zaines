# Migrating from Resend to Cloudflare Email Workers

This guide explains how to migrate from Resend to Cloudflare Email Workers for sending emails.

## Overview

The migration involves:
1. **Email Receiving**: Cloudflare Email Routing forwards emails from `info@zainesstayandplay.com` to `david@customcodingcreations.com` (already configured)
2. **Email Sending**: Cloudflare Email Worker sends transactional emails from `info@zainesstayandplay.com`

## Prerequisites

- Cloudflare account with domain `zainesstayandplay.com`
- Email Routing already enabled (DNS configured)
- Node.js and pnpm installed

## Step 1: Install Wrangler CLI

```bash
pnpm install -g wrangler
```

## Step 2: Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser window to authenticate with your Cloudflare account.

## Step 3: Deploy the Email Worker

```bash
cd workers/email-sender
pnpm install
pnpm run deploy
```

After deployment, you'll see output like:
```
✨ Deployed zaines-email-sender to https://zaines-email-sender.YOUR-SUBDOMAIN.workers.dev
```

**Save this URL - you'll need it for the environment variables!**

## Step 4: Set the API Secret

Generate a secure random secret:

```bash
openssl rand -base64 32
```

Store it in Cloudflare:

```bash
cd workers/email-sender
pnpm run secret:put
```

When prompted, paste the secret you just generated.

**Save this secret - you'll need it for the environment variables!**

## Step 5: Configure Next.js Environment Variables

Add to your `.env` file:

```env
EMAIL_WORKER_URL=https://zaines-email-sender.YOUR-SUBDOMAIN.workers.dev
EMAIL_WORKER_SECRET=your-generated-secret-from-step-4
```

## Step 6: Test the Setup

### Local Testing

1. Start your Next.js app:
   ```bash
   pnpm run dev
   ```

2. Trigger an email (e.g., create a test booking, send a contact form)

3. Check the worker logs:
   ```bash
   cd workers/email-sender
   pnpm run tail
   ```

### Production Testing

After deploying to production (Vercel, etc.):

1. Add the environment variables in your hosting platform
2. Send a test email through your application
3. Verify it arrives at the recipient

## Step 7: (Optional) Configure Custom Domain

Instead of using the `workers.dev` subdomain, you can use a custom domain like `email.zainesstayandplay.com`:

1. Go to Cloudflare Dashboard → Workers & Pages → zaines-email-sender
2. Click "Triggers" tab
3. Click "Add Custom Domain"
4. Enter: `email.zainesstayandplay.com`
5. Update `EMAIL_WORKER_URL` in your `.env`:
   ```env
   EMAIL_WORKER_URL=https://email.zainesstayandplay.com
   ```

## Verification Checklist

- [ ] Cloudflare Email Routing is enabled (check Dashboard → Email Routing)
- [ ] DNS records are configured (MX, SPF, DKIM)
- [ ] Worker is deployed successfully
- [ ] API secret is set in Cloudflare
- [ ] Environment variables are configured in `.env`
- [ ] Test email sends successfully
- [ ] Test email arrives at destination

## Troubleshooting

### "SEND_EMAIL is not defined"

**Cause**: Email Service binding not configured

**Solution**: 
1. Verify Email Routing is enabled in Cloudflare Dashboard
2. Check that `wrangler.toml` includes:
   ```toml
   send_email = [
     { type = "send_email", name = "SEND_EMAIL" }
   ]
   ```
3. Redeploy: `pnpm run deploy`

### "Unauthorized" when sending emails

**Cause**: API secret mismatch

**Solution**:
1. Regenerate secret: `openssl rand -base64 32`
2. Update in Cloudflare: `pnpm run secret:put`
3. Update `EMAIL_WORKER_SECRET` in `.env`
4. Restart Next.js app

### Emails go to dev queue instead of sending

**Cause**: Environment variables not set

**Solution**:
1. Verify `.env` has both:
   - `EMAIL_WORKER_URL=https://...`
   - `EMAIL_WORKER_SECRET=your-secret`
2. Restart Next.js app
3. Check `tmp/email-queue.log` for queued emails

### Worker deployment fails

**Cause**: Not authenticated or wrong account

**Solution**:
1. Run `wrangler whoami` to check authentication
2. Run `wrangler login` to re-authenticate
3. Verify you're deploying to the correct account

## Monitoring

### View Worker Logs

```bash
cd workers/email-sender
pnpm run tail
```

### Check Email Queue

When emails fail to send, they're queued locally:

```bash
cat tmp/email-queue.log | jq .
```

### Worker Analytics

View in Cloudflare Dashboard:
1. Go to Workers & Pages → zaines-email-sender
2. Click "Metrics" tab
3. View requests, errors, and duration

## Rollback to Resend (If Needed)

If you need to rollback:

1. Get Resend API key from https://resend.com/api-keys
2. Add to `.env`:
   ```env
   RESEND_API_KEY=re_your_api_key
   ```
3. Comment out worker variables:
   ```env
   # EMAIL_WORKER_URL=...
   # EMAIL_WORKER_SECRET=...
   ```
4. Redeploy application

Note: The code still supports Resend as a fallback.

## Cost Comparison

### Resend
- **Free tier**: 3,000 emails/month, 100 emails/day
- **Paid**: $20/month for 50,000 emails

### Cloudflare Email Workers
- **Free tier**: 100,000 requests/day (worker invocations)
- **Email sending**: No additional cost with Email Routing enabled
- **Cost**: Essentially free for most use cases

## Next Steps

Once everything is working:

1. Remove `RESEND_API_KEY` from `.env` files
2. Delete Resend account (optional)
3. Update documentation
4. Monitor worker performance in Cloudflare Dashboard

## Support

- **Cloudflare Email Docs**: https://developers.cloudflare.com/email-routing/
- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Worker Code**: `workers/email-sender/src/index.ts`
- **Next.js Email Code**: `src/lib/notifications.ts`
