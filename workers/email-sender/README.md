# Zaines Email Sender Worker

Cloudflare Worker for sending emails via Cloudflare Email Service.

## Setup

### 1. Install Dependencies

```bash
cd workers/email-sender
pnpm install
```

### 2. Configure Email Service Binding

The Worker uses Cloudflare Email Service to send emails. The binding is already configured in `wrangler.toml`:

```toml
send_email = [
  { type = "send_email", name = "SEND_EMAIL" }
]
```

### 3. Set API Secret

Generate a secure API secret key and store it:

```bash
# Generate a random secret
openssl rand -base64 32

# Store it in Cloudflare (you'll be prompted to enter it)
pnpm run secret:put
```

### 4. Deploy the Worker

```bash
pnpm run deploy
```

After deployment, you'll get a URL like: `https://zaines-email-sender.YOUR-SUBDOMAIN.workers.dev`

### 5. (Optional) Configure Custom Domain

To use a custom domain like `email.zainesstayandplay.com`:

1. Go to Cloudflare Dashboard → Workers & Pages → Your Worker
2. Click "Triggers" tab
3. Add a Custom Domain
4. Or uncomment and customize the routes in `wrangler.toml`:
   ```toml
   routes = [
     { pattern = "email.zainesstayandplay.com/*", zone_name = "zainesstayandplay.com" }
   ]
   ```

## Usage

### From Next.js App

The Worker exposes a REST API endpoint. Send a POST request with:

```typescript
const response = await fetch('https://your-worker-url.workers.dev', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_SECRET',
  },
  body: JSON.stringify({
    from: 'info@zainesstayandplay.com',
    to: 'customer@example.com',
    subject: 'Booking Confirmation',
    html: '<h1>Thank you for booking!</h1>',
    text: 'Thank you for booking!', // optional
  }),
});

const result = await response.json();
// { success: true, messageId: "..." }
```

### Environment Variables in Next.js

Add to your `.env` file:

```env
EMAIL_WORKER_URL=https://zaines-email-sender.YOUR-SUBDOMAIN.workers.dev
EMAIL_WORKER_SECRET=your-api-secret-from-step-3
```

## Development

### Run Locally

```bash
pnpm run dev
```

This starts a local development server at `http://localhost:8787`

### View Logs

```bash
pnpm run tail
```

## Security

- **API Secret**: Never commit the API_SECRET to version control
- **CORS**: Configured to allow requests from any origin (adjust in production if needed)
- **Authentication**: All requests must include `Authorization: Bearer <API_SECRET>` header

## Troubleshooting

### "SEND_EMAIL is not defined"

Make sure the Email Service binding is enabled in your Cloudflare account:
1. Go to Email Routing in Cloudflare Dashboard
2. Ensure Email Routing is enabled
3. Verify DNS records are configured

### Emails not sending

1. Check worker logs: `pnpm run tail`
2. Verify the Email Routing is enabled in Cloudflare
3. Confirm DNS records are properly configured
4. Check that sender email (from) uses your domain `zainesstayandplay.com`
