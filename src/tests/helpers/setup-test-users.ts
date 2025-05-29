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
  
  console.log('🧪 Setting up test environment...')
  
  // Create service client
  const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // For preview branches, we can't create users in auth.users
  // Instead, we'll ensure test profiles exist that can be linked when users sign in
  if (config.isPreview) {
    console.log('📝 Running in preview mode - setting up test profiles')
    
    // Call the setup_test_users function we created in the migration
    const { data, error } = await serviceClient.rpc('setup_test_users')
    
    if (error) {
      console.error('Failed to setup test users:', error)
      throw error
    }
    
    console.log('✅ Test profiles created:', data)
    return
  }
  
  // For production testing, we can create actual auth users
  console.log('🔐 Running in production mode - creating auth users')
  
  // Get default coach ID from seed data
  const { data: coaches } = await serviceClient
    .from('coaches')
    .select('id')
    .eq('name', 'Daniel')
    .limit(1)
  
  const defaultCoachId = coaches?.[0]?.id
  
  if (!defaultCoachId) {
    throw new Error('Default coach not found - ensure seed data is applied')
  }
  
  // In production, we can create test users via auth.admin API
  for (const testUser of TEST_USERS) {
    try {
      // Check if user already exists
      const { data: existingAuth } = await serviceClient.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      })
      
      if (existingAuth?.user) {
        console.log(`✅ Test user ${testUser.email} already exists`)
        continue
      }
      
      // Create new user via signup (works in production)
      const { data: newAuth, error: signUpError } = await serviceClient.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          data: testUser.metadata
        }
      })
      
      if (signUpError && !signUpError.message?.includes('already registered')) {
        throw signUpError
      }
      
      console.log(`✅ Created test user: ${testUser.email}`)
    } catch (error) {
      console.error(`⚠️  Issue with test user ${testUser.email}:`, error)
      // Continue with other users
    }
  }
  
  console.log('✨ Test user setup complete')
}

// Export test user credentials for use in tests
export const TEST_USER_CREDENTIALS = TEST_USERS.map(u => ({
  email: u.email,
  password: u.password
}))