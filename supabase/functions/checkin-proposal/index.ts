import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface ProposalRequest {
  user_id: string
  coach_id?: string
  context?: string
}

interface LangflowResponse {
  proposal: {
    category_id: string
    category_name: string
    rationale: string
    urgency: 'low' | 'medium' | 'high'
    personalized_message: string
  }
  metadata?: {
    analysis_factors: string[]
    confidence_score: number
  }
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
    const { user_id, coach_id, context } = await req.json() as ProposalRequest

    // Validate inputs
    if (!user_id) {
      throw new Error('Missing required field: user_id')
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

    // Get user's check-in history and patterns
    const { data: userSummary } = await supabase
      .from('user_profile_summary')
      .select('*')
      .eq('user_id', user_id)
      .single()

    // Get recent check-ins across categories
    const { data: recentCheckins } = await supabase
      .from('user_checkins_summary')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get categories with check-in gaps (not checked in recently)
    const { data: allCategories } = await supabase
      .from('user_categories_with_details')
      .select('*')
      .eq('user_id', user_id)
      .order('last_checkin_at', { ascending: true, nullsFirst: true })

    // Get active recommendations to understand current focus areas
    const { data: activeRecommendations } = await supabase
      .from('active_recommendations_with_details')
      .select('*')
      .eq('user_id', user_id)
      .order('importance', { ascending: false })
      .limit(5)

    // Analyze patterns for Langflow
    const checkinPatterns = {
      total_categories: allCategories?.length || 0,
      categories_with_gaps: allCategories?.filter(c => {
        if (!c.last_checkin_at) return true
        const daysSinceCheckin = Math.floor(
          (Date.now() - new Date(c.last_checkin_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysSinceCheckin > 7
      }).map(c => ({
        category_id: c.category_id,
        category_name: c.category_name,
        last_checkin: c.last_checkin_at,
        days_since: c.last_checkin_at ? 
          Math.floor((Date.now() - new Date(c.last_checkin_at).getTime()) / (1000 * 60 * 60 * 24)) : 
          null
      })) || [],
      recent_activity: recentCheckins?.map(c => ({
        category_name: c.category_name,
        wellness_level: c.level,
        created_at: c.created_at
      })) || [],
      active_focus_areas: activeRecommendations?.map(r => r.category_name) || []
    }

    // Prepare Langflow payload
    const langflowPayload = {
      input_value: {
        user: {
          id: user_id,
          name: userProfile.name,
          summary: userSummary
        },
        coach: userProfile.coach_details,
        patterns: checkinPatterns,
        context: context || 'proactive_suggestion',
        current_time: new Date().toISOString()
      },
      output_type: 'checkin_proposal',
      tweaks: {
        prioritize_gaps: true,
        consider_wellness_connections: true,
        personalize_message: true
      }
    }

    // For now, return mock response as Langflow stub
    // TODO: Replace with actual Langflow API call
    
    // Select a category with the longest gap
    const categoryWithGap = checkinPatterns.categories_with_gaps[0]
    
    const mockResponse: LangflowResponse = {
      proposal: {
        category_id: categoryWithGap?.category_id || allCategories?.[0]?.category_id || '',
        category_name: categoryWithGap?.category_name || allCategories?.[0]?.category_name || 'Wellness',
        rationale: `It's been ${categoryWithGap?.days_since || 'some time'} since your last check-in for ${categoryWithGap?.category_name || 'this area'}. Regular check-ins help maintain awareness and progress.`,
        urgency: categoryWithGap?.days_since && categoryWithGap.days_since > 14 ? 'high' : 'medium',
        personalized_message: `Hi ${userProfile.name || 'there'}! I noticed it might be helpful to check in on your ${categoryWithGap?.category_name || 'wellness'}. Taking a few minutes to reflect on this area could provide valuable insights for your journey. Would you like to start a quick check-in?`
      },
      metadata: {
        analysis_factors: [
          'time_since_last_checkin',
          'category_importance',
          'recent_patterns',
          'active_recommendations'
        ],
        confidence_score: 0.85
      }
    }

    // Store the proposal for caching (BR-PROP-003)
    const { error: proposalError } = await supabase
      .from('messages')
      .insert({
        user_id,
        coach_id: coach_id || userProfile.coach_id,
        role: 'assistant',
        content: mockResponse.proposal.personalized_message,
        content_type: 'text',
        metadata: {
          proposal_type: 'checkin',
          proposed_category_id: mockResponse.proposal.category_id,
          proposal_data: mockResponse.proposal,
          analysis_metadata: mockResponse.metadata
        }
      })

    if (proposalError) {
      console.error('Failed to store proposal:', proposalError)
    }

    // Return response
    return new Response(
      JSON.stringify({
        proposal: mockResponse.proposal,
        metadata: mockResponse.metadata
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in checkin-proposal:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})