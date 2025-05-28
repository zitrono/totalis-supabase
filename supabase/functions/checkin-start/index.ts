/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from "../_shared/cors.ts"
import { extractTestMetadata, mergeTestMetadata } from "../_shared/test-data.ts"
import { createMonitoringContext } from "../_shared/monitoring.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const testMetadata = extractTestMetadata(req)
  const monitoring = createMonitoringContext('checkin-start', testMetadata)
  
  try {
    // Get auth token
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
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const { categoryId } = await req.json()
    
    // Track function start
    monitoring.trackStart(user.id)

    // Verify category exists
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
    const { data: checkIn, error: checkInError } = await supabase
      .from('checkins')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        status: 'in_progress',
        metadata: mergeTestMetadata({}, testMetadata)
      })
      .select()
      .single()

    if (checkInError) {
      throw checkInError
    }

    // Get user's recent check-ins for context
    const { data: recentCheckins } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(3)

    // Generate initial questions based on category
    const questions = generateInitialQuestions(category, recentCheckins || [])

    // Create initial message
    const { data: message } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        role: 'assistant',
        content: questions[0],
        content_type: 'checkin',
        metadata: mergeTestMetadata({
          type: 'start',
          checkin_id: checkIn.id,
          question_number: 1
        }, testMetadata)
      })
      .select()
      .single()

    // Track success
    monitoring.trackSuccess(user.id, {
      category_id: categoryId,
      checkin_id: checkIn.id,
      questions_count: questions.length
    })

    return new Response(
      JSON.stringify({
        checkIn,
        questions,
        currentQuestion: questions[0],
        message,
        category: {
          id: category.id,
          name: category.name,
          max_questions: category.max_questions || 5
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    monitoring.trackError(error as Error, user?.id)
    console.error('Check-in start error:', error)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function generateInitialQuestions(category: any, recentCheckins: any[]): string[] {
  // Mock questions based on category
  const questionSets: Record<string, string[]> = {
    'Physical Health': [
      "How would you rate your physical energy today on a scale of 1-10?",
      "What physical activities have you done recently?",
      "Are there any physical discomforts you're experiencing?"
    ],
    'Mental Health': [
      "How are you feeling emotionally right now?",
      "What's been on your mind lately?",
      "How would you describe your stress levels today?"
    ],
    'Social Wellness': [
      "How connected do you feel to others today?",
      "Have you had any meaningful interactions recently?",
      "Is there anything in your relationships you'd like to improve?"
    ],
    'Personal Growth': [
      "What progress have you made toward your goals recently?",
      "What's one thing you've learned about yourself lately?",
      "What area of growth feels most important right now?"
    ]
  }

  // Default questions if category not found
  const defaultQuestions = [
    `How are you doing with ${category.name} today?`,
    "What's been going well in this area?",
    "What challenges are you facing?",
    "What would help you feel better about this?"
  ]

  const questions = questionSets[category.name] || defaultQuestions

  // Add personalization based on recent check-ins
  if (recentCheckins.length > 0) {
    const lastCheckin = recentCheckins[0]
    if (lastCheckin.wellness_level && lastCheckin.wellness_level < 5) {
      questions.unshift("I noticed things were challenging last time. How are you feeling now?")
    }
  }

  return questions.slice(0, category.max_questions || 5)
}