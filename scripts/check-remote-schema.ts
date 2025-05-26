#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkRemoteSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  console.log('🔍 Checking remote database schema...\n')

  // Check for tables
  try {
    // Try a different approach - query information_schema
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .limit(0)

    if (!error) {
      console.log('✅ coaches table exists')
    } else {
      console.log('❌ coaches table missing:', error.message)
    }

    // Check profiles
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0)

    if (!profilesError) {
      console.log('✅ profiles table exists')
    } else {
      console.log('❌ profiles table missing:', profilesError.message)
      
      // Check old name
      const { error: oldError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(0)
      
      if (!oldError) {
        console.log('⚠️  user_profiles table exists (old name)')
      }
    }

    // Check for test data functions
    let funcError
    try {
      await supabase.rpc('cleanup_test_data', {
        p_dry_run: true,
        p_test_run_id: 'dummy'
      })
      funcError = null
    } catch (err) {
      funcError = err
    }

    if (!funcError) {
      console.log('✅ cleanup_test_data function exists')
    } else {
      console.log('❌ cleanup_test_data function missing')
    }

    // Check for test_data_summary view
    const { error: viewError } = await supabase
      .from('test_data_summary')
      .select('*')
      .limit(0)

    if (!viewError) {
      console.log('✅ test_data_summary view exists')
    } else {
      console.log('❌ test_data_summary view missing')
    }

    // Check categories with metadata
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, metadata')
      .limit(1)

    if (!catError && categories) {
      console.log(`✅ categories table exists with ${categories.length} records`)
      if (categories[0] && 'metadata' in categories[0]) {
        console.log('✅ categories table has metadata column')
      } else {
        console.log('❌ categories table missing metadata column')
      }
    } else {
      console.log('❌ categories table issue:', catError?.message)
    }
  } catch (err) {
    console.error('Error checking schema:', err)
  }

  // Check edge functions
  console.log('\n🌐 Checking edge functions...')
  
  const functionsToCheck = [
    'langflow-webhook',
    'recommendations',
    'checkin-start',
    'checkin-process',
    'analytics-summary'
  ]

  for (const func of functionsToCheck) {
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${func}`, {
        method: 'OPTIONS'
      })
      
      if (response.ok) {
        console.log(`✅ ${func} function deployed`)
      } else {
        console.log(`❌ ${func} function not found (${response.status})`)
      }
    } catch (err) {
      console.log(`❌ ${func} function error:`, err.message)
    }
  }

  console.log('\n📝 Summary:')
  console.log('- If tables exist but lack metadata columns, we need to add them')
  console.log('- If functions are missing, deploy with: npm run functions:deploy')
  console.log('- If nothing exists, we need to apply full migrations')
}

checkRemoteSchema().catch(console.error)