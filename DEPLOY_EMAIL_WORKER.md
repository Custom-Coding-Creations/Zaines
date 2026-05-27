# 🚀 Cloudflare Email Worker - Deployment Instructions

I've prepared everything! Here's what you need to do to complete the deployment:

## ✅ Already Completed

- ✅ Created Cloudflare Worker code (`workers/email-sender/`)
- ✅ Updated Next.js app to use Cloudflare Worker
- ✅ Generated API secret: `WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=`
- ✅ Installed Wrangler dependencies

## 📋 Steps to Deploy (5 minutes)

### Step 1: Authenticate with Cloudflare

Run this command in your terminal:

```bash
cd /home/obsidian/Projects/Zaines/workers/email-sender
pnpm wrangler login
```

This will open a browser window. Click "Allow" to authorize Wrangler.

**⏱️ Important**: Complete the authorization within 60 seconds or it will timeout.

### Step 2: Deploy the Worker

```bash
pnpm wrangler deploy
```

**Save the URL** it gives you! It will look like:
```
https://zaines-email-sender.YOURSUBDOMAIN.workers.dev
```

### Step 3: Set the API Secret

```bash
echo "WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=" | pnpm wrangler secret put API_SECRET
```

### Step 4: Configure Environment Variables

Create or update `/home/obsidian/Projects/Zaines/.env` with:

```env
# Email Sending via Cloudflare Worker
EMAIL_WORKER_URL=https://zaines-email-sender.YOURSUBDOMAIN.workers.dev
EMAIL_WORKER_SECRET=WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=
EMAIL_FROM=info@zainesstayandplay.com
```

### Step 5: Test It!

```bash
cd /home/obsidian/Projects/Zaines
pnpm run dev
```

Then visit your contact page or trigger a test email (like creating a booking).

## 🔧 Troubleshooting

### If `wrangler login` times out:

Try using an API token instead:

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template: "Edit Cloudflare Workers"
4. Save the token
5. Run: `pnpm wrangler login` or set `CLOUDFLARE_API_TOKEN=your-token` in your environment

### To view worker logs:

```bash
cd workers/email-sender
pnpm wrangler tail
```

### To test the worker directly:

```bash
curl -X POST https://zaines-email-sender.YOURSUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=" \
  -d '{
    "from": "info@zainesstayandplay.com",
    "to": "david@customcodingcreations.com",
    "subject": "Test Email",
    "html": "<h1>Test from Cloudflare Worker!</h1>"
  }'
```

## 📊 What Happens After Deployment

1. Worker is live at `https://zaines-email-sender.*.workers.dev`
2. Next.js app will call this worker to send emails
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
