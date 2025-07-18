#!/bin/bash

# GitHub Secrets Setup Guide for Totalis Supabase CI/CD
# This script provides instructions for setting up required GitHub secrets

echo "================================================"
echo "GitHub Secrets Setup for Totalis Supabase CI/CD"
echo "================================================"
echo ""
echo "Navigate to: https://github.com/zitrono/totalis-supabase/settings/secrets/actions"
echo ""
echo "Add the following repository secrets:"
echo ""
echo "1. SUPABASE_ACCESS_TOKEN"
echo "   Value: Your personal access token from https://app.supabase.com/account/tokens"
echo "   Get from: Supabase Dashboard > Account > Access Tokens"
echo ""
echo "2. SUPABASE_PROJECT_REF"
echo "   Value: Your project reference ID"
echo "   Get from: Supabase Dashboard > Settings > General > Reference ID"
echo ""
echo "3. SUPABASE_DB_PASSWORD"
echo "   Value: Your database password"
echo "   Get from: .env.local file or Supabase Dashboard > Settings > Database"
echo ""
echo "4. SUPABASE_SERVICE_ROLE_KEY"
echo "   Value: Your service role key (starts with eyJ...)"
echo "   Get from: Supabase Dashboard > Settings > API > Service Role Key"
echo ""
echo "5. SUPABASE_URL"
echo "   Value: Your project URL (https://[project-ref].supabase.co)"
echo "   Get from: Supabase Dashboard > Settings > API > Project URL"
echo ""
echo "6. SUPABASE_ANON_KEY"
echo "   Value: Your anonymous key (starts with eyJ...)"
echo "   Get from: Supabase Dashboard > Settings > API > Anon Key"
echo ""
echo "7. DATABASE_URL"
echo "   Value: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
echo "   Build from: Database password and project reference"
echo ""
echo "8. OPENAI_API_KEY"
echo "   Value: Your OpenAI API key"
echo "   Get from: https://platform.openai.com/api-keys"
echo ""
echo "9. GOOGLE_CLIENT_ID"
echo "   Value: Your Google OAuth client ID"
echo "   Get from: Google Cloud Console > APIs & Services > Credentials"
echo ""
echo "10. GOOGLE_CLIENT_SECRET"
echo "    Value: Your Google OAuth client secret"
echo "    Get from: Google Cloud Console > APIs & Services > Credentials"
echo ""
echo "================================================"
echo "Environment Configuration"
echo "================================================"
echo ""
echo "Also add these repository variables (Settings > Secrets and variables > Actions > Variables):"
echo ""
echo "1. PREVIEW_SUPABASE_URL"
echo "   Value: Will be dynamically set by preview branches"
echo ""
echo "2. PREVIEW_SUPABASE_ANON_KEY"
echo "   Value: Will be dynamically set by preview branches"
echo ""
echo "================================================"
echo "Branch Protection Rules"
echo "================================================"
echo ""
echo "Navigate to: https://github.com/zitrono/totalis-supabase/settings/branches"
echo ""
echo "Add rule for 'main' branch with:"
echo "- Require pull request reviews before merging"
echo "- Require status checks to pass before merging:"
echo "  - validate-migrations"
echo "  - validate-functions"
echo "  - validate-config"
echo "  - preview"
echo "- Require branches to be up to date before merging"
echo "- Include administrators"
echo ""
echo "================================================"
echo "Done! Your CI/CD pipeline is ready to use."
echo "================================================"