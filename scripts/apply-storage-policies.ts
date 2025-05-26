import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config()

async function applyStoragePolicies() {
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

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'fix-storage-policies.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying storage policies...')
  
  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    })
    
    if (error) {
      // If the RPC doesn't exist, we'll need to apply policies differently
      console.log('Note: exec_sql RPC not available. Policies need to be applied via Supabase Dashboard or CLI.')
      console.log('\nSQL to execute:')
      console.log(sql)
      
      // For now, let's just update the bucket to ensure it's public
      const { data: bucketData, error: bucketError } = await supabase.storage.updateBucket('user-images', {
        public: true
      })
      
      if (bucketError) {
        console.error('Error updating bucket:', bucketError)
      } else {
        console.log('Bucket updated to be public')
      }
    } else {
      console.log('Storage policies applied successfully!')
    }
  } catch (error) {
    console.error('Error applying policies:', error)
  }
}

applyStoragePolicies().catch(console.error)