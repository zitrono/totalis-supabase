#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://qdqbrqnqttyjegiupvri.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcWJycW5xdHR5amVnaXVwdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTg4NjIsImV4cCI6MjA2MzY5NDg2Mn0.PDEqa_SrLYHKFnfL3eTpvZRbxE4cIpbqgSMj-WE90hk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDeployment() {
  console.log('🧪 Testing Totalis Deployment\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Database connectivity
  console.log('1. Testing database connectivity...');
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ Database connection successful');
    passed++;
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    failed++;
  }
  
  // Test 2: Auth service
  console.log('\n2. Testing anonymous authentication...');
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    console.log('   ✅ Anonymous auth successful');
    console.log(`   User ID: ${data.user.id}`);
    passed++;
  } catch (error) {
    console.log('   ❌ Anonymous auth failed:', error.message);
    failed++;
  }
  
  // Test 3: Edge function
  console.log('\n3. Testing edge function (checkin-start)...');
  try {
    const { data, error } = await supabase.functions.invoke('checkin-start', {
      body: { categoryId: 'test' }
    });
    
    if (error) throw error;
    console.log('   ✅ Edge function accessible');
    passed++;
  } catch (error) {
    console.log('   ❌ Edge function failed:', error.message);
    failed++;
  }
  
  // Test 4: Storage bucket
  console.log('\n4. Testing storage buckets...');
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    console.log('   ✅ Storage buckets accessible');
    console.log(`   Found ${data.length} buckets:`, data.map(b => b.name).join(', '));
    passed++;
  } catch (error) {
    console.log('   ❌ Storage access failed:', error.message);
    failed++;
  }
  
  // Test 5: Analytics RPC
  console.log('\n5. Testing analytics function...');
  try {
    const { data, error } = await supabase.rpc('log_event', {
      event_name: 'deployment_test',
      properties: { timestamp: new Date().toISOString() }
    });
    
    if (error) throw error;
    console.log('   ✅ Analytics function working');
    passed++;
  } catch (error) {
    console.log('   ❌ Analytics function failed:', error.message);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(40));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(40));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Deployment is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  // Cleanup
  if (supabase.auth.currentUser) {
    await supabase.auth.signOut();
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

testDeployment().catch(console.error);