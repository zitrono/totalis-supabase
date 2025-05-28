/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { getTestMetadata, mergeTestMetadata } from "../_shared/test-data.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { count = 3 } = await req.json()
    const testMetadata = getTestMetadata(req)
    
    // Mock recommendations without auth
    const mockRecommendations = [
      {
        id: crypto.randomUUID(),
        user_id: 'test-user',
        title: "Take a 10-minute walk",
        recommendation_text: "A short walk can help clear your mind and boost your energy levels.",
        action: "Go for a 10-minute walk outside",
        why: "Physical movement increases blood flow and releases endorphins",
        recommendation_type: "action",
        importance: 4,
        relevance: 0.85,
        created_at: new Date().toISOString(),
        metadata: mergeTestMetadata({}, testMetadata)
      }
    ].slice(0, count)

    return new Response(
      JSON.stringify({ 
        recommendations: mockRecommendations,
        count: mockRecommendations.length,
        generated_at: new Date().toISOString(),
        test: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})