import { config } from '../config';
import * as dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

console.log('🔍 Testing Google OAuth Configuration...\n');

// Check if credentials are loaded
console.log('1️⃣ Google OAuth Credentials:');
console.log(`   Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Loaded' : '❌ Missing'}`);

if (process.env.GOOGLE_CLIENT_ID) {
  console.log(`   Client ID Preview: ${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
}

// Check Supabase URL for callback
console.log('\n2️⃣ OAuth Callback URL:');
const supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl) {
  const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
  console.log(`   Expected callback: ${callbackUrl}`);
  console.log('   ⚠️  Make sure this URL is added to Google OAuth redirect URIs');
}

// Check OpenAI credentials
console.log('\n3️⃣ OpenAI API Key:');
console.log(`   API Key: ${process.env.OPENAI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
if (process.env.OPENAI_API_KEY) {
  console.log(`   Key Preview: ${process.env.OPENAI_API_KEY.substring(0, 15)}...`);
}

// Summary
console.log('\n📊 Summary:');
const hasGoogleCreds = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

console.log(`   Google OAuth: ${hasGoogleCreds ? '✅ Ready' : '❌ Not configured'}`);
console.log(`   OpenAI: ${hasOpenAI ? '✅ Ready' : '❌ Not configured'}`);
console.log(`   Supabase: ${hasSupabase ? '✅ Ready' : '❌ Not configured'}`);

if (hasGoogleCreds && hasOpenAI && hasSupabase) {
  console.log('\n✨ All credentials are configured and ready to use!');
} else {
  console.log('\n⚠️  Some credentials are missing. Check your .env file.');
}