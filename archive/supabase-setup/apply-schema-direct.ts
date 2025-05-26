import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

console.log('🚀 Direct Schema Application\n');

console.log('Since we cannot execute SQL directly via the API, here are your options:\n');

console.log('Option 1: Supabase Dashboard (Easiest)');
console.log('========================================');
console.log('1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor');
console.log('2. Copy the SQL from: supabase/migrations/001_initial_schema.sql');
console.log('3. Paste and click "Run"\n');

console.log('Option 2: Supabase CLI (After getting access token)');
console.log('===================================================');
console.log('1. Get access token from: https://app.supabase.com/account/tokens');
console.log('2. Add to .env: SUPABASE_ACCESS_TOKEN=your-token-here');
console.log('3. Run: ./scripts/supabase-cli-setup.sh');
console.log('4. Run: npx supabase db push\n');

console.log('Option 3: Use Database Connection String');
console.log('=======================================');
console.log('1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/settings/database');
console.log('2. Copy the connection string (URI)');
console.log('3. Use psql or any PostgreSQL client to connect');
console.log('4. Run the migration SQL\n');

// Create a test to check if schema is applied
console.log('To verify schema is applied, run:');
console.log('npm run check:schema\n');

// Create the check script
const checkScript = `
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function quickCheck() {
  const tables = ['coaches', 'user_profiles', 'categories', 'messages'];
  let found = 0;
  
  for (const table of tables) {
    try {
      await supabase.from(table).select('*').limit(0);
      found++;
    } catch {}
  }
  
  if (found === 0) {
    console.log('❌ Schema not applied yet');
  } else if (found < tables.length) {
    console.log(\`⚠️  Partial schema: \${found}/\${tables.length} tables\`);
  } else {
    console.log('✅ Schema is applied!');
  }
}

quickCheck();
`;

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'check-schema.ts'),
  checkScript.trim()
);

console.log('Created: scripts/check-schema.ts');

// Also create auth configuration instructions
const authInstructions = `
# Totalis Authentication Configuration

## 1. Anonymous Authentication
- Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/providers
- Find "Email" provider
- Enable "Allow anonymous sign-ins"

## 2. Google OAuth Setup
- In the same page, find "Google" provider
- Toggle it ON
- Enter these values:

Client ID:
[YOUR_GOOGLE_CLIENT_ID]

Client Secret:
[YOUR_GOOGLE_CLIENT_SECRET]

## 3. Configure Redirect URL
- Copy this redirect URL:
https://qdqbrqnqttyjegiupvri.supabase.co/auth/v1/callback

- Go to: https://console.cloud.google.com/apis/credentials
- Find your OAuth 2.0 Client
- Add the redirect URL to "Authorized redirect URIs"
- Save

## 4. Additional Settings
Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/configuration

- Site URL: http://localhost:3000 (or your app URL)
- Redirect URLs: Add any additional URLs for your app

## 5. Test Authentication
After configuration, test with:
npm run test:auth
`;

fs.writeFileSync(
  path.join(process.cwd(), 'AUTH_SETUP.md'),
  authInstructions.trim()
);

console.log('Created: AUTH_SETUP.md with detailed instructions');