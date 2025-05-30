#!/bin/bash
set -e

echo "🔧 Applying consolidated migration fix..."

# Set the Supabase CLI path
SUPABASE_CLI="./supabase-cli"

# Ensure we have the password
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  source .env.local
fi

# First, manually create the missing tables via direct SQL
echo "Creating missing tables..."
cat scripts/apply-consolidated-migration.sql | $SUPABASE_CLI db push --db-url "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.qdqbrqnqttyjegiupvri.supabase.co:5432/postgres"

echo "✅ Missing tables created. Now applying remaining migrations..."

# Now push the remaining migrations
$SUPABASE_CLI db push --password "$SUPABASE_DB_PASSWORD"

echo "✅ All migrations applied successfully!"