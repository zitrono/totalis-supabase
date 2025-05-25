import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient, getUserContext } from '../_shared/supabase-client.ts'
import { LangflowClient } from '../_shared/langflow-client.ts'
import { CheckInResponse } from '../_shared/types.ts'

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
    const { checkInId, question, answer, isComplete = false } = await req.json()
    
    if (!checkInId || !question || !answer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Verify check-in exists and belongs to user
    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .select('*, categories(*)')
      .eq('id', checkInId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .single()

    if (checkInError || !checkIn) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive check-in' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Store the response
    const response: CheckInResponse = {
      questionId: crypto.randomUUID(),
      question,
      answer,
      timestamp: new Date().toISOString()
    }

    // Get existing responses
    const existingResponses = checkIn.responses || []
    const updatedResponses = [...existingResponses, response]

    // Update check-in with new response
    const { error: updateError } = await supabase
      .from('check_ins')
      .update({
        responses: updatedResponses,
        updated_at: new Date().toISOString()
      })
      .eq('id', checkInId)

    if (updateError) {
      throw updateError
    }

    // Prepare response data
    let responseData: any = {
      checkInId,
      response,
      totalResponses: updatedResponses.length
    }

    if (isComplete) {
      // Complete the check-in
      const { error: completeError } = await supabase
        .from('check_ins')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', checkInId)

      if (completeError) {
        throw completeError
      }

      responseData.status = 'completed'
      responseData.message = 'Check-in completed successfully!'
      
      // Generate recommendations based on check-in
      const context = await getUserContext(supabase, user.id)
      const recommendations = await langflowClient.getRecommendations(context)
      responseData.recommendations = recommendations.slice(0, 2)
    } else {
      // Get next question from Langflow (mocked)
      const previousAnswers = updatedResponses.map(r => r.answer)
      const context = await getUserContext(supabase, user.id)
      const nextQuestion = await langflowClient.processCheckIn(
        question,
        previousAnswers,
        context
      )

      responseData.nextQuestion = nextQuestion
      responseData.status = 'in_progress'
    }

    // Return response
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )
  } catch (error) {
    console.error('Check-in process error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process check-in',
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