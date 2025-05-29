import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'
import { randomUUID } from 'crypto'
import { createTestClients, getServiceClient } from '../helpers/test-client'
import { setupTestUsers } from '../helpers/setup-test-users'

describe('Database Views', () => {
  let testUserId: string
  let testCoachId: string
  let testCategoryId: string
  let serviceClient: any
  let userClient: any

  beforeAll(async () => {
    const config = getTestConfig()
    if (config.isPreview) {
      console.log('🔧 Setting up test users for preview environment...')
      await setupTestUsers()
    }
    
    // Get test clients
    const clients = await createTestClients('test2@totalis.app', 'Test123!@#')
    serviceClient = clients.serviceClient
    userClient = clients.userClient
    testUserId = clients.userId!
    
    // Create test data using service client
    const { data: coach } = await serviceClient
      .from('coaches')
      .insert({
        name: 'Test Coach',
        bio: 'A supportive test coach',
        photo_url: 'https://example.com/coach.jpg',
        sex: 'female',
        year_of_birth: 1980,
        metadata: { test: true, test_run: Date.now() }
      })
      .select()
      .single()
    
    testCoachId = coach.id
    
    const { data: category } = await serviceClient
      .from('categories')
      .select()
      .limit(1)
      .single()
    
    testCategoryId = category.id
    
    // Upsert profile with coach (handles existing profiles)
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: testUserId,
        name: 'Test User',
        coach_id: testCoachId,
        metadata: { test: true, test_run: Date.now() }
      })
      .select()
      .single()
    
    if (profileError) {
      console.error('Error upserting profile:', profileError)
      throw profileError
    }
  })

  afterAll(async () => {
    // Cleanup test data
    await serviceClient
      .from('coaches')
      .delete()
      .eq('id', testCoachId)
  })

  describe('user_profiles_with_coaches view', () => {
    it('should return profile with coach details', async () => {
      const { data, error } = await userClient
        .from('user_profiles_with_coaches')
        .select()
        .eq('id', testUserId)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      // Profile doesn't have name field, only coach details
      expect(data.coach_name).toBe('Test Coach')
      expect(data.coach_bio).toBe('A supportive test coach')
      expect(data.coach_avatar).toBe('https://example.com/coach.jpg')
      expect(data.coach_sex).toBe('female')
      expect(data.coach_year_of_birth).toBe(1980)
    })
  })

  describe('categories_with_user_preferences view', () => {
    beforeAll(async () => {
      // Add category to user's preferences
      await serviceClient
        .from('profile_categories')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          is_favorite: true,
          metadata: { test: true, test_run: Date.now() }
        })
    })

    it('should return categories with user preferences', async () => {
      const { data, error } = await userClient
        .from('categories_with_user_preferences')
        .select()
        .eq('user_id', testUserId)
        .eq('id', testCategoryId)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.is_favorite).toBe(true)
      expect(data.is_selected).toBe(true)
      expect(data.user_id).toBe(testUserId)
    })

    it('should return categories without preferences for other users', async () => {
      const { data, error } = await serviceClient
        .from('categories_with_user_preferences')
        .select()
        .is('user_id', null)
        .limit(1)
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.length).toBeGreaterThan(0)
      expect(data?.[0]?.is_selected).toBe(false)
    })
  })

  describe('active_recommendations view', () => {
    let testRecommendationId: string

    beforeAll(async () => {
      // Create an active recommendation without trigger fields
      const { data: rec, error: recError } = await serviceClient
        .from('recommendations')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          title: 'Test Recommendation',
          recommendation_text: 'This is a test recommendation',
          recommendation_type: 'action',
          importance: 3,
          is_active: true,
          metadata: { test: true, test_run: Date.now() }
        })
        .select()
        .single()
      
      if (recError) {
        console.error('Error creating recommendation:', recError)
        // Skip this test if we can't create recommendations due to permissions
        if (recError.code === '42501') {
          console.log('Skipping recommendation tests - permission denied')
          return
        }
        throw recError
      }
      testRecommendationId = rec!.id
    })

    it('should return active recommendations with category info', async () => {
      const { data, error } = await serviceClient
        .from('active_recommendations')
        .select()
        .eq('user_id', testUserId)
        .eq('id', testRecommendationId)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.title).toBe('Test Recommendation')
      expect(data.category_name).toBeDefined()
      expect(data.category_icon).toBeDefined()
      expect(data.category_color).toBeDefined()
      expect(data.is_active).toBe(true)
    })

    it('should not return inactive recommendations', async () => {
      // Skip if no recommendation was created
      if (!testRecommendationId) {
        console.log('Skipping - no recommendation created')
        return
      }
      
      // Deactivate the recommendation
      const { error: updateError } = await serviceClient
        .from('recommendations')
        .update({ 
          is_active: false
        })
        .eq('id', testRecommendationId)
      
      expect(updateError).toBeNull()
      
      // Small delay to ensure update is propagated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const { data, error } = await userClient
        .from('active_recommendations')
        .select()
        .eq('id', testRecommendationId)
      
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('checkin_history_view', () => {
    let testCheckinId: string

    beforeAll(async () => {
      // Create a completed check-in
      const { data: checkin } = await serviceClient
        .from('checkins')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          status: 'completed',
          wellness_level: 7,
          summary: 'Test checkin summary',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          metadata: { test: true, test_run: Date.now() }
        })
        .select()
        .single()
      
      testCheckinId = checkin.id
    })

    it('should return completed checkins with category info', async () => {
      const { data, error } = await serviceClient
        .from('checkin_history_view')
        .select()
        .eq('user_id', testUserId)
        .eq('id', testCheckinId)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.status).toBe('completed')
      expect(data.wellness_level).toBe(7)
      expect(data.category_name).toBeDefined()
      expect(data.category_color).toBeDefined()
      expect(data.category_icon).toBeDefined()
    })

    it('should not return in-progress checkins', async () => {
      // Create an in-progress check-in
      const { data: inProgressCheckin } = await serviceClient
        .from('checkins')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          metadata: { test: true, test_run: Date.now() }
        })
        .select()
        .single()
      
      const { data, error } = await serviceClient
        .from('checkin_history_view')
        .select()
        .eq('id', inProgressCheckin.id)
      
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('messages_with_coach view', () => {
    let testMessageId: string

    beforeAll(async () => {
      // Create a message from the coach
      const { data: message, error: messageError } = await serviceClient
        .from('messages')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          role: 'assistant',
          content: 'Hello from your coach!',
          coach_id: testCoachId,
          conversation_id: randomUUID(),
          metadata: { test: true, test_run: Date.now() }
        })
        .select()
        .single()
      
      if (messageError) {
        console.error('Error creating message:', messageError)
        throw messageError
      }
      testMessageId = message!.id
    })

    it('should return messages with coach info', async () => {
      const { data, error } = await serviceClient
        .from('messages_with_coach')
        .select()
        .eq('id', testMessageId)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.content).toBe('Hello from your coach!')
      expect(data.sender_name).toBe('Test Coach')
      expect(data.sender_avatar).toBe('https://example.com/coach.jpg')
    })

    it('should return user messages with user name', async () => {
      // Create a user message
      const { data: userMessage } = await serviceClient
        .from('messages')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          role: 'user',
          content: 'Hello coach!',
          coach_id: testCoachId,
          conversation_id: randomUUID(),
          metadata: { test: true, test_run: Date.now() }
        })
        .select()
        .single()
      
      const { data, error } = await serviceClient
        .from('messages_with_coach')
        .select()
        .eq('id', userMessage.id)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.content).toBe('Hello coach!')
      expect(data.sender_name).toBe('User')  // View hardcodes 'User' for user messages
      expect(data.sender_avatar).toBeNull()
    })
  })
})
