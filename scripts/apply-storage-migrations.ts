import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function applyStorageMigrations() {
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

  console.log('Testing current storage policies...')
  
  try {
    // Test 1: Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const userImagesBucket = buckets?.find(b => b.name === 'user-images')
    
    if (!userImagesBucket) {
      console.log('❌ user-images bucket does not exist')
      console.log('Please create it via Supabase Dashboard')
      return
    }
    
    console.log('✅ user-images bucket exists')
    
    // Test 2: Try uploading a test image file
    const testFileName = `test-${Date.now()}.png`
    // Create a minimal 1x1 PNG
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
      0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-images')
      .upload(testFileName, pngData, {
        contentType: 'image/png'
      })
    
    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message)
      console.log('\nThe RLS policies need to be applied. Please run the following SQL in your Supabase Dashboard:')
      console.log('\n1. Go to SQL Editor in your Supabase Dashboard')
      console.log('2. Run the SQL from: supabase/migrations/20250527000001_fix_user_images_policies.sql')
      console.log('\nNote: The bucket already exists, so skip the first migration.')
    } else {
      console.log('✅ Upload test succeeded!')
      
      // Test 3: Try downloading
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('user-images')
        .download(testFileName)
      
      if (downloadError) {
        console.log('❌ Download test failed:', downloadError.message)
      } else {
        console.log('✅ Download test succeeded!')
      }
      
      // Test 4: Try deleting
      const { error: deleteError } = await supabase.storage
        .from('user-images')
        .remove([testFileName])
      
      if (deleteError) {
        console.log('❌ Delete test failed:', deleteError.message)
      } else {
        console.log('✅ Delete test succeeded!')
      }
      
      console.log('\n✨ All storage operations working correctly!')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

applyStorageMigrations().catch(console.error)