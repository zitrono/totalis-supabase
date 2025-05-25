import { serve } from './index.ts'
import { createMockRequest, assertJsonResponse, assertEquals } from '../_shared/test-utils.ts'

Deno.test('Chat AI Response Function', async (t) => {
  await t.step('should require message', async () => {
    const req = createMockRequest('POST', {})
    const response = await serve(req)
    const data = await assertJsonResponse(response, 400)
    assertEquals(data.error, 'Message is required')
  })

  await t.step('should return AI response', async () => {
    const req = createMockRequest('POST', {
      message: 'I am feeling overwhelmed with work',
      contextType: 'category',
      contextId: 'stress-mgmt-123'
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    assertEquals(typeof data.userMessage.content, 'string')
    assertEquals(data.userMessage.isUser, true)
    assertEquals(typeof data.aiMessage.content, 'string')
    assertEquals(data.aiMessage.isUser, false)
    assertEquals(data.context.type, 'category')
    assertEquals(data.context.id, 'stress-mgmt-123')
  })

  await t.step('should include chat history when requested', async () => {
    const req = createMockRequest('POST', {
      message: 'Thanks for the advice',
      includeHistory: true
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    // Should have processed the message with history context
    assertEquals(typeof data.aiMessage.content, 'string')
    assertEquals(data.aiMessage.content.length > 0, true)
  })

  await t.step('should work without history', async () => {
    const req = createMockRequest('POST', {
      message: 'Hello',
      includeHistory: false
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    assertEquals(data.userMessage.content, 'Hello')
    assertEquals(typeof data.aiMessage.content, 'string')
  })

  await t.step('should include coach info', async () => {
    const req = createMockRequest('POST', {
      message: 'Test message'
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    assertEquals(typeof data.coach?.name, 'string')
    assertEquals(typeof data.coach?.voice, 'string')
  })
})