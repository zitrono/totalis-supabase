import { createClient } from '@supabase/supabase-js';

// Test script to verify Sentry error logging is working

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSentryIntegration() {
  console.log('Testing Sentry integration...\n');

  // Test 1: Authentication error
  console.log('1. Testing authentication error...');
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/chat-ai-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Missing Authorization header to trigger error
      },
      body: JSON.stringify({
        message: 'Test message'
      })
    });
    
    const result = await response.json();
    console.log('Auth error response:', result);
  } catch (error) {
    console.error('Auth test error:', error);
  }

  // Test 2: Invalid request data
  console.log('\n2. Testing invalid request data...');
  const { data: { user } } = await supabase.auth.signInAnonymously();
  
  if (user) {
    const { data: session } = await supabase.auth.getSession();
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/checkin-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          // Missing required checkInId
          answer: 'Test answer'
        })
      });
      
      const result = await response.json();
      console.log('Invalid data response:', result);
    } catch (error) {
      console.error('Invalid data test error:', error);
    }
  }

  // Test 3: Check error logs in database
  console.log('\n3. Checking error logs in database...');
  const { data: errorLogs, error: logsError } = await supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logsError) {
    console.error('Failed to fetch error logs:', logsError);
  } else {
    console.log(`Found ${errorLogs?.length || 0} error logs in database:`);
    errorLogs?.forEach((log, index) => {
      console.log(`\nError ${index + 1}:`);
      console.log(`  Function: ${log.function_name}`);
      console.log(`  Message: ${log.error_message}`);
      console.log(`  Time: ${log.created_at}`);
    });
  }

  console.log('\n✅ Sentry integration test complete!');
  console.log('Check your Sentry dashboard for these errors.');
}

// Run the test
testSentryIntegration().catch(console.error);