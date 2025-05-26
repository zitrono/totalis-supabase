import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function setupStorageBucket() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    console.error('Please ensure .env file exists with these variables')
    process.exit(1)
  }

  console.log('Connecting to Supabase:', supabaseUrl)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('Checking storage buckets...')
  
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      process.exit(1)
    }
    
    console.log('Existing buckets:', buckets?.map(b => b.name).join(', '))
    
    const bucketExists = buckets?.some(b => b.name === 'user-images')
    
    if (bucketExists) {
      console.log('Bucket "user-images" already exists')
      
      // Update bucket settings to ensure it's public
      const { data: updateData, error: updateError } = await supabase.storage.updateBucket('user-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })
      
      if (updateError) {
        console.error('Error updating bucket:', updateError)
      } else {
        console.log('Bucket settings updated')
      }
    } else {
      console.log('Creating bucket: user-images')
      
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('user-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })
      
      if (error) {
        console.error('Error creating bucket:', error)
        process.exit(1)
      }
      
      console.log('Bucket created successfully:', data)
    }
    
    console.log('Storage bucket setup complete!')
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

setupStorageBucket().catch(console.error)