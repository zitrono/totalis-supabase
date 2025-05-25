#!/bin/bash
# Supabase CLI Helper Script

# Load environment variables
source .env

# Check if token is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN not found in .env"
  echo "Please add it first (see instructions above)"
  exit 1
fi

# Login
echo "🔐 Logging in to Supabase..."
npx supabase login --token $SUPABASE_ACCESS_TOKEN

# Link project
echo "🔗 Linking to project..."
npx supabase link --project-ref qdqbrqnqttyjegiupvri

# Show status
echo "📊 Project status:"
npx supabase status

echo "✅ Setup complete! Now you can run:"
echo "   npx supabase db push"
