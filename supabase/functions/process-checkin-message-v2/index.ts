import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface ProcessMessageRequest {
  ref_checkin_id: string
  user_id: string
  message: string
  answer_type?: 'text' | 'scale' | 'radio' | 'checkbox'
  answer_value?: any
  question_index: number
}

interface LangflowResponse {
  next_question?: {
    text: string
    type: 'text' | 'scale' | 'radio' | 'checkbox'
    options?: string[]
    scale_min?: number
    scale_max?: number
  }
  is_complete: boolean
  summary?: string
  insight?: string
  wellness_level?: number
  recommendations?: Array<{
    type: 'first' | 'second'
    title?: string
    action?: string
    insight?: string
    why?: string
    importance: number
    relevance?: string
    recommended_categories?: string[]
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
    const { 
      checkin_id, 
      user_id, 
      message, 
      answer_type, 
      answer_value,
      question_index 
    } = await req.json() as ProcessMessageRequest

    // Validate inputs
    if (!checkin_id || !user_id || (!message && answer_value === undefined)) {
      throw new Error('Missing required fields')
    }

    // Get check-in details with messages
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .select(`
        *,
        categories (
          id,
          name,
          description,
          max_questions
        ),
        messages (
          id,
          role,
          content,
          metadata,
          created_at
        )
      `)
      .eq('id', checkin_id)
      .single()

    if (checkinError || !checkin) {
      throw new Error('Check-in not found')
    }

    // Verify ownership
    if (checkin.user_id !== user_id) {
      throw new Error('Unauthorized')
    }

    // Store user's answer
    const { error: answerError } = await supabase
      .from('messages')
      .insert({
        user_id,
        ref_checkin_id: checkin_id,
        role: 'user',
        content: message || String(answer_value),
        content_type: 'checkin',
        metadata: {
          answer_type: answer_type || 'text',
          answer_value,
          question_index
        }
      })

    if (answerError) {
      throw new Error('Failed to store answer')
    }

    // Update questions in check-in
    const updatedQuestions = {
      ...checkin.questions,
      [`q${question_index}`]: {
        answer: message || answer_value,
        type: answer_type || 'text',
        answered_at: new Date().toISOString()
      }
    }

    await supabase
      .from('checkins')
      .update({ questions: updatedQuestions })
      .eq('id', checkin_id)

    // Prepare context for Langflow
    const conversationHistory = checkin.messages
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m: any) => ({
        role: m.role,
        content: m.content,
        metadata: m.metadata
      }))

    // Call Langflow to process answer and get next question
    // This is a stub - actual Langflow integration will be implemented
    const langflowPayload = {
      input_value: {
        checkin_id,
        category: checkin.categories,
        current_answer: {
          text: message || String(answer_value),
          type: answer_type || 'text',
          value: answer_value,
          question_index
        },
        conversation_history: conversationHistory,
        questions_answered: question_index + 1,
        max_questions: checkin.categories.max_questions || 10
      },
      output_type: 'checkin_continuation',
      tweaks: {
        generate_recommendations: true,
        calculate_wellness_level: true
      }
    }

    // For now, return mock response as Langflow stub
    // TODO: Replace with actual Langflow API call
    const isLastQuestion = question_index + 1 >= (checkin.categories.max_questions || 10)
    
    const mockResponse: LangflowResponse = {
      is_complete: isLastQuestion,
      ...(isLastQuestion ? {
        summary: `Based on our conversation about ${checkin.categories.name}, I can see that you're making progress in understanding your patterns.`,
        insight: `Your responses indicate a growing awareness of how ${checkin.categories.name.toLowerCase()} impacts your daily life.`,
        wellness_level: 7.5,
        recommendations: [
          {
            type: 'first',
            title: `Daily ${checkin.categories.name} Practice`,
            action: 'Set aside 10 minutes each morning for a brief check-in with yourself',
            insight: 'Regular self-reflection helps maintain awareness',
            why: 'Consistency in self-monitoring leads to better outcomes',
            importance: 8
          },
          {
            type: 'second',
            relevance: `Your ${checkin.categories.name.toLowerCase()} patterns may be influenced by your sleep quality`,
            recommended_categories: ['sleep_and_rest'],
            importance: 6
          }
        ]
      } : {
        next_question: {
          text: `Based on what you shared, can you tell me more about specific situations where this affects you?`,
          type: 'text'
        }
      })
    }

    // If check-in is complete, update the record
    if (mockResponse.is_complete) {
      const { error: updateError } = await supabase
        .from('checkins')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          summary: mockResponse.summary,
          insight: mockResponse.insight,
          level: mockResponse.wellness_level
        })
        .eq('id', checkin_id)

      if (updateError) {
        console.error('Failed to update check-in:', updateError)
      }

      // Create recommendations
      if (mockResponse.recommendations) {
        for (const rec of mockResponse.recommendations) {
          const { error: recError } = await supabase
            .from('recommendations')
            .insert({
              user_id,
              category_id: checkin.categories.id,
              checkin_message_id: null, // Link to last message if needed
              recommendation_type: rec.type,
              title: rec.title || null,
              action: rec.action || null,
              recommendation_text: rec.insight || null,
              why: rec.why || null,
              importance: rec.importance,
              relevance: rec.relevance || null,
              recommended_categories: rec.recommended_categories || null,
              is_active: true,
              context: 'checkin_completion'
            })

          if (recError) {
            console.error('Failed to create recommendation:', recError)
          }
        }
      }
    } else if (mockResponse.next_question) {
      // Store next question
      const { error: questionError } = await supabase
        .from('messages')
        .insert({
          user_id,
          ref_checkin_id: checkin_id,
          role: 'assistant',
          content: mockResponse.next_question.text,
          content_type: 'checkin',
          metadata: {
            question_type: mockResponse.next_question.type,
            question_options: mockResponse.next_question.options,
            scale_min: mockResponse.next_question.scale_min,
            scale_max: mockResponse.next_question.scale_max,
            question_index: question_index + 1,
            total_questions: checkin.categories.max_questions || 10
          }
        })

      if (questionError) {
        console.error('Failed to store next question:', questionError)
      }
    }

    // Return response
    return new Response(
      JSON.stringify({
        checkin_id,
        is_complete: mockResponse.is_complete,
        ...(mockResponse.is_complete ? {
          summary: mockResponse.summary,
          insight: mockResponse.insight,
          wellness_level: mockResponse.wellness_level,
          recommendations_count: mockResponse.recommendations?.length || 0
        } : {
          next_question: mockResponse.next_question,
          question_index: question_index + 1,
          total_questions: checkin.categories.max_questions || 10
        })
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in process-checkin-message-v2:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})