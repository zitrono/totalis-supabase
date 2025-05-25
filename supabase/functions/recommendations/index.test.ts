import { serve } from './index.ts'
import { createMockRequest, assertJsonResponse, assertEquals } from '../_shared/test-utils.ts'

Deno.test('Recommendations Function', async (t) => {
  await t.step('should return 401 without auth header', async () => {
    const req = new Request('http://localhost:54321/functions/v1/recommendations', {
      method: 'POST',
      body: JSON.stringify({ count: 3 })
    })
    
    const response = await serve(req)
    const data = await assertJsonResponse(response, 401)
    assertEquals(data.error, 'No authorization header')
  })

  await t.step('should return recommendations with valid auth', async () => {
    const req = createMockRequest('POST', { count: 3 })
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    assertEquals(Array.isArray(data.recommendations), true)
    assertEquals(data.recommendations.length <= 3, true)
    assertEquals(typeof data.context.coachId, 'string')
  })

  await t.step('should prioritize specific category', async () => {
    const req = createMockRequest('POST', { 
      count: 2, 
      categoryId: 'stress-mgmt-123' 
    })
    const response = await serve(req)
    const data = await assertJsonResponse(response, 200)
    
    assertEquals(data.recommendations.length <= 2, true)
    if (data.context.categoriesConsidered.length > 0) {
      assertEquals(data.context.categoriesConsidered[0], 'stress-mgmt-123')
    }
  })

  await t.step('should handle CORS preflight', async () => {
    const req = new Request('http://localhost:54321/functions/v1/recommendations', {
      method: 'OPTIONS'
    })
    
    const response = await serve(req)
    assertEquals(response.status, 200)
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*')
  })
})