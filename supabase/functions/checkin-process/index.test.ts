import { serve } from './index.ts'
import { createMockRequest, assertJsonResponse, assertEquals } from '../_shared/test-utils.ts'

Deno.test('CheckIn Process Function', async (t) => {
  await t.step('should validate required fields', async () => {
    const req = createMockRequest('POST', { checkInId: 'test-id' })
    const response = await serve(req)
    const data = await assertJsonResponse(response, 400)
    assertEquals(data.error, 'Missing required fields')
  })

  await t.step('should process response and return next question', async () => {
    const req = createMockRequest('POST', {
      checkInId: 'checkin-123',
      question: 'How are you feeling?',
      answer: 'A bit stressed',
      isComplete: false
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    assertEquals(data.status, 'in_progress')
    assertEquals(typeof data.nextQuestion, 'string')
    assertEquals(data.response.question, 'How are you feeling?')
    assertEquals(data.response.answer, 'A bit stressed')
  })

  await t.step('should complete check-in and return recommendations', async () => {
    const req = createMockRequest('POST', {
      checkInId: 'checkin-123',
      question: 'Final thoughts?',
      answer: 'Feeling better after reflection',
      isComplete: true
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    assertEquals(data.status, 'completed')
    assertEquals(data.message, 'Check-in completed successfully!')
    assertEquals(Array.isArray(data.recommendations), true)
    assertEquals(data.recommendations.length <= 2, true)
  })

  await t.step('should handle invalid check-in ID', async () => {
    const req = createMockRequest('POST', {
      checkInId: 'invalid-id',
      question: 'Test',
      answer: 'Test',
      isComplete: false
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 404)
    assertEquals(data.error, 'Invalid or inactive check-in')
  })
})