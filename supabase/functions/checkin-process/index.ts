import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Types
interface CheckinStartRequest {
  categoryId: string
  action: 'start'
}

interface CheckinCompleteRequest {
  checkinId: string
  answers: Record<string, string>
  action: 'complete'
}

type CheckinRequest = CheckinStartRequest | CheckinCompleteRequest

interface CheckinQuestion {
  id: string
  question: string
  type: 'text' | 'scale' | 'multiple_choice'
  options?: string[]
  required: boolean
}

interface CheckinStartResponse {
  checkin: {
    id: string
    category_id: string
    status: string
    created_at: string
  }
  questions: CheckinQuestion[]
}

interface CheckinCompleteResponse {
  recommendations: Array<{
    id: string
    title: string
    recommendation_text: string
    action: string
    why: string
    category_id: string
    importance: number
  }>
  insights: {
    summary: string
    wellness_level: number
    key_themes: string[]
  }
}

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
        JSON.stringify({ error: 'Authorization required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Get authenticated user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
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
    const body = await req.json() as CheckinRequest
    
    // Handle start action
    if (body.action === 'start') {
      return handleStartCheckin(supabase, user.id, body.categoryId)
    }
    
    // Handle complete action
    if (body.action === 'complete') {
      return handleCompleteCheckin(supabase, user.id, body.checkinId, body.answers)
    }
    
    // Invalid action
    return new Response(
      JSON.stringify({ error: 'Invalid action. Must be "start" or "complete"' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
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

async function handleStartCheckin(
  supabase: any, 
  userId: string, 
  categoryId: string
): Promise<Response> {
  // Get category info
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single()
    
  if (categoryError || !category) {
    return new Response(
      JSON.stringify({ error: 'Category not found' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    )
  }
  
  // Create check-in record
  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .insert({
      user_id: userId,
      category_id: categoryId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      metadata: {}
    })
    .select()
    .single()
    
  if (checkinError) {
    console.error('Error creating check-in:', checkinError)
    return new Response(
      JSON.stringify({ error: 'Failed to create check-in' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  
  // Generate questions based on category (mocked for now)
  const questions = await generateCheckinQuestions(category, userId)
  
  const response: CheckinStartResponse = {
    checkin: {
      id: checkin.id,
      category_id: checkin.category_id,
      status: checkin.status,
      created_at: checkin.started_at
    },
    questions
  }
  
  return new Response(
    JSON.stringify(response),
    { 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    }
  )
}

async function handleCompleteCheckin(
  supabase: any,
  userId: string,
  checkinId: string,
  answers: Record<string, string>
): Promise<Response> {
  // Verify check-in exists and belongs to user
  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .select('*')
    .eq('id', checkinId)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .single()
    
  if (checkinError || !checkin) {
    return new Response(
      JSON.stringify({ error: 'Check-in not found or already completed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    )
  }
  
  // Process answers and generate insights (mocked for now)
  const insights = await processCheckinAnswers(answers, checkin.category_id)
  
  // Update check-in with completion data
  const { error: updateError } = await supabase
    .from('checkins')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      wellness_level: insights.wellness_level,
      summary: insights.summary,
      answers: answers,
      metadata: {
        key_themes: insights.key_themes
      }
    })
    .eq('id', checkinId)
    
  if (updateError) {
    console.error('Error updating check-in:', updateError)
    return new Response(
      JSON.stringify({ error: 'Failed to complete check-in' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  
  // Generate recommendations based on insights
  const recommendations = await generateRecommendations(
    userId,
    checkin.category_id,
    checkinId,
    insights
  )
  
  // Save recommendations to database
  if (recommendations.length > 0) {
    const { error: recError } = await supabase
      .from('recommendations')
      .insert(
        recommendations.map(rec => ({
          ...rec,
          user_id: userId,
          checkin_id: checkinId,
          category_id: checkin.category_id,
          is_active: true,
          created_at: new Date().toISOString()
        }))
      )
      
    if (recError) {
      console.error('Error saving recommendations:', recError)
    }
  }
  
  const response: CheckinCompleteResponse = {
    recommendations,
    insights
  }
  
  return new Response(
    JSON.stringify(response),
    { 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    }
  )
}

// Generate check-in questions based on category
async function generateCheckinQuestions(
  category: any,
  userId: string
): Promise<CheckinQuestion[]> {
  // TODO: Replace with AI-generated questions based on category and user history
  
  const baseQuestions: CheckinQuestion[] = [
    {
      id: 'wellness_level',
      question: `On a scale of 1-10, how would you rate your ${category.name} today?`,
      type: 'scale',
      required: true
    },
    {
      id: 'current_state',
      question: `What's happening with your ${category.name} right now?`,
      type: 'text',
      required: true
    },
    {
      id: 'challenges',
      question: 'What challenges are you facing?',
      type: 'text',
      required: true
    },
    {
      id: 'support_needed',
      question: 'What kind of support would be most helpful?',
      type: 'multiple_choice',
      options: [
        'Practical tips',
        'Emotional support',
        'Accountability',
        'Resources',
        'Just someone to listen'
      ],
      required: true
    },
    {
      id: 'next_step',
      question: 'What\'s one small step you could take today?',
      type: 'text',
      required: false
    }
  ]
  
  // Customize questions based on category prompts if available
  if (category.prompt_checkin) {
    baseQuestions[1].question = category.prompt_checkin
  }
  if (category.prompt_checkin_2) {
    baseQuestions.splice(2, 0, {
      id: 'category_specific',
      question: category.prompt_checkin_2,
      type: 'text',
      required: true
    })
  }
  
  return baseQuestions
}

// Process check-in answers and generate insights
async function processCheckinAnswers(
  answers: Record<string, string>,
  categoryId: string
): Promise<{
  summary: string
  wellness_level: number
  key_themes: string[]
}> {
  // TODO: Replace with AI analysis of answers
  
  const wellnessLevel = parseInt(answers.wellness_level) || 5
  
  // Mock insights based on wellness level
  let summary = ''
  let key_themes: string[] = []
  
  if (wellnessLevel >= 7) {
    summary = 'You\'re doing well! Your responses show positive progress and good self-awareness.'
    key_themes = ['strength', 'progress', 'self-care']
  } else if (wellnessLevel >= 4) {
    summary = 'You\'re managing, but there\'s room for improvement. Your honesty about challenges is a great first step.'
    key_themes = ['awareness', 'balance', 'growth']
  } else {
    summary = 'You\'re going through a tough time. Remember that seeking support is a sign of strength.'
    key_themes = ['support', 'compassion', 'small-steps']
  }
  
  return {
    summary,
    wellness_level: wellnessLevel,
    key_themes
  }
}

// Generate personalized recommendations
async function generateRecommendations(
  userId: string,
  categoryId: string,
  checkinId: string,
  insights: any
): Promise<Array<{
  title: string
  recommendation_text: string
  action: string
  why: string
  recommendation_type: string
  importance: number
}>> {
  // TODO: Replace with AI-generated recommendations
  
  const recommendations = []
  
  // Generate recommendations based on wellness level and themes
  if (insights.wellness_level < 4) {
    recommendations.push({
      title: 'Reach out for support',
      recommendation_text: 'Consider talking to a friend, family member, or professional about what you\'re experiencing.',
      action: 'Schedule a conversation with someone you trust',
      why: 'Connection and support are essential when we\'re struggling',
      recommendation_type: 'action',
      importance: 5
    })
  }
  
  if (insights.key_themes.includes('self-care')) {
    recommendations.push({
      title: 'Celebrate your progress',
      recommendation_text: 'Take a moment to acknowledge how far you\'ve come.',
      action: 'Write down three things you\'re proud of',
      why: 'Recognizing progress reinforces positive patterns',
      recommendation_type: 'action',
      importance: 3
    })
  }
  
  // Always add at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Continue your wellness journey',
      recommendation_text: 'Keep checking in regularly to track your progress.',
      action: 'Set a reminder for your next check-in',
      why: 'Consistent check-ins help maintain awareness and growth',
      recommendation_type: 'action',
      importance: 2
    })
  }
  
  return recommendations
}