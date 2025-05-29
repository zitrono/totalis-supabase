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
  
  // Only run in preview mode
  if (!config.isPreview) {
    console.log('⏭️  Skipping test user setup (not in preview mode)')
    return
  }
  
  console.log('🧪 Setting up test users for preview environment...')
  
  // Create admin client with service role key
  const adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Get default coach ID
  const { data: coaches, error: coachError } = await adminClient
    .from('coaches')
    .select('id')
    .eq('name', 'Daniel')
    .single()
  
  if (coachError || !coaches) {
    throw new Error(`Failed to get default coach: ${coachError?.message || 'Coach not found'}`)
  }
  
  const defaultCoachId = coaches.id
  
  // Create test users
  for (const testUser of TEST_USERS) {
    try {
      // Check if user already exists
      const { data: existingUser } = await adminClient.auth.admin.listUsers()
      const userExists = existingUser?.users?.some(u => u.email === testUser.email)
      
      if (userExists) {
        console.log(`✅ Test user ${testUser.email} already exists`)
        continue
      }
      
      // Create user using admin API to bypass email verification
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true, // Bypass email verification
        user_metadata: testUser.metadata || {}
      })
      
      if (createError) {
        // If user already exists error, continue
        if (createError.message?.includes('already exists')) {
          console.log(`✅ Test user ${testUser.email} already exists`)
          continue
        }
        throw createError
      }
      
      if (!newUser?.user) {
        throw new Error('User creation returned no user data')
      }
      
      // Create profile for the user
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: newUser.user.id,
          coach_id: defaultCoachId,
          metadata: {
            test_account: true,
            permanent: true,
            created_at: new Date().toISOString()
          }
        })
      
      if (profileError) {
        // If profile already exists, that's fine
        if (!profileError.message?.includes('duplicate key')) {
          console.warn(`⚠️  Failed to create profile for ${testUser.email}: ${profileError.message}`)
        }
      }
      
      console.log(`✅ Created test user: ${testUser.email}`)
    } catch (error) {
      console.error(`❌ Failed to create test user ${testUser.email}:`, error)
      // Continue with other users even if one fails
    }
  }
  
  console.log('✨ Test user setup complete')
}

// Export test user credentials for use in tests
export const TEST_USER_CREDENTIALS = TEST_USERS.map(u => ({
  email: u.email,
  password: u.password
}))