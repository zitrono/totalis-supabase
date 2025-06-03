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
⚠️  Some test users are missing in auth.users.
    `)
    
    // Check if we have mock profiles for testing
    const { data: mockProfiles } = await serviceClient
      .from('profiles')
      .select('email')
      .in('email', TEST_USERS.map(u => u.email))
    
    if (mockProfiles && mockProfiles.length > 0) {
      console.log(`
✅ Found ${mockProfiles.length} mock profiles for testing.
📝 Tests will use mock data instead of real authentication.
      `)
      mockProfiles.forEach(p => {
        console.log(`   - ${p.email}`)
      })
    } else {
      console.log(`
❌ No test users or mock profiles found.
⚠️  In preview branches, this is expected due to auth schema restrictions.
📝 Tests requiring user data will fail or be skipped.
      `)
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