import { SupabaseClient } from '@supabase/supabase-js'
import { TestConfig } from '../config/test-env'

export interface TestMetadata {
  test: boolean
  test_run_id: string
  test_scenario?: string
  test_created_at: string
  test_cleanup_after: string
}

export class TestDataManager {
  private testUserIndex = 0
  private testUsers = [
    { email: 'test1@totalis.test', password: 'Test123!@#' },
    { email: 'test2@totalis.test', password: 'Test123!@#' },
    { email: 'test3@totalis.test', password: 'Test123!@#' },
    { email: 'test4@totalis.test', password: 'Test123!@#' },
    { email: 'test5@totalis.test', password: 'Test123!@#' }
  ]

  constructor(
    private supabase: SupabaseClient,
    private config: TestConfig
  ) {}

  getTestMetadata(scenario?: string): TestMetadata {
    const now = new Date()
    const cleanupAfter = new Date(now.getTime() + this.config.testDataTTL * 60 * 60 * 1000)
    
    return {
      test: true,
      test_run_id: this.config.testRunId,
      test_scenario: scenario,
      test_created_at: now.toISOString(),
      test_cleanup_after: cleanupAfter.toISOString()
    }
  }

  async createTestUser(scenario: string = 'default') {
    const email = `test_${Date.now()}_${this.config.testRunId.substring(0, 8)}@example.com`
    const metadata = this.getTestMetadata(scenario)
    
    try {
      // For remote testing, use service role to create user
      const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
        email,
        password: 'test_password_123',
        email_confirm: true,
        user_metadata: metadata
      })
      
      if (authError) {
        throw new Error(`Failed to create test user: ${authError.message}`)
      }
      
      // Sign in to get session
      const { data: sessionData, error: signInError } = await this.supabase.auth.signInWithPassword({
        email,
        password: 'test_password_123'
      })
      
      if (signInError) {
        throw new Error(`Failed to sign in test user: ${signInError.message}`)
      }
      
      // Update profile metadata
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({ metadata })
        .eq('id', authData.user.id)
      
      if (profileError) {
        console.warn('Failed to update profile metadata:', profileError)
      }
      
      return {
        user: authData.user,
        session: sessionData.session,
        email,
        testRunId: this.config.testRunId
      }
    } catch (error) {
      // If rate limited, wait and retry with anonymous
      if (error instanceof Error && error.message.includes('rate limit')) {
        console.warn('Rate limited, falling back to anonymous user')
        return this.createAnonymousTestUser(scenario)
      }
      throw error
    }
  }

  async createAnonymousTestUser(scenario: string = 'anonymous') {
    const metadata = this.getTestMetadata(scenario)
    
    // Sign in anonymously
    const { data: authData, error: authError } = await this.supabase.auth.signInAnonymously({
      options: {
        data: metadata
      }
    })
    
    if (authError) {
      throw new Error(`Failed to create anonymous user: ${authError.message}`)
    }
    
    // Update profile metadata
    if (authData.user) {
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({ metadata })
        .eq('id', authData.user.id)
      
      if (profileError) {
        console.warn('Failed to update profile metadata:', profileError)
      }
    }
    
    return {
      user: authData.user!,
      session: authData.session!,
      testRunId: this.config.testRunId
    }
  }

  async usePreCreatedTestUser(scenario: string = 'default') {
    // Rotate through pre-created test users
    const testUser = this.testUsers[this.testUserIndex]
    this.testUserIndex = (this.testUserIndex + 1) % this.testUsers.length
    
    console.log(`🔐 Using pre-created test user: ${testUser.email}`)
    
    try {
      // Sign in with pre-created user
      const { data: sessionData, error: sessionError } = await this.supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      })
      
      if (sessionError) {
        console.error(`Failed to sign in with ${testUser.email}:`, sessionError)
        throw sessionError
      }
      
      // Note: We don't update the profile metadata for permanent test users
      // They are marked with permanent: true and won't be cleaned up
      
      return {
        user: sessionData.user!,
        session: sessionData.session!,
        email: testUser.email,
        testRunId: this.config.testRunId
      }
    } catch (error) {
      console.error('Failed to use pre-created test user:', error)
      // Fall back to anonymous user if pre-created login fails
      return this.createAnonymousTestUser(scenario)
    }
  }

  getTestHeaders(): Record<string, string> {
    return {
      'X-Test-Run-Id': this.config.testRunId,
      'X-Test-Scenario': 'integration-test'
    }
  }

  async markAsTestData(tableName: string, recordId: string, scenario?: string) {
    const metadata = this.getTestMetadata(scenario)
    
    const { error } = await this.supabase
      .from(tableName)
      .update({ metadata })
      .eq('id', recordId)
    
    if (error) {
      console.warn(`Failed to mark ${tableName} record as test data:`, error)
    }
  }

  async cleanupTestRun(dryRun: boolean = false) {
    if (this.config.cleanupStrategy === 'manual' && !dryRun) {
      console.log('Skipping cleanup - manual strategy configured')
      return
    }
    
    console.log(`🧹 Cleaning up test data for run: ${this.config.testRunId}`)
    
    try {
      const { data, error } = await this.supabase.rpc('cleanup_test_data', {
        p_test_run_id: this.config.testRunId,
        p_dry_run: dryRun
      })
      
      if (error) {
        // Check if it's just a missing function error
        if (error.message.includes('cleanup_test_data') && error.message.includes('schema cache')) {
          console.warn('⚠️  Cleanup function not found - skipping cleanup')
          console.log('   Run the SQL in scripts/apply-minimal-sql.md to enable cleanup')
          return
        }
        throw error
      }
      
      if (data && Array.isArray(data)) {
        console.log('Cleanup results:')
        data.forEach((result: any) => {
          console.log(`  ${result.table_name}: ${result.records_deleted} records`)
        })
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
      throw error
    }
  }

  async getTestDataSummary() {
    const { data, error } = await this.supabase
      .from('test_data_summary')
      .select('*')
    
    if (error) {
      // If view doesn't exist, just return empty array
      if (error.message.includes('test_data_summary') && error.message.includes('does not exist')) {
        return []
      }
      console.error('Failed to get test data summary:', error)
      return []
    }
    
    return data || []
  }

  async waitForCleanup(maxWaitMs: number = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitMs) {
      const summary = await this.getTestDataSummary()
      const testRunData = summary.filter((row: any) => 
        row.table_name === 'profiles' || row.table_name === 'messages'
      )
      
      if (testRunData.length === 0) {
        console.log('✅ Test data cleanup confirmed')
        return true
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.warn('⚠️ Test data cleanup timeout - some data may remain')
    return false
  }
}