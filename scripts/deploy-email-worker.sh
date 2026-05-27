#!/bin/bash

# Deployment script for Cloudflare Email Worker
# This script deploys the worker and configures the API secret

set -e

API_SECRET="WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA="

echo "🚀 Deploying Cloudflare Email Worker..."
echo ""

cd workers/email-sender

# Deploy the worker
echo "📦 Deploying worker to Cloudflare..."
DEPLOY_OUTPUT=$(pnpm wrangler deploy 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract the worker URL from deployment output
WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+workers\.dev' | head -1)

if [ -z "$WORKER_URL" ]; then
  echo "⚠️  Could not extract worker URL from deployment output"
  echo "Please check the deployment output above for the URL"
else
  echo ""
  echo "✅ Worker deployed successfully!"
  echo "📍 Worker URL: $WORKER_URL"
fi

# Set the API secret
echo ""
echo "🔐 Setting API secret..."
echo "$API_SECRET" | pnpm wrangler secret put API_SECRET

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Add these to your .env file:"
echo "   EMAIL_WORKER_URL=$WORKER_URL"
echo "   EMAIL_WORKER_SECRET=$API_SECRET"
echo ""
echo "2. Test the setup with: pnpm run dev"
echo ""
