#!/bin/bash
# Setup Email Notification Environment Variables on Vercel
# Run this script to add the required email notification variables

set -e

echo "🚀 Setting up email notification environment variables on Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm install -g vercel"
    exit 1
fi

echo "📋 The following environment variables will be added to Vercel:"
echo ""
echo "Required for owner notifications:"
echo "  - OWNER_EMAIL (defaults to info@zainesstayandplay.com)"
echo "  - CONTACT_INBOX_EMAIL (fallback for owner notifications)"
echo "  - EMAIL_WORKER_URL (Cloudflare Worker endpoint)"
echo "  - EMAIL_WORKER_SECRET (Worker authentication)"
echo ""

# Prompt for confirmation
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "📧 Setting OWNER_EMAIL..."
vercel env add OWNER_EMAIL production --force <<EOF
info@zainesstayandplay.com
EOF

echo ""
echo "📧 Setting CONTACT_INBOX_EMAIL..."
vercel env add CONTACT_INBOX_EMAIL production --force <<EOF
info@zainesstayandplay.com
EOF

echo ""
echo "🔗 Setting EMAIL_WORKER_URL..."
echo "ℹ️  Please enter your Cloudflare Worker URL"
echo "   (Example: https://zaines-email-sender.YOUR-SUBDOMAIN.workers.dev)"
read -p "EMAIL_WORKER_URL: " WORKER_URL
if [ -n "$WORKER_URL" ]; then
    vercel env add EMAIL_WORKER_URL production --force <<EOF
$WORKER_URL
EOF
else
    echo "⚠️  Skipping EMAIL_WORKER_URL (not provided)"
fi

echo ""
echo "🔐 Setting EMAIL_WORKER_SECRET..."
echo "ℹ️  Please enter your Cloudflare Worker secret"
echo "   (Generate with: openssl rand -base64 32)"
read -sp "EMAIL_WORKER_SECRET: " WORKER_SECRET
echo
if [ -n "$WORKER_SECRET" ]; then
    vercel env add EMAIL_WORKER_SECRET production --force <<EOF
$WORKER_SECRET
EOF
else
    echo "⚠️  Skipping EMAIL_WORKER_SECRET (not provided)"
fi

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy the Cloudflare email worker (if not done yet):"
echo "      cd workers/email-sender && pnpm run deploy"
echo ""
echo "   2. Verify variables are set:"
echo "      vercel env ls | grep -E '(EMAIL|OWNER|CONTACT)'"
echo ""
echo "   3. Trigger a new deployment to pick up the variables:"
echo "      git commit --allow-empty -m 'chore: trigger redeploy for env vars'"
echo "      git push"
echo ""
