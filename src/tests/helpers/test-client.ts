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
      // Try to get mock user ID from profiles table
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('user_id')
        .eq('email', userEmail)
        .single()
      
      if (profile?.user_id) {
        console.warn(`⚠️  Using mock profile for ${userEmail} in preview branch`)
        // Return service client with mock user ID
        return { serviceClient, userClient: serviceClient, userId: profile.user_id }
      }
      
      console.warn(`⚠️  Test user not available in preview branch: ${authError.message}`)
      console.warn('Tests requiring authentication will be skipped')
      // Return service client as both clients for preview branches
      return { serviceClient, userClient: serviceClient, userId: null }
    }
    
    userId = authData.user!.id
  }
  
  return { serviceClient, userClient, userId }
}

export function getServiceClient(): SupabaseClient {
  const config = getTestConfig()
  return createClient(config.supabaseUrl, config.supabaseServiceKey)
}