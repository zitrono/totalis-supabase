#!/bin/bash
set -e

echo "🔧 Skipping consolidated migration and applying only new changes..."

# Set the Supabase CLI path
SUPABASE_CLI="./supabase-cli"

# Ensure we have the password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  source .env.local
fi

# First, mark the consolidated migration as already applied
# This will prevent it from being run since the schema already exists
echo "Marking consolidated migration as applied..."
$SUPABASE_CLI migration repair --status applied 20250529154547

# Now push only the remaining migrations
echo "Applying remaining migrations..."
$SUPABASE_CLI db push --password "$SUPABASE_DB_PASSWORD"

echo "✅ Migrations applied successfully!"