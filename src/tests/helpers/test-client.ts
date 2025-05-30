import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

interface TestClients {
  serviceClient: SupabaseClient
  userClient: SupabaseClient | null
  userId: string | null
}

export async function createTestClients(userEmail?: string, userPassword?: string): Promise<TestClients> {
  const config = getTestConfig()
  
  // Create service client for admin operations
  const serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey)
  
  // If user credentials provided, create user client
  let userClient: SupabaseClient | null = null
  let userId: string | null = null
  
  if (userEmail && userPassword) {
    // Create a separate client instance for user operations
    userClient = createClient(config.supabaseUrl, config.supabaseAnonKey)
    
    const { data: authData, error: authError } = await userClient.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    })
    
    if (authError) {
      // In preview branches, test users might not exist
      if (config.isPreview) {
        console.warn(`⚠️  Test user not available in preview branch: ${authError.message}`)
        console.warn('Using service client for all operations')
        // Return service client as both clients for preview branches
        return { serviceClient, userClient: serviceClient, userId: null }
      }
      throw new Error(`Failed to sign in with test user: ${authError.message}`)
    }
    
    userId = authData.user!.id
  }
  
  return { serviceClient, userClient, userId }
}

export function getServiceClient(): SupabaseClient {
  const config = getTestConfig()
  return createClient(config.supabaseUrl, config.supabaseServiceKey)
}