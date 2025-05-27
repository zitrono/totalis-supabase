import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface CheckinRequest {
  action: 'start' | 'complete' | 'answer' | 'abandon'
  category_id?: string
  checkin_id?: string
  question_id?: string
  answer?: any
  proposals?: any
}

interface CheckinQuestion {
  id: string
  text: string
  type: 'text' | 'number' | 'boolean' | 'scale' | 'multiple_choice'
  options?: string[]
  min?: number
  max?: number
  required?: boolean
}

// Helper function to normalize parameters from camelCase to snake_case
function normalizeParams(params: any): any {
  const normalized: any = {};
  for (const [key, value] of Object.entries(params)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
    normalized[snakeKey] = value;
    // Keep original key too for compatibility
    normalized[key] = value;
  }
  return normalized;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const rawBody = await req.json()
    // Normalize parameters to handle both camelCase and snake_case
    const body: CheckinRequest = normalizeParams(rawBody)
    const { action } = body

    let result

    switch (action) {
      case 'start':
        result = await startCheckin(supabase, user.id, body)
        break
      
      case 'answer':
        result = await submitAnswer(supabase, user.id, body)
        break
      
      case 'complete':
        result = await completeCheckin(supabase, user.id, body)
        break
        
      case 'abandon':
        result = await abandonCheckin(supabase, user.id, body)
        break
      
      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Check-in process error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function startCheckin(supabase: any, userId: string, body: CheckinRequest) {
  const { category_id } = body
  
  if (!category_id) {
    throw new Error('category_id is required')
  }

  // Use the new RPC function to handle resume logic
  const { data: checkinData, error: rpcError } = await supabase
    .rpc('resume_or_create_checkin', {
      category_id_param: category_id,
      coach_id_param: null
    })

  if (rpcError) {
    console.error('Resume or create checkin error:', rpcError)
    throw new Error(rpcError.message || 'Failed to start checkin')
  }

  // Get full checkin details if resumed
  if (checkinData.resumed) {
    const { data: checkin } = await supabase
      .from('checkins')
      .select('*')
      .eq('id', checkinData.checkin_id)
      .single()

    return {
      checkin: {
        id: checkinData.checkin_id,
        status: 'in_progress',
        category_id: category_id,
        coach_id: checkin?.coach_id,
        created_at: checkin?.created_at || new Date().toISOString()
      },
      questions: checkinData.questions,
      resumed: true,
      current_question_index: checkinData.current_question_index,
      answers: checkinData.answers
    }
  }

  // Return new checkin data
  return {
    checkin: {
      id: checkinData.checkin_id,
      status: 'in_progress',
      category_id: category_id,
      coach_id: null, // Will be set by RPC function
      created_at: new Date().toISOString()
    },
    questions: checkinData.questions,
    resumed: false,
    current_question_index: 0,
    answers: []
  }
}

async function submitAnswer(supabase: any, userId: string, body: CheckinRequest) {
  const { checkin_id, question_id, answer } = body
  
  if (!checkin_id || !question_id || answer === undefined) {
    throw new Error('checkin_id, question_id, and answer are required')
  }

  // Verify checkin belongs to user and is in progress
  const { data: checkin, error: checkError } = await supabase
    .from('checkins')
    .select('id, metadata')
    .eq('id', checkin_id)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .single()

  if (checkError || !checkin) {
    throw new Error('Invalid or completed checkin')
  }

  // Get question details from template
  const questions = checkin.metadata?.template_questions || []
  const question = questions.find((q: CheckinQuestion) => q.id === question_id)
  
  if (!question) {
    throw new Error('Invalid question_id')
  }

  // Validate answer based on question type
  validateAnswer(question, answer)

  // Store answer
  const { error: insertError } = await supabase
    .from('checkin_answers')
    .insert({
      checkin_id: checkin_id,
      question_id: question_id,
      question_text: question.text,
      answer: { value: answer },
      answer_type: question.type
    })

  if (insertError) {
    throw new Error('Failed to save answer')
  }

  // Get all answered questions
  const { data: answeredQuestions } = await supabase
    .from('checkin_answers')
    .select('question_id, answer')
    .eq('checkin_id', checkin_id)

  const answeredIds = answeredQuestions?.map((a: any) => a.question_id) || []
  const answers = answeredQuestions?.map((a: any) => ({
    question_id: a.question_id,
    answer: a.answer.value
  })) || []
  
  // Find current question index
  const currentQuestionIndex = questions.findIndex((q: CheckinQuestion) => 
    !answeredIds.includes(q.id)
  )
  
  // Save progress
  await supabase.rpc('save_checkin_progress', {
    checkin_id_param: checkin_id,
    question_index_param: currentQuestionIndex === -1 ? questions.length : currentQuestionIndex,
    answers_param: answers
  })
  
  const remainingQuestions = questions.filter((q: CheckinQuestion) => 
    !answeredIds.includes(q.id)
  )

  return {
    success: true,
    remaining_questions: remainingQuestions.length,
    next_question: remainingQuestions[0] || null
  }
}

async function completeCheckin(supabase: any, userId: string, body: CheckinRequest) {
  const { checkin_id, proposals } = body
  
  if (!checkin_id) {
    throw new Error('checkin_id is required')
  }

  // Verify checkin belongs to user and is in progress
  const { data: checkin, error: checkError } = await supabase
    .from('checkins')
    .select('id, category_id')
    .eq('id', checkin_id)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .single()

  if (checkError || !checkin) {
    throw new Error('Invalid or already completed checkin')
  }

  // Update checkin status
  const { error: updateError } = await supabase
    .from('checkins')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      proposals: proposals || null
    })
    .eq('id', checkin_id)

  if (updateError) {
    throw new Error('Failed to complete checkin')
  }
  
  // Update progress status
  await supabase
    .from('checkin_progress')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('checkin_id', checkin_id)
    .eq('user_id', userId)

  // Generate recommendations if proposals provided
  if (proposals && Array.isArray(proposals)) {
    for (const proposal of proposals) {
      await supabase
        .from('recommendations')
        .insert({
          user_id: userId,
          category_id: checkin.category_id,
          title: proposal.title,
          content: proposal.content,
          level: 1,
          metadata: {
            source: 'checkin',
            checkin_id: checkin_id
          }
        })
    }
  }

  // Get recommendations that were created
  const { data: recommendations } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', checkin.category_id)
    .eq('metadata->>checkin_id', checkin_id)
    .order('created_at', { ascending: false })

  // Return in format expected by mobile app
  return {
    success: true,
    checkin_id: checkin_id,
    completed_at: new Date().toISOString(),
    recommendations: recommendations || [],
    insights: {
      total_questions_answered: proposals?.length || 0,
      category_id: checkin.category_id
    }
  }
}

async function abandonCheckin(supabase: any, userId: string, body: CheckinRequest) {
  const { checkin_id } = body
  
  if (!checkin_id) {
    throw new Error('checkin_id is required')
  }

  const { error: updateError } = await supabase
    .from('checkins')
    .update({
      status: 'abandoned',
      completed_at: new Date().toISOString()
    })
    .eq('id', checkin_id)
    .eq('user_id', userId)
    .eq('status', 'in_progress')

  if (updateError) {
    throw new Error('Failed to abandon checkin')
  }

  return {
    success: true,
    checkin_id: checkin_id
  }
}

function validateAnswer(question: CheckinQuestion, answer: any) {
  switch (question.type) {
    case 'boolean':
      if (typeof answer !== 'boolean') {
        throw new Error('Answer must be true or false')
      }
      break
    
    case 'number':
    case 'scale':
      if (typeof answer !== 'number') {
        throw new Error('Answer must be a number')
      }
      if (question.min !== undefined && answer < question.min) {
        throw new Error(`Answer must be at least ${question.min}`)
      }
      if (question.max !== undefined && answer > question.max) {
        throw new Error(`Answer must be at most ${question.max}`)
      }
      break
    
    case 'multiple_choice':
      if (question.options && !question.options.includes(answer)) {
        throw new Error('Invalid option selected')
      }
      break
    
    case 'text':
      if (typeof answer !== 'string' || answer.trim() === '') {
        throw new Error('Answer must be non-empty text')
      }
      break
  }
}