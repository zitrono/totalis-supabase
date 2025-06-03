import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

export interface TestUser {
  email: string
  password: string
  userId: string
}

export interface CleanupResult {
  run_id: string
  profiles: number
  messages: number
  recommendations: number
  profile_categories: number
  checkins: number
  health_cards: number
  total: number
}

/**
 * Test isolation helper for running tests against production/staging
 * with complete data isolation and cleanup
 */
export class TestIsolation {
  private runId: string
  private supabase: SupabaseClient
  private createdUsers: TestUser[] = []
  
  constructor(supabase?: SupabaseClient) {
    // Use provided client or create one with service role
    if (supabase) {
      this.supabase = supabase
    } else {
      const config = getTestConfig()
      this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
    
    // Generate unique run ID
    this.runId = this.generateRunId()
    console.log(`🔐 Test isolation initialized with run ID: ${this.runId}`)
  }
  
  /**
   * Generate a unique run ID for this test execution
   */
  private generateRunId(): string {
    if (process.env.GITHUB_RUN_ID) {
      // In CI/CD, use GitHub run ID
      return `gh_${process.env.GITHUB_RUN_ID}`
    } else {
      // For local testing, use timestamp and random string
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      return `local_${timestamp}_${random}`
    }
  }
  
  /**
   * Get the current run ID
   */
  getRunId(): string {
    return this.runId
  }
  
  /**
   * Create an isolated test user
   */
  async createTestUser(index: number): Promise<TestUser> {
    // Use unique email with timestamp and random to avoid conflicts
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 5)
    const email = `test${timestamp}${random}${index}@example.com`
    const password = 'Test123!@#'
    
    console.log(`Creating test user: ${email}`)
    
    // Try using admin API to create user
    try {
      // First try admin.createUser if available
      const { data: adminData, error: adminError } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          test_run_id: this.runId,
          is_test: true,
          created_at: new Date().toISOString()
        }
      })
      
      if (!adminError && adminData.user) {
        const userId = adminData.user.id
        
        // Update profile with test metadata (profile created by trigger)
        const { error: profileError } = await this.supabase
          .from('profiles')
          .update({
            metadata: {
              test_run_id: this.runId,
              is_test: true,
              created_at: new Date().toISOString()
            }
          })
          .eq('id', userId)
        
        const user: TestUser = { email, password, userId }
        this.createdUsers.push(user)
        
        console.log(`✅ Created test user via admin API: ${email} (${userId})`)
        return user
      }
    } catch (err) {
      console.log('Admin API not available, falling back to signUp')
    }
    
    // Fallback to regular signUp
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          test_run_id: this.runId,
          is_test: true,
          created_at: new Date().toISOString()
        }
      }
    })
    
    if (authError) {
      // If user already exists (from previous failed run), try to sign in
      if (authError.message?.includes('already registered')) {
        const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (signInError) throw signInError
        
        const user: TestUser = {
          email,
          password,
          userId: signInData.user!.id
        }
        
        this.createdUsers.push(user)
        return user
      }
      
      throw authError
    }
    
    const userId = authData.user!.id
    
    // Update profile with test metadata (profile created by trigger)
    const { error: profileError } = await this.supabase
      .from('profiles')
      .update({
        metadata: {
          test_run_id: this.runId,
          is_test: true,
          created_at: new Date().toISOString()
        }
      })
      .eq('id', userId)
      
    if (profileError) {
      console.error('Failed to create profile:', profileError)
      // Continue anyway - profile might be created by trigger
    }
    
    const user: TestUser = { email, password, userId }
    this.createdUsers.push(user)
    
    console.log(`✅ Created test user: ${email} (${userId})`)
    return user
  }
  
  /**
   * Create multiple test users
   */
  async createTestUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = []
    
    for (let i = 1; i <= count; i++) {
      const user = await this.createTestUser(i)
      users.push(user)
    }
    
    return users
  }
  
  /**
   * Get a client authenticated as a specific test user
   */
  async getAuthenticatedClient(user: TestUser): Promise<SupabaseClient> {
    const config = getTestConfig()
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey)
    
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password
    })
    
    if (error) throw error
    
    return client
  }
  
  /**
   * Clean up all data created during this test run
   */
  async cleanup(): Promise<CleanupResult | null> {
    console.log(`🧹 Cleaning up test data for run: ${this.runId}`)
    
    try {
      // Call cleanup function
      const { data, error } = await this.supabase
        .rpc('cleanup_test_data', { run_id: this.runId })
        
      if (error) {
        console.error('❌ Cleanup failed:', error)
        return null
      }
      
      console.log('✅ Test data cleaned up:', data)
      
      // Delete auth users (requires service role)
      if (this.createdUsers.length > 0) {
        console.log(`🗑️  Deleting ${this.createdUsers.length} test users from auth...`)
        
        for (const user of this.createdUsers) {
          try {
            const { error: deleteError } = await this.supabase.auth.admin.deleteUser(user.userId)
            
            if (deleteError) {
              console.error(`Failed to delete auth user ${user.email}:`, deleteError)
            } else {
              console.log(`Deleted auth user: ${user.email}`)
            }
          } catch (err) {
            console.error(`Error deleting user ${user.email}:`, err)
          }
        }
      }
      
      return data as CleanupResult
    } catch (err) {
      console.error('❌ Cleanup error:', err)
      return null
    }
  }
  
  /**
   * Create test data with automatic cleanup in afterAll
   */
  static setupTestSuite(
    describe: any,
    test: any,
    beforeAll: any,
    afterAll: any
  ) {
    let isolation: TestIsolation
    let testUsers: TestUser[]
    
    beforeAll(async () => {
      isolation = new TestIsolation()
      testUsers = await isolation.createTestUsers(3)
    })
    
    afterAll(async () => {
      await isolation.cleanup()
    })
    
    return { getIsolation: () => isolation, getUsers: () => testUsers }
  }
}

/**
 * Helper function to create an isolated test context
 */
export async function createIsolatedTestContext(userCount = 1) {
  const isolation = new TestIsolation()
  const users = await isolation.createTestUsers(userCount)
  
  return {
    isolation,
    users,
    cleanup: () => isolation.cleanup()
  }
}