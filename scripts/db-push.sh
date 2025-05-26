#!/bin/bash
# Script to push database migrations with proper authentication

# Load database password from .env.local
if [ -f .env.local ]; then
    source .env.local
else
    echo "Error: .env.local file not found"
    echo "Please create .env.local with SUPABASE_DB_PASSWORD=your-password"
    exit 1
fi

# Check if password is set
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "Error: SUPABASE_DB_PASSWORD not set in .env.local"
    exit 1
fi

echo "Pushing database migrations to remote Supabase..."
./supabase-cli db push