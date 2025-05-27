#!/bin/bash

# Script to extract Supabase project information for GitHub Actions setup

echo "=== Supabase Project Information ==="
echo ""

# Load environment variables
if [ -f .env.local ]; then
    source .env.local
elif [ -f .env ]; then
    source .env
else
    echo "❌ No .env or .env.local file found"
    echo "   Please ensure your environment variables are set"
    exit 1
fi

# Extract project ID from SUPABASE_URL
if [ -n "$SUPABASE_URL" ]; then
    PROJECT_ID=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')
    echo "✅ Project ID: $PROJECT_ID"
    echo ""
    echo "📋 Add this to GitHub Secrets:"
    echo "   Name: SUPABASE_PROJECT_ID"
    echo "   Value: $PROJECT_ID"
else
    echo "❌ SUPABASE_URL not found in environment"
fi

echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Get your Supabase Access Token:"
echo "   - Go to: https://app.supabase.com/account/tokens"
echo "   - Click 'Generate new token'"
echo "   - Name: 'GitHub Actions Deployment'"
echo "   - Copy the token"
echo ""
echo "2. Add GitHub Secrets:"
echo "   - Go to your GitHub repo → Settings → Secrets and variables → Actions"
echo "   - Add SUPABASE_PROJECT_ID (value shown above)"
echo "   - Add SUPABASE_ACCESS_TOKEN (from step 1)"
echo ""
echo "3. Deploy edge functions:"
echo "   - Push to main/master branch, or"
echo "   - Go to Actions tab → Deploy Edge Functions → Run workflow"
echo ""

# Check if we're logged in to Supabase CLI
echo "=== Alternative: Direct CLI Deployment ==="
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI is installed"
    echo ""
    echo "To deploy without Docker:"
    echo "   supabase login"
    echo "   supabase functions deploy checkin-process --project-ref $PROJECT_ID"
else
    echo "❌ Supabase CLI not installed"
    echo "   Install with: brew install supabase/tap/supabase"
fi