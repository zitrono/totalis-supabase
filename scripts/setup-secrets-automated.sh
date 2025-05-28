#!/bin/bash

# This script sets up GitHub secrets for the CI/CD pipeline
# It reads values from local .env files and sets them as GitHub secrets

echo "🔐 Setting up GitHub Secrets for CI/CD Pipeline..."
echo ""

# Check if gh CLI is authenticated
if ! gh auth status > /dev/null 2>&1; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

# Project reference ID from the Supabase URL
PROJECT_REF="qdqbrqnqttyjegiupvri"

# Read .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Read .env.local file
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    exit 1
fi

# Source the env files (in a subshell to avoid polluting current environment)
SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d'=' -f2-)
SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" .env | cut -d'=' -f2-)
SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_KEY=" .env | cut -d'=' -f2-)
OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2-)
GOOGLE_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" .env | cut -d'=' -f2-)
GOOGLE_CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" .env | cut -d'=' -f2-)
SUPABASE_ACCESS_TOKEN=$(grep "^SUPABASE_ACCESS_TOKEN=" .env | cut -d'=' -f2-)
SUPABASE_DB_PASSWORD=$(grep "^SUPABASE_DB_PASSWORD=" .env.local | cut -d'=' -f2-)

# Build DATABASE_URL
DATABASE_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Function to set a secret
set_secret() {
    local name=$1
    local value=$2
    
    if [ -z "$value" ]; then
        echo "⚠️  Skipping $name (empty value)"
        return
    fi
    
    echo -n "Setting $name... "
    echo "$value" | gh secret set "$name" --repo zitrono/totalis-supabase
    if [ $? -eq 0 ]; then
        echo "✅"
    else
        echo "❌"
    fi
}

echo "Setting up repository secrets..."
echo ""

set_secret "SUPABASE_ACCESS_TOKEN" "$SUPABASE_ACCESS_TOKEN"
set_secret "SUPABASE_PROJECT_ID" "$PROJECT_REF"
set_secret "SUPABASE_PROJECT_REF" "$PROJECT_REF"
set_secret "SUPABASE_DB_PASSWORD" "$SUPABASE_DB_PASSWORD"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_KEY"
set_secret "SUPABASE_URL" "$SUPABASE_URL"
set_secret "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
set_secret "DATABASE_URL" "$DATABASE_URL"
set_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"
set_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
set_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"

echo ""
echo "✅ GitHub Secrets setup complete!"
echo ""
echo "You can verify the secrets at:"
echo "https://github.com/zitrono/totalis-supabase/settings/secrets/actions"