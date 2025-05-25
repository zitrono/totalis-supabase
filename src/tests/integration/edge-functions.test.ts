import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

describe('Edge Functions Integration Tests', () => {
  let supabase: SupabaseClient
  let authToken: string
  const baseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
  const functionsUrl = `${baseUrl}/functions/v1`

  beforeAll(async () => {
    supabase = createClient(
      baseUrl,
      process.env.SUPABASE_ANON_KEY!
    )

    // Create test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    })

    if (authError) throw authError
    authToken = authData.session?.access_token || ''
  })

  afterAll(async () => {
    // Cleanup
    await supabase.auth.signOut()
  })

  describe('Langflow Webhook', () => {
    it('should echo webhook payload', async () => {
      const payload = {
        flowId: 'test-flow',
        result: { message: 'Test AI response' }
      }

      const response = await fetch(`${functionsUrl}/langflow-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
      expect(data.echo).toEqual(payload)
    })
  })

  describe('Recommendations', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${functionsUrl}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ count: 3 })
      })

      expect(response.status).toBe(401)
    })

    it('should return recommendations with auth', async () => {
      const response = await fetch(`${functionsUrl}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ count: 3 })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data.recommendations)).toBe(true)
      expect(data.recommendations.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Check-in Flow', () => {
    let checkInId: string
    let categoryId: string

    beforeAll(async () => {
      // Get a category
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .limit(1)
      
      categoryId = categories?.[0]?.id || 'test-category'
    })

    it('should start a check-in', async () => {
      const response = await fetch(`${functionsUrl}/checkin-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ categoryId })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.checkIn.status).toBe('in_progress')
      expect(Array.isArray(data.questions)).toBe(true)
      checkInId = data.checkIn.id
    })

    it('should process check-in response', async () => {
      const response = await fetch(`${functionsUrl}/checkin-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          checkInId,
          question: 'How are you feeling?',
          answer: 'Good, thanks!',
          isComplete: false
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.nextQuestion).toBeDefined()
      expect(data.status).toBe('in_progress')
    })

    it('should complete check-in', async () => {
      const response = await fetch(`${functionsUrl}/checkin-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          checkInId,
          question: 'Any final thoughts?',
          answer: 'All good!',
          isComplete: true
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('completed')
      expect(Array.isArray(data.recommendations)).toBe(true)
    })
  })

  describe('Analytics', () => {
    it('should return user analytics', async () => {
      const response = await fetch(`${functionsUrl}/analytics-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ period: 'week' })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.summary).toBeDefined()
      expect(data.summary.period).toBe('week')
      expect(typeof data.summary.totalCheckIns).toBe('number')
      expect(Array.isArray(data.summary.insights)).toBe(true)
    })
  })
})