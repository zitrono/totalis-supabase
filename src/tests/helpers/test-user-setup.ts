import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

// Test user credentials
export const TEST_USERS = [
  { email: 'test1@totalis.app', password: 'Test123!@#' },
  { email: 'test2@totalis.app', password: 'Test123!@#' },
  { email: 'test3@totalis.app', password: 'Test123!@#' },
  { email: 'test4@totalis.app', password: 'Test123!@#' },
  { email: 'test5@totalis.app', password: 'Test123!@#' }
]

// Cache to avoid recreating users
const userCache = new Map<string, string>()

export async function ensureTestUser(email: string, password: string = 'Test123!@#'): Promise<string> {
  // Check cache
  const cached = userCache.get(email)
  if (cached) return cached

  const config = getTestConfig()
  const adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // First, try to sign in to see if user exists
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email,
      password
    })

    if (signInData?.user) {
      userCache.set(email, signInData.user.id)
      return signInData.user.id
    }

    // If user doesn't exist, create them
    console.log(`Creating test user: ${email}`)
    
    // Use admin API to create user
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { test_account: true }
    })

    if (createError) {
      // If user already exists, try to get their ID
      if (createError.message?.includes('already been registered')) {
        // Try to sign in with the service client
        const { data: existingUser } = await adminClient.auth.signInWithPassword({
          email,
          password
        })
        if (existingUser?.user) {
          userCache.set(email, existingUser.user.id)
          return existingUser.user.id
        }
      }
      throw new Error(`Failed to create test user ${email}: ${createError.message}`)
    }

    if (!userData?.user) {
      throw new Error(`No user data returned when creating ${email}`)
    }

    // Create profile for the user
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userData.user.id,
        metadata: {
          test_account: true,
          created_at: new Date().toISOString()
        }
      })

    if (profileError) {
      console.warn(`Failed to create profile for ${email}: ${profileError.message}`)
    }

    userCache.set(email, userData.user.id)
    return userData.user.id
  } catch (error) {
    console.error(`Error ensuring test user ${email}:`, error)
    throw error
  }
}

export async function setupAllTestUsers(): Promise<void> {
  console.log('Setting up test users...')
  for (const user of TEST_USERS) {
    try {
      await ensureTestUser(user.email, user.password)
    } catch (error) {
      console.error(`Failed to setup ${user.email}:`, error)
    }
  }
  console.log('Test users setup complete')
}