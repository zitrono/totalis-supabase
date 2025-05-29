import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

interface TestUser {
  email: string
  password: string
  metadata?: Record<string, any>
}

const TEST_USERS: TestUser[] = [
  { email: 'test1@totalis.app', password: 'Test123!@#', metadata: { test_account: true } },
  { email: 'test2@totalis.app', password: 'Test123!@#', metadata: { test_account: true } },
  { email: 'test3@totalis.app', password: 'Test123!@#', metadata: { test_account: true } }
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
⚠️  Some test users are missing. Please ensure:
1. You've run the latest migrations
2. seed.sql has been applied
3. You're running against the correct environment

In preview branches, test users may not be available due to auth.users restrictions.
Tests will skip authentication steps in this case.
    `)
  } else {
    console.log('✨ All test users verified')
  }
}

// Export test user credentials for use in tests
export const TEST_USER_CREDENTIALS = TEST_USERS.map(u => ({
  email: u.email,
  password: u.password
}))