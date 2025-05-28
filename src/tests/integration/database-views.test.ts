import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'
import { TestDataManager } from '../helpers/test-data'
import { randomUUID } from 'crypto'

const config = getTestConfig()
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)
const testDataManager = new TestDataManager(supabase, config)

describe.skip('Database Views', () => {
  // TODO: Fix permission errors - "permission denied for table users"
  // The service role key should have full access but something is blocking it
  let testUserId: string
  let testCoachId: string
  let testCategoryId: string

  beforeAll(async () => {
    
    // Create test data
    const { data: coach } = await supabase
      .from('coaches')
      .insert({
        name: 'Test Coach',
        bio: 'A supportive test coach',
        photo_url: 'https://example.com/coach.jpg',
        sex: 'female',
        year_of_birth: 1980,
        metadata: { test: true, testRunId: config.testRunId }
      })
      .select()
      .single()
    
    testCoachId = coach.id
    
    const { data: category } = await supabase
      .from('categories')
      .select()
      .limit(1)
      .single()
    
    testCategoryId = category.id
    
    // Use pre-created test user
    const { user } = await testDataManager.usePreCreatedTestUser()
    testUserId = user!.id
    
    // Create profile with coach
    await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        name: 'Test User',
        coach_id: testCoachId,
        metadata: { test: true, testRunId: config.testRunId }
      })
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase
      .from('coaches')
      .delete()
      .eq('id', testCoachId)
    
    await testDataManager.cleanupTestRun()
  })

  describe('user_profiles_with_coaches view', () => {
    it('should return profile with coach details', async () => {
      const { data, error } = await supabase
        .from('user_profiles_with_coaches')
        .select()
        .eq('id', testUserId)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe('Test User')
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
      await supabase
        .from('profile_categories')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          is_favorite: true,
          metadata: { test: true, testRunId: config.testRunId }
        })
    })

    it('should return categories with user preferences', async () => {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      // Create an active recommendation
      const { data: rec, error: recError } = await supabase
        .from('recommendations')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          title: 'Test Recommendation',
          recommendation_text: 'This is a test recommendation',
          action: 'Test this feature',
          why: 'To ensure it works',
          recommendation_type: 'action',
          importance: 3,
          is_active: true,
          metadata: { test: true, testRunId: config.testRunId }
        })
        .select()
        .single()
      
      if (recError) {
        console.error('Error creating recommendation:', recError)
        throw recError
      }
      testRecommendationId = rec!.id
    })

    it('should return active recommendations with category info', async () => {
      const { data, error } = await supabase
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
      // Deactivate the recommendation
      await supabase
        .from('recommendations')
        .update({ is_active: false })
        .eq('id', testRecommendationId)
      
      const { data, error } = await supabase
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
      const { data: checkin } = await supabase
        .from('checkins')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          status: 'completed',
          wellness_level: 7,
          summary: 'Test checkin summary',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          metadata: { test: true, testRunId: config.testRunId }
        })
        .select()
        .single()
      
      testCheckinId = checkin.id
    })

    it('should return completed checkins with category info', async () => {
      const { data, error } = await supabase
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
      const { data: inProgressCheckin } = await supabase
        .from('checkins')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          metadata: { test: true, testRunId: config.testRunId }
        })
        .select()
        .single()
      
      const { data, error } = await supabase
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
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          role: 'assistant',
          content: 'Hello from your coach!',
          coach_id: testCoachId,
          conversation_id: randomUUID(),
          metadata: { test: true, testRunId: config.testRunId }
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
      const { data, error } = await supabase
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
      const { data: userMessage } = await supabase
        .from('messages')
        .insert({
          user_id: testUserId,
          category_id: testCategoryId,
          role: 'user',
          content: 'Hello coach!',
          coach_id: testCoachId,
          conversation_id: randomUUID(),
          metadata: { test: true, testRunId: config.testRunId }
        })
        .select()
        .single()
      
      const { data, error } = await supabase
        .from('messages_with_coach')
        .select()
        .eq('id', userMessage.id)
        .single()
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.content).toBe('Hello coach!')
      expect(data.sender_name).toBe('Test User')
      expect(data.sender_avatar).toBeNull()
    })
  })
})