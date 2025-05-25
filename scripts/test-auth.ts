
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://qdqbrqnqttyjegiupvri.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcWJycW5xdHR5amVnaXVwdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTg4NjIsImV4cCI6MjA2MzY5NDg2Mn0.PDEqa_SrLYHKFnfL3eTpvZRbxE4cIpbqgSMj-WE90hk');

async function testAuth() {
  console.log('Testing Anonymous Sign-In...');
  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
  console.log('Anonymous:', anonError ? 'Failed - ' + anonError.message : 'Success');
  
  if (anonData?.user) {
    await supabase.auth.signOut();
  }
  
  console.log('\nGoogle OAuth must be tested through the UI');
  console.log('Use: await supabase.auth.signInWithOAuth({ provider: "google" })');
}

testAuth();
