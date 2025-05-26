#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

async function testCleanupFunction() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  console.log('Testing cleanup_test_data function variations...\n')

  // Test 1: With named parameters
  try {
    const { data, error } = await supabase.rpc('cleanup_test_data', {
      p_test_run_id: 'test',
      p_dry_run: true
    })
    
    if (!error) {
      console.log('✅ Function works with p_test_run_id, p_dry_run')
      console.log('Response:', data)
    } else {
      console.log('❌ Named params failed:', error.message)
    }
  } catch (err) {
    console.log('❌ Named params error:', err.message)
  }

  // Test 2: With different parameter order
  try {
    const { data, error } = await supabase.rpc('cleanup_test_data', {
      p_dry_run: true,
      p_test_run_id: 'test'
    })
    
    if (!error) {
      console.log('✅ Function works with p_dry_run, p_test_run_id')
      console.log('Response:', data)
    } else {
      console.log('❌ Reversed params failed:', error.message)
    }
  } catch (err) {
    console.log('❌ Reversed params error:', err.message)
  }

  // Test 3: With all parameters
  try {
    const { data, error } = await supabase.rpc('cleanup_test_data', {
      p_test_run_id: 'test',
      p_older_than: '24 hours',
      p_dry_run: true
    })
    
    if (!error) {
      console.log('✅ Function works with all three parameters')
      console.log('Response:', data)
    } else {
      console.log('❌ All params failed:', error.message)
    }
  } catch (err) {
    console.log('❌ All params error:', err.message)
  }

  // Test 4: Check what the actual function signature is
  console.log('\nChecking function details in database...')
  
  const { data: functions, error: funcError } = await supabase
    .rpc('get_function_info', { function_name: 'cleanup_test_data' })
    .catch(() => ({ data: null, error: null }))
  
  if (!funcError && functions) {
    console.log('Function info:', functions)
  } else {
    // Try a different approach
    console.log('Could not get function info directly')
  }
}

testCleanupFunction().catch(console.error)