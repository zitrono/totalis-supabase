import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

interface TestUser {
  email: string
  password: string
  metadata?: Record<string, any>
}

const TEST_USERS: TestUser[] = [
  { email: 'test1@totalis.app', password: 'Test123!@#' },
  { email: 'test2@totalis.app', password: 'Test123!@#' },
  { email: 'test3@totalis.app', password: 'Test123!@#' }
]

export async function setupTestUsers(): Promise<void> {
  const config = getTestConfig()
  
  console.log('🧪 Checking test users...')
  
  // Create service client
  const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Test users should be created via seed.sql
  // This function just verifies they exist
  let allUsersExist = true
  
  for (const testUser of TEST_USERS) {
    try {
      // Try to sign in to check if user exists
      const { data, error } = await serviceClient.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      })
      
      if (error) {
        console.log(`❌ Test user ${testUser.email} not found: ${error.message}`)
        allUsersExist = false
      } else {
        console.log(`✅ Test user ${testUser.email} exists`)
        // Sign out to clean up session
        await serviceClient.auth.signOut()
      }
    } catch (error) {
      console.error(`Error checking ${testUser.email}:`, error)
      allUsersExist = false
    }
  }
  
  if (!allUsersExist) {
    console.log(`
⚠️  Some test users are missing. Attempting to create them...
    `)
    
    // Try to create test users using the RPC function
    try {
      const { data, error } = await serviceClient.rpc('create_test_users_rpc')
      
      if (error) {
        console.error('Failed to create test users via RPC:', error)
        console.log(`
⚠️  Could not create test users. In preview branches, this is expected.
Tests will be skipped or may fail.
        `)
      } else if (data?.success) {
        console.log('✅ Test users created successfully via RPC')
        
        // Verify they were created
        for (const testUser of TEST_USERS) {
          const { error: signInError } = await serviceClient.auth.signInWithPassword({
            email: testUser.email,
            password: testUser.password
          })
          
          if (!signInError) {
            console.log(`✅ Verified test user ${testUser.email} can sign in`)
            await serviceClient.auth.signOut()
          }
        }
      } else {
        console.log('❌ RPC returned:', data)
      }
    } catch (rpcError) {
      console.error('RPC call failed:', rpcError)
    }
  } else {
    console.log('✨ All test users verified')
  }
}

// Export test user credentials for use in tests
export const TEST_USER_CREDENTIALS = TEST_USERS.map(u => ({
  email: u.email,
  password: u.password
}))