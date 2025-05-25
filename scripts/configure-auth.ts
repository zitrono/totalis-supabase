import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Note: Google OAuth configuration must be done through Supabase Dashboard
// This script provides the values needed for configuration

console.log('=== Supabase Authentication Configuration ===\n');

console.log('1. Anonymous Authentication:');
console.log('   - Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/providers');
console.log('   - Enable "Anonymous Sign-Ins" under the Email provider section\n');

console.log('2. Google OAuth Configuration:');
console.log('   - Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/providers');
console.log('   - Click on Google provider');
console.log('   - Enable Google provider');
console.log('   - Enter these values:\n');

console.log('   Client ID:');
console.log(`   ${process.env.GOOGLE_CLIENT_ID}\n`);

console.log('   Client Secret:');
console.log(`   ${process.env.GOOGLE_CLIENT_SECRET}\n`);

console.log('3. Google Cloud Console Configuration:');
console.log('   - Go to: https://console.cloud.google.com/apis/credentials');
console.log('   - Select your OAuth 2.0 Client');
console.log('   - Add this to Authorized redirect URIs:');
console.log(`   ${supabaseUrl}/auth/v1/callback\n`);

console.log('4. Additional Settings:');
console.log('   - In Supabase Dashboard, go to Authentication > Settings');
console.log('   - Under "Auth Providers", ensure:');
console.log('     - Allow new users to sign up: ✓ Enabled');
console.log('     - Require email confirmation: ✗ Disabled (for easier testing)');
console.log('   - Under "JWT Settings":');
console.log('     - JWT expiry: 3600 (1 hour)');
console.log('     - Auto-refresh session: ✓ Enabled\n');

console.log('5. Test Authentication:');
console.log('   After configuration, test with:');
console.log('   npm run test:auth\n');

// Create a test script
const testScript = `
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('${supabaseUrl}', '${process.env.SUPABASE_ANON_KEY}');

async function testAuth() {
  console.log('Testing Anonymous Sign-In...');
  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
  console.log('Anonymous:', anonError ? 'Failed - ' + anonError.message : 'Success');
  
  if (anonData?.user) {
    await supabase.auth.signOut();
  }
  
  console.log('\\nGoogle OAuth must be tested through the UI');
  console.log('Use: await supabase.auth.signInWithOAuth({ provider: "google" })');
}

testAuth();
`;

import * as fs from 'fs';
import * as path from 'path';

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'test-auth.ts'),
  testScript
);

console.log('Test script created at: scripts/test-auth.ts');