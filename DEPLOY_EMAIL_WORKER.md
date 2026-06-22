# 🚀 Cloudflare Email Worker - Deployment Instructions

**✅ STATUS: DEPLOYED AND CONFIGURED**

This worker handles sending emails via Resend API. All configuration is complete!

## ✅ Already Completed

- ✅ Created Cloudflare Worker code (`workers/email-sender/`)
- ✅ Updated Next.js app to use Cloudflare Worker
- ✅ Deployed worker to: `https://zaines-email-sender.davidtraversmailbox.workers.dev`
- ✅ Configured Resend API key
- ✅ Configured worker authentication secret
- ✅ Added all Vercel Production environment variables
- ✅ Tested worker successfully

## 🔧 Current Configuration

### Cloudflare Worker
- **URL**: `https://zaines-email-sender.davidtraversmailbox.workers.dev`
- **Service**: Resend API integration (not Cloudflare Email Service)
- **Authentication**: Bearer token via EMAIL_WORKER_SECRET

### Secrets (configured in worker)
```bash
RESEND_API_KEY = "re_WJo9MQYU_ERt4VpwkLKzKscF8AHTPXbKt"
EMAIL_WORKER_SECRET = "hvu4O/QHLitY9whzGKdMdJ7Oh2V+9sw6WTIgxn0wRYGHAYY5Fa6C8PduleMAdT3m"
```

### Vercel Production Environment Variables (configured)
```bash
EMAIL_WORKER_URL="https://zaines-email-sender.davidtraversmailbox.workers.dev"
EMAIL_WORKER_SECRET="hvu4O/QHLitY9whzGKdMdJ7Oh2V+9sw6WTIgxn0wRYGHAYY5Fa6C8PduleMAdT3m"
EMAIL_FROM="jgibbs@zainesstayandplay.com"
OWNER_EMAIL="info@zainesstayandplay.com"
CONTACT_INBOX_EMAIL="info@zainesstayandplay.com"
```

### Local `.env` File (configured)
All variables above are also set in your local `.env` file.

## 🧪 Testing Results

**Direct Worker Test**: ✅ SUCCESS
```json
{"success":true,"messageId":"46657bbc-f501-41f3-b485-919197f70436"}
```

Email was successfully sent from `info@zainesstayandplay.com` to `david@customcodingcreations.com`.

## 📋 Next Steps

### 1. Deploy to Vercel Production

Your Vercel environment variables are configured, but you need to trigger a deployment to pick them up:

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "feat: Configure email notifications with Cloudflare worker"
git push origin main

# OR manually deploy
vercel --prod
```

### 2. Test Production Emails

After Vercel deployment completes:

1. Visit your production site
2. Create a test booking with payment
3. Verify you receive:
   - Customer booking confirmation
   - Owner notification at `info@zainesstayandplay.com` (forwarded to `david@customcodingcreations.com`)

## 🔧 Maintenance Commands

### Deploy Worker Updates
```bash
cd workers/email-sender
pnpm wrangler deploy
```

### View Worker Logs (Real-time)
```bash
cd workers/email-sender
pnpm wrangler tail
```

### Test Worker Directly
```bash
curl -X POST https://zaines-email-sender.davidtraversmailbox.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hvu4O/QHLitY9whzGKdMdJ7Oh2V+9sw6WTIgxn0wRYGHAYY5Fa6C8PduleMAdT3m" \
  -d '{
    "from": "info@zainesstayandplay.com",
    "to": "david@customcodingcreations.com",
    "subject": "Test Email",
    "html": "<h1>Test from Cloudflare Worker!</h1>"
  }'
```

### Update Worker Secrets

If you need to rotate the secrets:

```bash
cd workers/email-sender

# Update Resend API key
echo "NEW_RESEND_KEY" | pnpm wrangler secret put RESEND_API_KEY

# Update worker authentication secret
echo "NEW_AUTH_SECRET" | pnpm wrangler secret put EMAIL_WORKER_SECRET

# Then update Vercel and local .env accordingly
```

### Check Current Secrets
```bash
cd workers/email-sender
pnpm wrangler secret list
```

## 🔍 Troubleshooting

### Worker Returns 401 Unauthorized
- Check that EMAIL_WORKER_SECRET in Vercel matches the secret in the worker
- Verify Authorization header is correct: `Bearer <secret>`

### Worker Returns 500 Error
- Check worker logs: `pnpm wrangler tail`
- Verify RESEND_API_KEY is valid in Resend dashboard
- Check Resend account status and quota

### Emails Not Being Sent from Next.js App
- Verify Vercel environment variables are set: `vercel env ls production`
- Ensure Vercel app was redeployed after adding environment variables
- Check Next.js app logs for errors
- Verify EMAIL_WORKER_URL is accessible from Vercel's network

### Email Delivery Issues
- Check Resend dashboard: https://resend.com/emails
- Verify sender domain is verified in Resend
- Check spam folders
- Ensure Cloudflare Email Routing is active for `zainesstayandplay.com`

## 📊 What Happens After Deployment

1. **Worker is live** at `https://zaines-email-sender.davidtraversmailbox.workers.dev`
2. **Next.js app calls worker** when sending emails (booking confirmations, owner notifications)
3. **Worker sends via Resend** API
4. **Emails delivered** from `jgibbs@zainesstayandplay.com` or `info@zainesstayandplay.com`
5. **Owner notifications** forwarded via Cloudflare Email Routing to `david@customcodingcreations.com`

## 📚 Additional Documentation

- **Complete Setup Guide**: `EMAIL_NOTIFICATION_SETUP_COMPLETE.md`
- **Quick Reference**: `EMAIL_SYSTEM_QUICK_REFERENCE.md`
- **Booking Notification Fix**: `BOOKING_EMAIL_NOTIFICATION_FIX.md`
- **Vercel Setup Status**: `VERCEL_ENV_SETUP_STATUS.md`

## 🎉 Summary

Your email worker is **fully configured and tested**! 

**What works:**
- ✅ Cloudflare Worker deployed and responding
- ✅ Resend API integration configured
- ✅ Authentication working
- ✅ Test email sent successfully
- ✅ All environment variables configured

**What's needed:**
- ⏳ Deploy to Vercel Production to activate
- ⏳ Test with real booking on production

The system is ready to send booking confirmations to customers and owner notifications to `info@zainesstayandplay.com`!

3. Worker uses Cloudflare Email Service to send from `info@zainesstayandplay.com`
4. Incoming emails to `info@zainesstayandplay.com` forward to `david@customcodingcreations.com`

## 🎯 Summary

- **Email Receiving**: Cloudflare Email Routing (✅ Already configured)
- **Email Sending**: Cloudflare Email Worker (⏳ Deploy now!)
- **No Resend needed**: Everything in Cloudflare
- **Cost**: Free (within Cloudflare limits)

## ⚠️ Important Notes

- The API secret (`WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=`) is stored in Cloudflare and your `.env` file
- Never commit `.env` to git
- The worker URL will be specific to your Cloudflare account
- DNS for email routing must remain configured (already done!)

---

**Ready to deploy? Run the commands above in order!** 🚀
