#!/bin/bash
set -euo pipefail

# ONE-TIME SCRIPT: Delete all edge functions from Supabase
# This prepares for the first sync to ensure Git is the single source of truth

echo "⚠️  WARNING: This will delete ALL edge functions from your Supabase project!"
echo ""

# Check required environment variables
if [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  echo "❌ Error: SUPABASE_PROJECT_REF environment variable is required"
  echo ""
  echo "Usage:"
  echo "  export SUPABASE_PROJECT_REF=qdqbrqnqttyjegiupvri"
  echo "  export SUPABASE_ACCESS_TOKEN=your-token-here"
  echo "  ./scripts/delete-all-functions.sh"
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN environment variable is required"
  echo ""
  echo "Get your access token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

echo "Project: $SUPABASE_PROJECT_REF"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to delete ALL functions? Type 'DELETE ALL' to confirm: " confirmation
if [ "$confirmation" != "DELETE ALL" ]; then
  echo "❌ Aborted. No functions were deleted."
  exit 1
fi

# Get list of all deployed functions
echo ""
echo "📋 Fetching all deployed functions..."
DEPLOYED_FUNCTIONS=$(supabase functions list --project-ref "$SUPABASE_PROJECT_REF" --output json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")

if [ -z "$DEPLOYED_FUNCTIONS" ]; then
  echo "ℹ️  No functions currently deployed. Nothing to delete."
  exit 0
fi

# Count functions
FUNCTION_COUNT=$(echo "$DEPLOYED_FUNCTIONS" | wc -l | tr -d ' ')

echo "Found $FUNCTION_COUNT functions to delete:"
echo "$DEPLOYED_FUNCTIONS" | sed 's/^/  - /'
echo ""

# Final confirmation
read -p "This will delete $FUNCTION_COUNT functions. Continue? (y/N): " final_confirm
if [ "$final_confirm" != "y" ] && [ "$final_confirm" != "Y" ]; then
  echo "❌ Aborted. No functions were deleted."
  exit 1
fi

# Delete all functions
echo ""
echo "🗑️  Deleting all functions..."
DELETED_COUNT=0
FAILED_COUNT=0

while IFS= read -r func_name; do
  if [ -n "$func_name" ]; then
    echo -n "  Deleting $func_name... "
    if supabase functions delete "$func_name" --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null; then
      echo "✅"
      ((DELETED_COUNT++))
    else
      echo "❌"
      ((FAILED_COUNT++))
    fi
  fi
done <<< "$DEPLOYED_FUNCTIONS"

echo ""
echo "📊 Summary:"
echo "   - Deleted: $DELETED_COUNT functions"
echo "   - Failed: $FAILED_COUNT functions"

if [ $FAILED_COUNT -gt 0 ]; then
  echo ""
  echo "⚠️  Some functions failed to delete. Please check the Supabase dashboard."
  exit 1
fi

echo ""
echo "✅ Successfully deleted all functions!"
echo ""
echo "Next steps:"
echo "1. Merge your PR to deploy functions from Git"
echo "2. The orphan deletion script will maintain sync going forward"