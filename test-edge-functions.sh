#!/bin/bash

# Test Edge Functions locally
echo "🧪 Testing Edge Functions..."

# Get Supabase URL and keys from .env
source .env

# Test Langflow Webhook (no auth required)
echo -e "\n📍 Testing Langflow Webhook..."
curl -X POST "$SUPABASE_URL/functions/v1/langflow-webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": "payload", "flowId": "test-123"}'

# Test Recommendations (requires auth)
echo -e "\n\n📍 Testing Recommendations..."
curl -X POST "$SUPABASE_URL/functions/v1/recommendations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"count": 3}'

# Test Analytics (requires auth)
echo -e "\n\n📍 Testing Analytics..."
curl -X POST "$SUPABASE_URL/functions/v1/analytics-summary" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"period": "week"}'

echo -e "\n\n✅ Tests complete!"