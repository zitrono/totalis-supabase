import * as dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Supabase CLI Setup Instructions\n');

console.log('1. Get your Supabase Access Token:');
console.log('   - Go to: https://app.supabase.com/account/tokens');
console.log('   - Click "Generate new token"');
console.log('   - Give it a name like "Totalis CLI"');
console.log('   - Copy the token (you won\'t see it again!)\n');

console.log('2. Set the token as environment variable:');
console.log('   Add to your .env file:');
console.log('   SUPABASE_ACCESS_TOKEN=your-token-here\n');

console.log('3. Login with the token:');
console.log('   npx supabase login --token $SUPABASE_ACCESS_TOKEN\n');

console.log('4. Link to your project:');
console.log(`   npx supabase link --project-ref qdqbrqnqttyjegiupvri\n`);

console.log('5. Apply the migration:');
console.log('   npx supabase db push\n');

// Create a helper script
const helperScript = `#!/bin/bash
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
`;

import * as fs from 'fs';
import * as path from 'path';

const scriptPath = path.join(process.cwd(), 'scripts', 'supabase-cli-setup.sh');
fs.writeFileSync(scriptPath, helperScript);
fs.chmodSync(scriptPath, '755');

console.log('📝 Created helper script: scripts/supabase-cli-setup.sh');
console.log('   Run it after adding your token to .env:\n');
console.log('   ./scripts/supabase-cli-setup.sh\n');