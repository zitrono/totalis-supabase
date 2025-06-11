import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface ChatRequest {
  user_id: string
  message: string
  coach_id?: string
  context?: {
    category_id?: string
    checkin_id?: string
    recommendation_id?: string
  }
}

interface LangflowResponse {
  response: string
  metadata?: {
    tokens_used?: number
    model?: string
    coach_personality?: string
  }
  suggested_actions?: Array<{
    type: string
    category_id?: string
    action_text?: string
  }>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const langflowUrl = Deno.env.get('LANGFLOW_URL') || 'https://api.langflow.astra.datastax.com'
    const langflowToken = Deno.env.get('LANGFLOW_APPLICATION_TOKEN')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { user_id, message, coach_id, context } = await req.json() as ChatRequest

    // Validate inputs
    if (!user_id || !message) {
      throw new Error('Missing required fields: user_id and message')
    }

    // Get user profile with coach details
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles_with_coach_details')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    // Use provided coach_id or user's default coach
    const actualCoachId = coach_id || userProfile.coach_id

    // Get coach details if not in profile
    let coachDetails = userProfile.coach_details
    if (actualCoachId !== userProfile.coach_id) {
      const { data: coach } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', actualCoachId)
        .single()
      
      if (coach) {
        coachDetails = coach
      }
    }

    // Store user message
    const { data: userMessage, error: userMessageError } = await supabase
      .from('messages')
      .insert({
        user_id,
        coach_id: actualCoachId,
        role: 'user',
        content: message,
        content_type: 'text',
        metadata: context ? {
          ref_category_id: context.category_id,
          ref_checkin_id: context.checkin_id,
          ref_recommendation_id: context.recommendation_id
        } : {}
      })
      .select()
      .single()

    if (userMessageError) {
      throw new Error('Failed to store user message')
    }

    // Get conversation history (last 20 messages)
    const { data: conversationHistory } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user_id)
      .eq('content_type', 'text')
      .is('ref_checkin_id', null)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get additional context if provided
    let contextData: any = {}
    
    if (context?.category_id) {
      const { data: category } = await supabase
        .from('categories')
        .select('*')
        .eq('id', context.category_id)
        .single()
      contextData.category = category
    }

    if (context?.checkin_id) {
      const { data: checkin } = await supabase
        .from('user_checkins_summary')
        .select('*')
        .eq('id', context.checkin_id)
        .single()
      contextData.checkin = checkin
    }

    if (context?.recommendation_id) {
      const { data: recommendation } = await supabase
        .from('recommendations')
        .select('*')
        .eq('id', context.recommendation_id)
        .single()
      contextData.recommendation = recommendation
    }

    // Get user's wellness summary
    const { data: userSummary } = await supabase
      .from('user_profile_summary')
      .select('*')
      .eq('user_id', user_id)
      .single()

    // Prepare Langflow payload
    const langflowPayload = {
      input_value: {
        message,
        user: {
          id: user_id,
          name: userProfile.name,
          age: userProfile.birth_date ? 
            new Date().getFullYear() - new Date(userProfile.birth_date).getFullYear() : null,
          summary: userSummary
        },
        coach: {
          id: actualCoachId,
          name: coachDetails?.name,
          personality: coachDetails?.personality,
          voice: coachDetails?.voice
        },
        conversation_history: conversationHistory?.reverse() || [],
        context: contextData
      },
      output_type: 'chat_response',
      tweaks: {
        maintain_personality: true,
        include_actions: true,
        max_tokens: 500
      }
    }

    // For now, return mock response as Langflow stub
    // TODO: Replace with actual Langflow API call
    const mockResponse: LangflowResponse = {
      response: `I understand you're reaching out about ${context?.category_id ? 'this wellness area' : 'your wellness journey'}. ${message.toLowerCase().includes('help') ? "I'm here to support you." : "Thank you for sharing that with me."} Based on what you've shared, I encourage you to take small, consistent steps forward. Remember, progress is more important than perfection. How are you feeling about taking the next step?`,
      metadata: {
        tokens_used: 150,
        model: 'gpt-4',
        coach_personality: coachDetails?.personality || 'supportive'
      },
      suggested_actions: context?.category_id ? [
        {
          type: 'run_checkin',
          category_id: context.category_id,
          action_text: 'Would you like to do a check-in for this category?'
        }
      ] : []
    }

    // Store coach response
    const { data: coachMessage, error: coachMessageError } = await supabase
      .from('messages')
      .insert({
        user_id,
        coach_id: actualCoachId,
        role: 'assistant',
        content: mockResponse.response,
        content_type: 'text',
        metadata: {
          ...context,
          tokens_used: mockResponse.metadata?.tokens_used,
          model: mockResponse.metadata?.model,
          suggested_actions: mockResponse.suggested_actions
        }
      })
      .select()
      .single()

    if (coachMessageError) {
      console.error('Failed to store coach message:', coachMessageError)
    }

    // Return response
    return new Response(
      JSON.stringify({
        message_id: coachMessage?.id,
        response: mockResponse.response,
        coach: {
          id: actualCoachId,
          name: coachDetails?.name,
          voice: coachDetails?.voice
        },
        suggested_actions: mockResponse.suggested_actions,
        metadata: mockResponse.metadata
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in chat-completion-v2:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})