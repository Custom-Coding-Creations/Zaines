#!/bin/bash
# Quick command reference for setting up remaining Vercel environment variables

set -e

echo "📋 Vercel Email Environment Variables - Quick Setup"
echo ""
echo "Already configured:"
echo "  ✅ OWNER_EMAIL"
echo "  ✅ CONTACT_INBOX_EMAIL"  
echo "  ✅ EMAIL_FROM"
echo ""
echo "Still needed:"
echo "  ⚠️  EMAIL_WORKER_URL"
echo "  ⚠️  EMAIL_WORKER_SECRET"
echo ""
echo "---"
echo ""

# Check if worker is deployed
if [ -d "workers/email-sender" ]; then
    echo "Step 1: Deploy Cloudflare Email Worker"
    echo ""
    echo "Run these commands:"
    echo "  cd workers/email-sender"
    echo "  pnpm install"
    echo "  pnpm wrangler secret put RESEND_API_KEY    # Your Resend API key"
    echo "  pnpm wrangler secret put EMAIL_WORKER_SECRET    # Generate with: openssl rand -base64 32"
    echo "  pnpm run deploy"
    echo ""
    echo "Copy the worker URL from deployment output."
    echo ""
    read -p "Press Enter when worker is deployed..."
    echo ""
fi

echo "Step 2: Add EMAIL_WORKER_URL to Vercel"
echo ""
read -p "Enter your Cloudflare Worker URL: " WORKER_URL

if [ -n "$WORKER_URL" ]; then
    echo "$WORKER_URL" | vercel env add EMAIL_WORKER_URL production
    echo "✅ EMAIL_WORKER_URL added to Vercel Production"
else
    echo "⚠️  Skipped EMAIL_WORKER_URL"
fi

echo ""
echo "Step 3: Add EMAIL_WORKER_SECRET to Vercel"
echo ""
echo "This should be the SAME secret you used in: pnpm wrangler secret put EMAIL_WORKER_SECRET"
echo ""
read -sp "Enter EMAIL_WORKER_SECRET (or generate new with: openssl rand -base64 32): " WORKER_SECRET
echo ""

if [ -n "$WORKER_SECRET" ]; then
    echo "$WORKER_SECRET" | vercel env add EMAIL_WORKER_SECRET production
    echo "✅ EMAIL_WORKER_SECRET added to Vercel Production"
    echo ""
    echo "⚠️  IMPORTANT: Make sure this same secret is set in Cloudflare Worker"
    echo "   If you need to update it in Cloudflare, run:"
    echo "   cd workers/email-sender && pnpm wrangler secret put EMAIL_WORKER_SECRET"
else
    echo "⚠️  Skipped EMAIL_WORKER_SECRET"
fi

echo ""
echo "---"
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Verify all variables are set:"
echo "     vercel env ls | grep -E '(EMAIL|OWNER|CONTACT)'"
echo ""
echo "  2. Trigger a redeploy:"
echo "     git commit --allow-empty -m 'chore: update env vars'"
echo "     git push"
echo ""
echo "  3. Test by making a booking on your site"
echo "     - Customer should receive confirmation email"
echo "     - Owner should receive notification at info@zainesstayandplay.com"
echo ""
