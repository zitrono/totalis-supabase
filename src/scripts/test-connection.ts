#!/usr/bin/env node
import { supabase, supabaseAdmin } from '../utils/supabase';
import { config } from '../config';

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Test 1: Configuration
  console.log('1️⃣ Configuration Check:');
  console.log(`   URL: ${config.supabase.url}`);
  console.log(`   Default Coach: ${config.business.defaultCoach}`);
  console.log(`   Voice Limit: ${config.business.voiceRecordingMaxSeconds}s`);
  console.log('   ✅ Configuration loaded successfully\n');

  // Test 2: Anonymous Connection
  console.log('2️⃣ Testing Anonymous Client:');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    console.log('   ✅ Anonymous client connected successfully');
    console.log(`   Session: ${data.session ? 'Active' : 'None (as expected)'}\n`);
  } catch (error) {
    console.error('   ❌ Anonymous client error:', error);
  }

  // Test 3: Service Role Connection
  console.log('3️⃣ Testing Service Role Client:');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (error) throw error;
    console.log('   ✅ Service role client connected successfully');
    console.log(`   Total users in database: ${data.users.length}\n`);
  } catch (error) {
    console.error('   ❌ Service role client error:', error);
  }

  // Test 4: Storage Buckets
  console.log('4️⃣ Checking Storage Buckets:');
  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;
    console.log('   ✅ Storage access successful');
    console.log(`   Existing buckets: ${data?.map(b => b.name).join(', ') || 'none'}`);
    
    const requiredBuckets = Object.values(config.storage.buckets);
    const existingBucketNames = data?.map(b => b.name) || [];
    const missingBuckets = requiredBuckets.filter(b => !existingBucketNames.includes(b));
    
    if (missingBuckets.length > 0) {
      console.log(`   ⚠️  Missing buckets: ${missingBuckets.join(', ')}`);
      console.log('   Run the storage setup test to create them');
    } else {
      console.log('   ✅ All required buckets exist');
    }
  } catch (error) {
    console.error('   ❌ Storage error:', error);
  }

  console.log('\n✨ Connection test complete!');
}

// Run the test
testConnection().catch(console.error);