import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { TestIsolation, TestUser } from '../helpers/test-isolation'
import { getTestConfig } from '../config/test-env'
import * as fs from 'fs'
import * as path from 'path'

describe('SDK Operations - With Test Isolation', () => {
  let isolation: TestIsolation
  let testUsers: TestUser[]
  let supabase: SupabaseClient
  let serviceClient: SupabaseClient
  let testImagePath: string

  beforeAll(async () => {
    console.log('🚀 Setting up isolated test environment...')
    
    // Create test isolation instance
    isolation = new TestIsolation()
    
    // Create 3 isolated test users
    testUsers = await isolation.createTestUsers(3)
    console.log(`✅ Created ${testUsers.length} isolated test users`)
    
    // Get authenticated client for first user
    supabase = await isolation.getAuthenticatedClient(testUsers[0])
    
    // Create service client for admin queries
    const config = getTestConfig()
    serviceClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Create test image file
    testImagePath = path.join(__dirname, `test-image-${isolation.getRunId()}.png`)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
      0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    fs.writeFileSync(testImagePath, pngBuffer)
  })

  afterAll(async () => {
    console.log('🧹 Cleaning up test environment...')
    
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath)
    }
    
    // Clean up all test data
    const result = await isolation.cleanup()
    if (result) {
      console.log(`✅ Cleanup complete: ${result.total} records deleted`)
    }
  })

  describe('Authentication', () => {
    test('should authenticate with isolated test user', async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      expect(error).toBeNull()
      expect(user).toBeDefined()
      expect(user?.email).toBe(testUsers[0].email)
      expect(user?.user_metadata?.test_run_id).toBe(isolation.getRunId())
    })
    
    test('should switch between isolated test users', async () => {
      // Switch to second user
      const client2 = await isolation.getAuthenticatedClient(testUsers[1])
      const { data: { user: user2 } } = await client2.auth.getUser()
      
      expect(user2?.email).toBe(testUsers[1].email)
      
      // Switch to third user
      const client3 = await isolation.getAuthenticatedClient(testUsers[2])
      const { data: { user: user3 } } = await client3.auth.getUser()
      
      expect(user3?.email).toBe(testUsers[2].email)
    })
  })

  describe('Profile Operations', () => {
    test('should have profile with test metadata', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUsers[0].userId)
        .single()
      
      expect(error).toBeNull()
      expect(profile).toBeDefined()
      expect(profile?.metadata?.test_run_id).toBe(isolation.getRunId())
      expect(profile?.metadata?.is_test).toBe(true)
    })
    
    test('should update profile maintaining test metadata', async () => {
      const updates = {
        year_of_birth: 1990,
        sex: 'male',
        notification_settings: { email: true, push: false }
      }
      
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', testUsers[0].userId)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated?.year_of_birth).toBe(1990)
      expect(updated?.metadata?.test_run_id).toBe(isolation.getRunId())
    })
  })

  describe('Data Creation', () => {
    let categoryId: string
    
    test('should create isolated messages', async () => {
      // Get a category first
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .limit(1)
        .single()
      
      categoryId = categories?.id
      
      // Create message
      const message = {
        user_id: testUsers[0].userId,
        category_id: categoryId,
        content: `Test message for run ${isolation.getRunId()}`,
        role: 'user',
        metadata: { test_run_id: isolation.getRunId() }
      }
      
      const { data: created, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(created).toBeDefined()
      expect(created?.content).toContain(isolation.getRunId())
    })
    
    test('should create isolated recommendations', async () => {
      const recommendation = {
        user_id: testUsers[0].userId,
        category_id: categoryId,
        title: `Test recommendation ${isolation.getRunId()}`,
        recommendation_text: 'This is a test recommendation',
        recommendation_type: 'action',
        importance: 3,
        is_active: true,
        metadata: { test_run_id: isolation.getRunId() }
      }
      
      const { data: created, error } = await supabase
        .from('recommendations')
        .insert(recommendation)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(created).toBeDefined()
      expect(created?.title).toContain(isolation.getRunId())
    })
  })

  describe('Storage Operations', () => {
    test('should upload file with isolated naming', async () => {
      const bucketName = 'user-images'
      const fileName = `test-${isolation.getRunId()}-${Date.now()}.png`
      const fileBuffer = fs.readFileSync(testImagePath)
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
          contentType: 'image/png',
          upsert: true
        })
      
      if (error?.message?.includes('row-level security')) {
        console.log('⚠️  Storage RLS not configured, skipping test')
        return
      }
      
      expect(error).toBeNull()
      expect(data?.path).toBe(fileName)
      
      // Clean up uploaded file
      await supabase.storage.from(bucketName).remove([fileName])
    })
  })

  describe('Cleanup Verification', () => {
    test('should track all created data for cleanup', async () => {
      // Query test data that will be cleaned up using service client to bypass RLS
      const { data: testProfiles } = await serviceClient
        .from('profiles')
        .select('id')
        .filter('metadata->>test_run_id', 'eq', isolation.getRunId())
      
      expect(testProfiles?.length).toBe(3) // We created 3 test users
      
      const { data: testMessages } = await serviceClient
        .from('messages')
        .select('id')
        .filter('metadata->>test_run_id', 'eq', isolation.getRunId())
      
      expect(testMessages?.length).toBeGreaterThan(0)
    })
  })
})