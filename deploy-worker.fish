#!/usr/bin/env fish

# Complete Email Worker Deployment Script
# This script will guide you through the deployment interactively

echo "🚀 Cloudflare Email Worker Deployment"
echo "======================================"
echo ""

# Step 1: Login
echo "Step 1: Authenticate with Cloudflare"
echo "-------------------------------------"
echo "Opening browser for authentication..."
cd /home/obsidian/Projects/Zaines/workers/email-sender

# Try login
echo ""
echo "Please complete the authentication in your browser when it opens."
echo "Click 'Allow' to authorize Wrangler."
echo ""
pnpm wrangler login

if test $status -ne 0
    echo ""
    echo "❌ Authentication failed or timed out."
    echo ""
    echo "Alternative: Use an API Token"
    echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Click 'Create Token'"
    echo "3. Use 'Edit Cloudflare Workers' template"
    echo "4. Copy the token"
    echo "5. Run: export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo "6. Then run this script again"
    exit 1
end

echo ""
echo "✅ Authentication successful!"
echo ""

# Step 2: Deploy
echo "Step 2: Deploy the Worker"
echo "-------------------------"
pnpm wrangler deploy

if test $status -ne 0
    echo ""
    echo "❌ Deployment failed!"
    exit 1
end

echo ""
echo "✅ Worker deployed successfully!"
echo ""

# Step 3: Set API Secret
echo "Step 3: Setting API Secret"
echo "--------------------------"
echo "WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=" | pnpm wrangler secret put API_SECRET

if test $status -ne 0
    echo ""
    echo "❌ Failed to set API secret!"
    exit 1
end

echo ""
echo "✅ API secret configured!"
echo ""

# Step 4: Get Worker URL
echo "Step 4: Worker Configuration"
echo "----------------------------"
set WORKER_URL (pnpm wrangler deployments list 2>/dev/null | grep -oP 'https://[^\s]+\.workers\.dev' | head -1)

if test -z "$WORKER_URL"
    echo "⚠️  Could not automatically detect worker URL"
    echo "Please check the deployment output above for your worker URL"
    echo "It should look like: https://zaines-email-sender-XXX.workers.dev"
    echo ""
    read -P "Enter your worker URL: " WORKER_URL
end

echo ""
echo "✅ Worker URL: $WORKER_URL"
echo ""

# Step 5: Update .env
echo "Step 5: Updating Environment Variables"
echo "---------------------------------------"
cd /home/obsidian/Projects/Zaines

# Create or update .env
if not test -f .env
    cp .env.example .env 2>/dev/null
end

# Add worker configuration
echo "" >> .env
echo "# Cloudflare Email Worker (added by deployment script)" >> .env
echo "EMAIL_WORKER_URL=\"$WORKER_URL\"" >> .env
echo "EMAIL_WORKER_SECRET=\"WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=\"" >> .env
echo "EMAIL_FROM=\"info@zainesstayandplay.com\"" >> .env

echo "✅ Environment variables updated in .env"
echo ""

# Done!
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "Your worker is live at: $WORKER_URL"
echo ""
echo "Next Steps:"
echo "1. Test the email worker:"
echo "   cd /home/obsidian/Projects/Zaines"
echo "   pnpm run dev"
echo "   # Then submit a contact form or create a booking"
echo ""
echo "2. Or test directly:"
echo "   curl -X POST $WORKER_URL \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer WLyq1KHR12md7Uq0C0TN2wv485GAe62nPQ7raLQoDiA=' \\"
echo "     -d '{\"from\":\"info@zainesstayandplay.com\",\"to\":\"david@customcodingcreations.com\",\"subject\":\"Test\",\"html\":\"<h1>It works!</h1>\"}'"
echo ""
echo "3. View worker logs:"
echo "   cd workers/email-sender"
echo "   pnpm wrangler tail"
echo ""
