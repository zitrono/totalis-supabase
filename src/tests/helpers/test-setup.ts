import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

// Cache for test users to avoid recreating them
const testUserCache = new Map<string, { id: string; email: string; password: string }>()

export async function ensureTestUser(email: string, password: string = 'Test123!@#'): Promise<{ id: string; email: string; password: string }> {
  // Check cache first
  const cached = testUserCache.get(email)
  if (cached) return cached

  const config = getTestConfig()
  const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // First, try to sign in to see if user exists
    const { data: signInData, error: signInError } = await serviceClient.auth.signInWithPassword({
      email,
      password
    })

    if (signInData?.user) {
      const user = { id: signInData.user.id, email, password }
      testUserCache.set(email, user)
      return user
    }

    // If sign in failed, try to create the user
    console.log(`Creating test user: ${email}`)
    
    // Use admin API to create user
    const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { test_account: true }
    })

    if (createError) {
      throw new Error(`Failed to create test user ${email}: ${createError.message}`)
    }

    if (!userData?.user) {
      throw new Error(`No user data returned when creating ${email}`)
    }

    // Create profile for the user
    const { error: profileError } = await serviceClient
      .from('profiles')
      .insert({
        id: userData.user.id,
        metadata: {
          test_account: true,
          permanent: true,
          created_at: new Date().toISOString()
        }
      })

    if (profileError) {
      console.warn(`Failed to create profile for ${email}: ${profileError.message}`)
    }

    const user = { id: userData.user.id, email, password }
    testUserCache.set(email, user)
    return user
  } catch (error) {
    console.error(`Error ensuring test user ${email}:`, error)
    throw error
  }
}

export async function getOrCreateTestUsers(): Promise<void> {
  // Create standard test users
  const testUsers = [
    'test1@totalis.app',
    'test2@totalis.app',
    'test3@totalis.app',
    'test4@totalis.app',
    'test5@totalis.app'
  ]

  for (const email of testUsers) {
    try {
      await ensureTestUser(email)
    } catch (error) {
      console.error(`Failed to ensure test user ${email}:`, error)
    }
  }
}

// Enable anonymous sign-ins for tests
export async function enableAnonymousSignIns(): Promise<void> {
  const config = getTestConfig()
  const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Note: This might not work if auth.config is not accessible
    // Anonymous sign-ins might need to be enabled in Supabase dashboard
    console.log('Note: Anonymous sign-ins must be enabled in Supabase dashboard for anonymous tests to work')
  } catch (error) {
    console.warn('Could not enable anonymous sign-ins:', error)
  }
}