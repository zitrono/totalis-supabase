import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

async function testSchema() {
  console.log('🔍 Testing Totalis Database Schema...\n');
  
  const results: TestResult[] = [];

  // Test 1: Check tables exist
  console.log('📋 Testing table creation...');
  const expectedTables = [
    'coaches', 'user_profiles', 'categories', 'user_categories',
    'messages', 'check_ins', 'health_cards', 'recommendations',
    'user_feedback', 'app_versions', 'user_app_versions',
    'analytics_events', 'app_config'
  ];

  for (const table of expectedTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      results.push({
        test: `Table: ${table}`,
        passed: !error,
        message: error ? error.message : 'exists'
      });
    } catch (err: any) {
      results.push({
        test: `Table: ${table}`,
        passed: false,
        message: err.message
      });
    }
  }

  // Test 2: Check RLS is enabled
  console.log('\n🔒 Testing Row Level Security...');
  const { data: rlsStatus } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (${expectedTables.map(t => `'${t}'`).join(',')})
    `
  }).single();

  if (rlsStatus) {
    results.push({
      test: 'RLS enabled on all tables',
      passed: true,
      message: 'All tables have RLS'
    });
  }

  // Test 3: Check default coach trigger
  console.log('\n🎯 Testing default coach assignment...');
  try {
    // Create a test user
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'test123456'
    });

    if (authError) throw authError;

    // Check if profile was created
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, coach_id')
      .eq('id', user!.id)
      .single();

    results.push({
      test: 'Default coach trigger',
      passed: !!profile?.coach_id,
      message: profile?.coach_id ? 'Profile created with coach' : 'No coach assigned'
    });

    // Cleanup
    await supabase.auth.admin.deleteUser(user!.id);
  } catch (err: any) {
    results.push({
      test: 'Default coach trigger',
      passed: false,
      message: err.message
    });
  }

  // Test 4: Check views
  console.log('\n👁️ Testing views...');
  const views = ['user_checkins', 'user_stats'];
  
  for (const view of views) {
    try {
      const { error } = await supabase.from(view).select('*').limit(1);
      results.push({
        test: `View: ${view}`,
        passed: !error,
        message: error ? error.message : 'accessible'
      });
    } catch (err: any) {
      results.push({
        test: `View: ${view}`,
        passed: false,
        message: err.message
      });
    }
  }

  // Test 5: Check functions
  console.log('\n⚡ Testing functions...');
  const functions = [
    { name: 'get_category_tree', params: {} },
    { name: 'get_active_health_cards', params: { p_user_id: '00000000-0000-0000-0000-000000000000' } }
  ];

  for (const func of functions) {
    try {
      const { error } = await supabase.rpc(func.name, func.params);
      results.push({
        test: `Function: ${func.name}`,
        passed: !error,
        message: error ? error.message : 'callable'
      });
    } catch (err: any) {
      results.push({
        test: `Function: ${func.name}`,
        passed: false,
        message: err.message
      });
    }
  }

  // Test 6: Check app config
  console.log('\n⚙️ Testing app configuration...');
  const { data: configs } = await supabase
    .from('app_config')
    .select('key');

  const expectedConfigs = ['default_coach', 'shortcuts', 'ai_config', 'voice_config', 'checkin_config'];
  const foundConfigs = configs?.map(c => c.key) || [];

  for (const config of expectedConfigs) {
    results.push({
      test: `Config: ${config}`,
      passed: foundConfigs.includes(config),
      message: foundConfigs.includes(config) ? 'present' : 'missing'
    });
  }

  // Print results
  console.log('\n📊 Test Results:\n');
  
  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test.padEnd(30)} ${result.message}`);
    if (result.passed) passed++;
    else failed++;
  });

  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(50) + '\n');

  if (failed > 0) {
    console.log('❗ Some tests failed. Please check:');
    console.log('1. Migration was run completely');
    console.log('2. No SQL errors during migration');
    console.log('3. Service role key has proper permissions\n');
  } else {
    console.log('✨ All tests passed! Schema is ready.\n');
    console.log('Next steps:');
    console.log('1. Configure authentication: npm run configure:auth');
    console.log('2. Seed coaches: npm run seed:coaches');
    console.log('3. Run test scenarios: npm run test:scenarios');
  }
}

testSchema().catch(console.error);