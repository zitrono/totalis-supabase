import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Try with both anon key and service key
const supabaseAnon = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const supabaseService = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function debugAnonymousAuth() {
  console.log('🔍 Debugging Anonymous Authentication\n');

  // Test 1: Try with anon key
  console.log('1. Testing with anon key...');
  try {
    const { data, error } = await supabaseAnon.auth.signInAnonymously();
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Code: ${error.code}`);
      
      if (error.message.includes('not enabled')) {
        console.log('\n⚠️  Anonymous sign-ins are not enabled!');
        console.log('\nTo enable:');
        console.log('1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/auth/providers');
        console.log('2. Find the "Email" provider section');
        console.log('3. Toggle ON "Enable Email Signup"');
        console.log('4. Toggle ON "Allow anonymous sign-ins"');
      }
    } else if (data.user) {
      console.log(`✅ Success! User created: ${data.user.id}`);
      
      // Clean up
      await supabaseAnon.auth.signOut();
    }
  } catch (err: any) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }

  // Test 2: Check auth configuration
  console.log('\n2. Checking auth configuration...');
  try {
    // Check if we can create a regular user
    const testEmail = `anon-test-${Date.now()}@example.com`;
    const { data, error } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: 'test123456!'
    });

    if (!error) {
      console.log('✅ Email sign-up is enabled');
      if (data.user) {
        console.log(`   Confirmation required: ${data.user.email_confirmed_at === null}`);
      }
    } else {
      console.log(`❌ Email sign-up error: ${error.message}`);
    }
  } catch (err: any) {
    console.log(`❌ Configuration check failed: ${err.message}`);
  }

  // Test 3: Check with service role
  console.log('\n3. Testing admin user creation...');
  try {
    const { data, error } = await supabaseService.auth.admin.createUser({
      email: `admin-test-${Date.now()}@example.com`,
      password: 'test123456!',
      email_confirm: true
    });

    if (!error && data.user) {
      console.log('✅ Admin can create users');
      
      // Check if trigger worked
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { data: profile } = await supabaseService
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profile) {
        console.log('✅ User profile trigger is working');
      } else {
        console.log('❌ User profile trigger did not fire');
      }
      
      // Clean up
      await supabaseService.auth.admin.deleteUser(data.user.id);
    } else {
      console.log(`❌ Admin user creation failed: ${error?.message}`);
    }
  } catch (err: any) {
    console.log(`❌ Admin test failed: ${err.message}`);
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Ensure anonymous sign-ins are enabled in the dashboard');
  console.log('2. Check that the Email provider itself is enabled');
  console.log('3. Verify no additional auth restrictions are in place');
}

debugAnonymousAuth().catch(console.error);