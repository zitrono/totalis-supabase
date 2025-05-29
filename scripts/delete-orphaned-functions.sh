#!/bin/bash
set -euo pipefail

# Delete orphaned edge functions from Supabase that no longer exist in Git
# This maintains Git as the single source of truth

echo "🧹 Checking for orphaned edge functions..."

# Check required environment variables
if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "❌ Error: SUPABASE_PROJECT_REF environment variable is required"
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN environment variable is required"
  exit 1
fi

# Get list of functions from remote Supabase project
echo "📋 Fetching deployed functions from Supabase..."
DEPLOYED_FUNCTIONS=$(supabase functions list --project-ref "$SUPABASE_PROJECT_REF" --output json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")

if [ -z "$DEPLOYED_FUNCTIONS" ]; then
  echo "ℹ️  No functions currently deployed on Supabase"
  exit 0
fi

echo "Found deployed functions:"
echo "$DEPLOYED_FUNCTIONS" | sed 's/^/  - /'

# Get list of functions in Git repository
echo ""
echo "📂 Checking functions in Git repository..."
LOCAL_FUNCTIONS=""
for dir in supabase/functions/*/; do
  if [ -d "$dir" ] && [ -f "$dir/index.ts" ]; then
    # Skip _shared directory as it's not a function
    function_name=$(basename "$dir")
    if [ "$function_name" != "_shared" ]; then
      LOCAL_FUNCTIONS="${LOCAL_FUNCTIONS}${function_name}"$'\n'
    fi
  fi
done

# Remove trailing newline
LOCAL_FUNCTIONS=$(echo "$LOCAL_FUNCTIONS" | sed '/^$/d')

if [ -z "$LOCAL_FUNCTIONS" ]; then
  echo "⚠️  No functions found in Git repository"
else
  echo "Found local functions:"
  echo "$LOCAL_FUNCTIONS" | sed 's/^/  - /'
fi

# Find orphaned functions (deployed but not in Git)
echo ""
echo "🔍 Identifying orphaned functions..."
ORPHANED_FUNCTIONS=""
while IFS= read -r deployed_func; do
  if [ -n "$deployed_func" ]; then
    if ! echo "$LOCAL_FUNCTIONS" | grep -q "^${deployed_func}$"; then
      ORPHANED_FUNCTIONS="${ORPHANED_FUNCTIONS}${deployed_func}"$'\n'
    fi
  fi
done <<< "$DEPLOYED_FUNCTIONS"

# Remove trailing newline
ORPHANED_FUNCTIONS=$(echo "$ORPHANED_FUNCTIONS" | sed '/^$/d')

if [ -z "$ORPHANED_FUNCTIONS" ]; then
  echo "✅ No orphaned functions found. Deployment is in sync!"
  exit 0
fi

# Delete orphaned functions
echo "Found orphaned functions to delete:"
echo "$ORPHANED_FUNCTIONS" | sed 's/^/  - /'
echo ""

DELETED_COUNT=0
FAILED_COUNT=0

while IFS= read -r func_name; do
  if [ -n "$func_name" ]; then
    echo "🗑️  Deleting function: $func_name"
    if supabase functions delete "$func_name" --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null; then
      echo "   ✅ Successfully deleted: $func_name"
      ((DELETED_COUNT++))
    else
      echo "   ❌ Failed to delete: $func_name"
      ((FAILED_COUNT++))
    fi
  fi
done <<< "$ORPHANED_FUNCTIONS"

echo ""
echo "📊 Summary:"
echo "   - Deleted: $DELETED_COUNT functions"
echo "   - Failed: $FAILED_COUNT functions"

if [ $FAILED_COUNT -gt 0 ]; then
  echo ""
  echo "⚠️  Some functions failed to delete. Please check manually."
  exit 1
fi

echo ""
echo "✅ Successfully cleaned up all orphaned functions!"