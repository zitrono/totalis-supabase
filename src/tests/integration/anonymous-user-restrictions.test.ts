import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

const config = getTestConfig()

describe('Anonymous User RLS Restrictions', () => {
  // Skip until anonymous auth is enabled
  describe.skip('Anonymous user access control', () => {
    let anonClient: any
    let anonymousUserId: string

    beforeAll(async () => {
      // Create anonymous client
      anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey)
      
      // Sign in anonymously
      const { data, error } = await anonClient.auth.signInAnonymously()
      if (error) throw error
      
      anonymousUserId = data.user!.id
    })

    afterAll(async () => {
      // Clean up
      await anonClient.auth.signOut()
    })

    describe('Read operations (should succeed)', () => {
      test('can view own profile', async () => {
        const { data, error } = await anonClient
          .from('profiles')
          .select()
          .eq('id', anonymousUserId)
          .single()
        
        expect(error).toBeNull()
        expect(data).toBeDefined()
      })

      test('can view categories', async () => {
        const { data, error } = await anonClient
          .from('categories')
          .select()
          .eq('is_active', true)
        
        expect(error).toBeNull()
        expect(Array.isArray(data)).toBe(true)
      })

      test('can view own messages', async () => {
        const { data, error } = await anonClient
          .from('messages')
          .select()
          .eq('user_id', anonymousUserId)
        
        expect(error).toBeNull()
        expect(Array.isArray(data)).toBe(true)
      })
    })

    describe('Write operations (should fail)', () => {
      test('cannot update profile', async () => {
        const { error } = await anonClient
          .from('profiles')
          .update({ metadata: { test: true } })
          .eq('id', anonymousUserId)
        
        expect(error).toBeDefined()
        expect(error?.code).toBe('42501') // insufficient_privilege
      })

      test('cannot create messages', async () => {
        const { error } = await anonClient
          .from('messages')
          .insert({
            user_id: anonymousUserId,
            coach_id: 'some-coach-id',
            sender_type: 'user',
            content: 'Test message',
            content_type: 'text'
          })
        
        expect(error).toBeDefined()
        expect(error?.code).toBe('42501')
      })

      test('cannot manage categories', async () => {
        const { error } = await anonClient
          .from('profile_categories')
          .insert({
            user_id: anonymousUserId,
            category_id: 'some-category-id'
          })
        
        expect(error).toBeDefined()
        expect(error?.code).toBe('42501')
      })

      test('cannot create checkins', async () => {
        const { error } = await anonClient
          .from('checkins')
          .insert({
            user_id: anonymousUserId,
            category_id: 'some-category-id',
            status: 'started'
          })
        
        expect(error).toBeDefined()
        expect(error?.code).toBe('42501')
      })

      test('cannot upload images', async () => {
        const file = new Blob(['test'], { type: 'image/jpeg' })
        const { error } = await anonClient.storage
          .from('user-images')
          .upload(`${anonymousUserId}/test.jpg`, file)
        
        expect(error).toBeDefined()
      })

      test('cannot create feedback', async () => {
        const { error } = await anonClient
          .from('user_feedback')
          .insert({
            user_id: anonymousUserId,
            feedback_type: 'bug',
            content: 'Test feedback'
          })
        
        expect(error).toBeDefined()
        expect(error?.code).toBe('42501')
      })
    })
  })
})