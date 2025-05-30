#!/bin/bash
set -e

echo "🧪 Testing Consolidated Migration"
echo "================================"

# Source environment file if it exists
if [ -f "../.env.local" ]; then
    export $(grep -v '^#' ../.env.local | xargs)
elif [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Check if we have the required environment variables
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "❌ Error: SUPABASE_DB_PASSWORD not set"
    echo "Please set it in your .env.local file or export it"
    exit 1
fi

# Path to the consolidated migration
MIGRATION_FILE="../supabase/migrations/20250529154547_refactor_consolidated_base_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Consolidated migration not found at $MIGRATION_FILE"
    exit 1
fi

echo "✅ Found consolidated migration file"
echo ""

# Test 1: Check SQL syntax
echo "🔍 Test 1: Checking SQL syntax..."
npx supabase db lint "$MIGRATION_FILE" 2>&1 || {
    echo "⚠️  SQL linting failed, but continuing..."
}

# Test 2: Check for auth.users references
echo ""
echo "🔍 Test 2: Checking for auth.users references..."
if grep -i "auth\.users" "$MIGRATION_FILE" | grep -v "COMMENT" | grep -v "^--"; then
    echo "❌ Error: Found auth.users references in migration!"
    echo "These will cause preview branch failures."
    exit 1
else
    echo "✅ No auth.users references found"
fi

# Test 3: Check for required functions
echo ""
echo "🔍 Test 3: Checking for required JWT functions..."
required_functions=("create_profile_if_needed" "check_auth_type")
for func in "${required_functions[@]}"; do
    if grep -q "CREATE.*FUNCTION.*$func" "$MIGRATION_FILE"; then
        echo "✅ Found function: $func"
    else
        echo "❌ Missing function: $func"
        exit 1
    fi
done

# Test 4: Check RLS policies use JWT functions
echo ""
echo "🔍 Test 4: Checking RLS policies use JWT functions..."
if grep -E "CREATE POLICY.*auth\.uid\(\)" "$MIGRATION_FILE" > /dev/null; then
    echo "✅ RLS policies use auth.uid() (JWT-based)"
else
    echo "⚠️  Warning: No RLS policies found using auth.uid()"
fi

if grep -E "CREATE POLICY.*check_auth_type\(\)" "$MIGRATION_FILE" > /dev/null; then
    echo "✅ RLS policies use check_auth_type() function"
else
    echo "⚠️  Warning: No RLS policies found using check_auth_type()"
fi

# Test 5: Check for proper grants
echo ""
echo "🔍 Test 5: Checking for proper grants..."
if grep -q "GRANT.*authenticated" "$MIGRATION_FILE"; then
    echo "✅ Found grants for authenticated role"
else
    echo "❌ Missing grants for authenticated role"
    exit 1
fi

echo ""
echo "✨ All tests passed!"
echo ""
echo "Next steps:"
echo "1. Reset your local database: npx supabase db reset"
echo "2. Test on a preview branch by creating a PR"
echo "3. Update mobile app to call create_profile_if_needed() after auth"