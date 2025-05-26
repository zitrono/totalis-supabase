#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

async function applyTestTracking() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  console.log('📝 Applying test tracking features...\n')

  // Step 1: Add metadata columns
  console.log('1️⃣ Adding metadata columns...')
  const tables = [
    'categories', 'coaches', 'profiles', 'messages', 'checkins',
    'recommendations', 'profile_categories', 'analytics_events',
    'user_feedback', 'audio_usage_logs'
  ]

  for (const table of tables) {
    try {
      // Check if table exists and has metadata column
      const { data, error } = await supabase
        .from(table)
        .select('metadata')
        .limit(0)
      
      if (error && error.message.includes('column') && error.message.includes('metadata')) {
        console.log(`   Adding metadata to ${table}...`)
        // Column doesn't exist, we need to add it
        // Note: Supabase doesn't support DDL through the client, so we'll note this
        console.log(`   ⚠️  Need to add metadata column to ${table}`)
      } else if (!error) {
        console.log(`   ✅ ${table} already has metadata column`)
      } else {
        console.log(`   ❓ ${table}: ${error.message}`)
      }
    } catch (err) {
      console.log(`   ❌ Error checking ${table}:`, err.message)
    }
  }

  console.log('\n❗ Manual step required:')
  console.log('   Please run the following SQL in the Supabase SQL Editor:')
  console.log('   https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor\n')
  console.log('   Copy and paste the contents of: scripts/apply-test-tracking.sql')
  console.log('\n   Or run each ALTER TABLE command individually:')
  
  tables.forEach(table => {
    console.log(`   ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`)
  })
  
  console.log('\n   Then create the cleanup function and view as shown in the SQL file.')
  console.log('\n2️⃣ After running the SQL, re-run the tests with:')
  console.log('   npm run test:remote')
}

applyTestTracking().catch(console.error)