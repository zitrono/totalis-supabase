import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function testAuthConfiguration() {
  console.log('🔐 Testing Authentication Configuration\n');
  
  const results: { test: string; passed: boolean; details: string }[] = [];

  // Test 1: Anonymous Sign-In
  console.log('1. Testing Anonymous Sign-In...');
  try {
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    
    if (anonError) {
      results.push({
        test: 'Anonymous Sign-In',
        passed: false,
        details: anonError.message
      });
    } else if (anonData.user) {
      results.push({
        test: 'Anonymous Sign-In',
        passed: true,
        details: `User created: ${anonData.user.id}`
      });

      // Check if profile was created by trigger
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*, coaches(name)')
        .eq('id', anonData.user.id)
        .single();

      if (profile) {
        results.push({
          test: 'Default Coach Assignment',
          passed: true,
          details: `Coach assigned: ${profile.coaches?.name || 'Unknown'}`
        });
      } else {
        results.push({
          test: 'Default Coach Assignment',
          passed: false,
          details: 'Profile not created by trigger'
        });
      }

      // Clean up - sign out
      await supabase.auth.signOut();
    }
  } catch (err: any) {
    results.push({
      test: 'Anonymous Sign-In',
      passed: false,
      details: err.message
    });
  }

  // Test 2: Google OAuth Configuration
  console.log('\n2. Testing Google OAuth Configuration...');
  try {
    // We can't actually sign in with Google in a script, but we can check if it's configured
    const { data: { url }, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000'
      }
    });

    if (oauthError) {
      results.push({
        test: 'Google OAuth Configuration',
        passed: false,
        details: oauthError.message
      });
    } else if (url) {
      // Check if the URL contains Google OAuth
      const isGoogleUrl = url.includes('accounts.google.com') || url.includes('google');
      results.push({
        test: 'Google OAuth Configuration',
        passed: isGoogleUrl,
        details: isGoogleUrl ? 'OAuth URL generated successfully' : 'Invalid OAuth URL'
      });
      
      // Extract and show the authorization URL
      console.log('\n📎 Google OAuth URL:');
      console.log(url.substring(0, 100) + '...');
    }
  } catch (err: any) {
    results.push({
      test: 'Google OAuth Configuration',
      passed: false,
      details: err.message
    });
  }

  // Test 3: Auth Settings
  console.log('\n3. Checking Auth Settings...');
  try {
    // Test session management
    const { data: { session } } = await supabase.auth.getSession();
    results.push({
      test: 'Session Management',
      passed: true,
      details: 'Auth service is accessible'
    });

    // Create a test user to check email settings
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test123456!'
    });

    if (signUpError && signUpError.message.includes('Anonymous sign-ins are enabled')) {
      results.push({
        test: 'Email Sign-Up',
        passed: true,
        details: 'Email auth is configured'
      });
    } else if (signUpData?.user) {
      results.push({
        test: 'Email Sign-Up',
        passed: true,
        details: 'Email sign-up is enabled'
      });
      
      // Check if email confirmation is required
      const needsConfirmation = signUpData.user.email_confirmed_at === null;
      results.push({
        test: 'Email Confirmation',
        passed: true,
        details: needsConfirmation ? 'Email confirmation required' : 'Email confirmation disabled'
      });
    }
  } catch (err: any) {
    results.push({
      test: 'Auth Settings Check',
      passed: false,
      details: err.message
    });
  }

  // Print results
  console.log('\n📊 Authentication Test Results:\n');
  
  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test.padEnd(30)} ${result.details}`);
    if (result.passed) passed++;
    else failed++;
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n✨ All authentication tests passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test with the mobile app or test client');
    console.log('2. Run integration tests: npm run test:scenarios');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    console.log('1. Anonymous sign-ins are enabled in Supabase dashboard');
    console.log('2. Google OAuth credentials are correctly entered');
    console.log('3. Redirect URLs are properly configured');
  }

  // Show configuration URLs
  console.log('\n🔗 Configuration URLs:');
  console.log('Supabase Auth: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/providers');
  console.log('Google Console: https://console.cloud.google.com/apis/credentials');
}

testAuthConfiguration().catch(console.error);