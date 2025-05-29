#!/bin/bash
# Database push script with suppressed NOTICE messages

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

echo "Pushing database migrations to remote Supabase..."

# Run db push and filter out NOTICE messages
npx supabase db push 2>&1 | grep -v "NOTICE" || true

echo "Database push completed."