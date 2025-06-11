import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'
import { LangflowQuestionResponse } from '../_shared/types.ts'

interface StartCheckinRequest {
  category_id: string
  user_id: string
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
    const { category_id, user_id } = await req.json() as StartCheckinRequest

    // Validate inputs
    if (!category_id || !user_id) {
      throw new Error('Missing required fields: category_id and user_id')
    }

    // Get category details
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', category_id)
      .single()

    if (categoryError || !category) {
      throw new Error('Category not found')
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

    // Get user's check-in history for this category
    const { data: previousCheckins } = await supabase
      .from('checkins')
      .select('id, level, summary, created_at')
      .eq('user_id', user_id)
      .eq('category_id', category_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5)

    // Create new check-in record
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .insert({
        user_id,
        category_id,
        status: 'in_progress',
        questions: {}, // Will be populated as questions are answered
        metadata: {
          coach_id: userProfile.coach_id,
          coach_name: userProfile.coach_details?.name,
          category_name: category.name
        }
      })
      .select()
      .single()

    if (checkinError || !checkin) {
      throw new Error('Failed to create check-in')
    }

    // Call Langflow to generate questions
    // This is a stub - actual Langflow integration will be implemented
    const langflowPayload = {
      input_value: {
        category: {
          id: category.id,
          name: category.name,
          description: category.description
        },
        user: {
          id: user_id,
          name: userProfile.name,
          age: userProfile.birth_date ? 
            new Date().getFullYear() - new Date(userProfile.birth_date).getFullYear() : null,
          previous_checkins: previousCheckins || [],
          wellness_level: previousCheckins?.[0]?.level || null
        },
        coach: userProfile.coach_details || {},
        context: 'checkin_start'
      },
      output_type: 'questions',
      tweaks: {
        max_questions: category.max_questions || 10,
        question_types: ['text', 'scale', 'radio', 'checkbox']
      }
    }

    // For now, return mock questions as Langflow stub
    // TODO: Replace with actual Langflow API call
    const mockQuestions: LangflowQuestionResponse = {
      questions: [
        {
          text: `How are you feeling about your ${category.name.toLowerCase()} today?`,
          type: 'scale',
          scale_min: 1,
          scale_max: 10
        },
        {
          text: `What aspects of ${category.name.toLowerCase()} would you like to explore?`,
          type: 'checkbox',
          options: ['Physical symptoms', 'Emotional state', 'Daily habits', 'Relationships', 'Other']
        },
        {
          text: 'Tell me more about what brings you here today.',
          type: 'text'
        }
      ],
      session_id: checkin.id
    }

    // Store first question in messages
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id,
        ref_checkin_id: checkin.id,
        role: 'assistant',
        content: mockQuestions.questions[0].text,
        content_type: 'checkin',
        metadata: {
          question_type: mockQuestions.questions[0].type,
          question_options: mockQuestions.questions[0].options,
          scale_min: mockQuestions.questions[0].scale_min,
          scale_max: mockQuestions.questions[0].scale_max,
          question_index: 0,
          total_questions: mockQuestions.questions.length
        }
      })

    if (messageError) {
      console.error('Failed to store question:', messageError)
    }

    // Return response
    return new Response(
      JSON.stringify({
        checkin_id: checkin.id,
        category_id: category.id,
        category_name: category.name,
        current_question: mockQuestions.questions[0],
        total_questions: mockQuestions.questions.length,
        session_id: mockQuestions.session_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in start-checkin-v2:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})