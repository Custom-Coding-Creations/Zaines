# Email Migration Guide (archived)

> **The migration from direct Resend to Cloudflare Worker is complete.**  
> This file is kept for historical reference.

The current email architecture is documented in [EMAIL_SYSTEM.md](EMAIL_SYSTEM.md).

---

## What Changed

Previously, the Next.js app called Resend directly using `RESEND_API_KEY`. This was replaced with a Cloudflare Worker that acts as an authenticated proxy:

```
Before:  Next.js → Resend API  (RESEND_API_KEY in Vercel)
After:   Next.js → Cloudflare Worker → Resend API  (key in Worker secrets only)
```

The `RESEND_API_KEY` environment variable is now **deprecated** in the Next.js/Vercel environment. Configure it in the Cloudflare Worker secrets instead:

```bash
cd workers/email-sender
echo "re_your_key" | pnpm wrangler secret put RESEND_API_KEY
```

The Next.js app now uses `EMAIL_WORKER_URL` and `EMAIL_WORKER_SECRET` instead.

---

## Rollback (if needed)

The original Resend-direct path is no longer in the codebase. To rollback:

1. Revert `src/lib/notifications.ts` to call Resend directly
2. Set `RESEND_API_KEY` in Vercel env
3. Remove `EMAIL_WORKER_URL` and `EMAIL_WORKER_SECRET`
