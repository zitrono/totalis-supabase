import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config()

async function applyRLSPolicies() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  console.log('Connecting to Supabase:', supabaseUrl)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the SQL migration file
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250527000001_fix_user_images_policies.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying RLS policies for user-images bucket...')
  
  try {
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    // Try to execute via Supabase Management API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql_query: sql })
    })

    if (!response.ok) {
      console.log('Direct SQL execution not available. Checking current policies...')
      
      // Check if policies already exist by testing upload
      const testFileName = `test-policy-check-${Date.now()}.txt`
      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(testFileName, new Blob(['test']), {
          contentType: 'text/plain'
        })
      
      if (!uploadError) {
        console.log('✅ Policies appear to be working! Test upload succeeded.')
        
        // Clean up test file
        await supabase.storage
          .from('user-images')
          .remove([testFileName])
      } else {
        console.log('❌ Policies not yet applied. Upload test failed:', uploadError.message)
        console.log('\nTo apply the policies manually:')
        console.log('1. Go to your Supabase Dashboard')
        console.log('2. Navigate to SQL Editor')
        console.log('3. Run the following SQL:')
        console.log('\n--- START SQL ---')
        console.log(sql)
        console.log('--- END SQL ---')
      }
    } else {
      console.log('✅ RLS policies applied successfully!')
    }
  } catch (error) {
    console.error('Error:', error)
    console.log('\nPlease apply the policies manually via Supabase Dashboard.')
  }
}

applyRLSPolicies().catch(console.error)