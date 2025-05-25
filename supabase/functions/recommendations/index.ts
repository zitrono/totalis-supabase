import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient, getUserContext } from '../_shared/supabase-client.ts'
import { LangflowClient } from '../_shared/langflow-client.ts'
import { Recommendation } from '../_shared/types.ts'

const langflowClient = new LangflowClient()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Create Supabase client with user auth
    const supabase = createSupabaseClient(authHeader)
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Get request body
    const { count = 3, categoryId } = await req.json()

    // Get user context
    const context = await getUserContext(supabase, user.id)

    // If specific category requested, prioritize it
    if (categoryId && !context.recentCategories.includes(categoryId)) {
      context.recentCategories.unshift(categoryId)
    }

    // Get recommendations from Langflow (mocked for now)
    const recommendations = await langflowClient.getRecommendations(context)
    
    // Limit to requested count
    const limitedRecommendations = recommendations.slice(0, count)

    // Store recommendations in database
    const { data: savedRecommendations, error: saveError } = await supabase
      .from('recommendations')
      .insert(
        limitedRecommendations.map(rec => ({
          ...rec,
          user_id: user.id,
          created_at: new Date().toISOString()
        }))
      )
      .select()

    if (saveError) {
      console.error('Error saving recommendations:', saveError)
      // Continue even if save fails - return the generated recommendations
    }

    // Return recommendations
    return new Response(
      JSON.stringify({
        recommendations: savedRecommendations || limitedRecommendations,
        context: {
          coachId: context.coachId,
          categoriesConsidered: context.recentCategories.slice(0, 3)
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )
  } catch (error) {
    console.error('Recommendations error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate recommendations',
        details: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})