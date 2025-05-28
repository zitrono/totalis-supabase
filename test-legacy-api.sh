#!/bin/bash

# Test script for legacy API endpoints

# Source environment variables
source .env

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Legacy API Endpoints${NC}"
echo "================================="

# Get auth token (you'll need to provide a valid token)
AUTH_TOKEN="${1:-$SUPABASE_ANON_KEY}"

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Error: Please provide an auth token as the first argument${NC}"
    echo "Usage: ./test-legacy-api.sh <auth_token>"
    exit 1
fi

# Base URL
BASE_URL="https://qdqbrqnqttyjegiupvri.supabase.co/functions/v1/legacy-api"

# Test 1: Single recommendation endpoint
echo -e "\n${YELLOW}Test 1: /api/user/recommendation/get${NC}"
echo "Testing single recommendation endpoint..."

RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/api/user/recommendation/get" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"checkin_id": "550e8400-e29b-41d4-a716-446655440000"}')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Request successful${NC}"
    echo "Response: ${RESPONSE}" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Request failed${NC}"
fi

# Test 2: Multiple recommendations endpoint
echo -e "\n${YELLOW}Test 2: /api/user/recommendation/get_all${NC}"
echo "Testing multiple recommendations endpoint..."

RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/api/user/recommendation/get_all" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"checkins": [{"checkin_id": "550e8400-e29b-41d4-a716-446655440000"}, {"checkin_id": "550e8400-e29b-41d4-a716-446655440001"}]}')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Request successful${NC}"
    echo "Response: ${RESPONSE}" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Request failed${NC}"
fi

# Test 3: Second-level recommendations endpoint
echo -e "\n${YELLOW}Test 3: /api/user/recommendation/second/get_all${NC}"
echo "Testing second-level recommendations endpoint..."

RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/api/user/recommendation/second/get_all" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"checkins": [{"checkin_id": "550e8400-e29b-41d4-a716-446655440000"}]}')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Request successful${NC}"
    echo "Response: ${RESPONSE}" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Request failed${NC}"
fi

echo -e "\n${YELLOW}Test Complete!${NC}"
echo "================================="

# Test with app's actual format
echo -e "\n${YELLOW}Test 4: Testing with app's actual URL format${NC}"
echo "Testing how the mobile app will call it..."

# The app will use the domain from .env which now points to our edge function
APP_URL="https://qdqbrqnqttyjegiupvri.supabase.co/functions/v1/legacy-api/api/user/recommendation/get"

RESPONSE=$(curl -s -X POST \
  "${APP_URL}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"checkin_id": "550e8400-e29b-41d4-a716-446655440000"}')

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ App format request successful${NC}"
    echo "Response: ${RESPONSE}" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ App format request failed${NC}"
fi