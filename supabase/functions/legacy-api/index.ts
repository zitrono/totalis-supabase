/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Parse the URL to determine which legacy endpoint to handle
    const url = new URL(req.url)
    const pathname = url.pathname

    // Parse request body
    const body = await req.json()

    let result;

    // Route to appropriate handler based on legacy endpoint
    if (pathname.endsWith('/api/user/recommendation/get')) {
      // Single recommendation endpoint
      const checkinId = body.checkin_id
      
      if (!checkinId) {
        return new Response(
          JSON.stringify({ error: 'checkin_id required' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      // Query recommendations directly from the table
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_id', checkinId)
        .eq('is_active', true)
        .is('dismissed_at', null)
        .is('parent_recommendation_id', null) // Only first-level
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) {
        console.error('Query error:', error)
      }

      // Transform to legacy format or generate mock data
      if (data && data.length > 0) {
        result = data.map((rec, index) => transformToLegacyFormat(rec, index + 1))
      } else {
        result = generateMockRecommendations(checkinId, 3)
      }

    } else if (pathname.endsWith('/api/user/recommendation/get_all')) {
      // Multiple recommendations endpoint
      const checkins = body.checkins || []
      const checkinIds = checkins.map((c: any) => c.checkin_id).filter(Boolean)

      if (checkinIds.length === 0) {
        return new Response(
          JSON.stringify([]),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      // Query recommendations for multiple checkins
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', user.id)
        .in('checkin_id', checkinIds)
        .eq('is_active', true)
        .is('dismissed_at', null)
        .is('parent_recommendation_id', null) // Only first-level
        .order('checkin_id')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Query error:', error)
      }

      // Transform to legacy format or generate mock data
      if (data && data.length > 0) {
        result = data.map((rec, index) => transformToLegacyFormat(rec, index + 1))
      } else {
        result = checkinIds.flatMap((id: string) => generateMockRecommendations(id, 1))
      }

    } else if (pathname.endsWith('/api/user/recommendation/second/get_all')) {
      // Second-level recommendations endpoint
      const checkins = body.checkins || []
      const checkinIds = checkins.map((c: any) => c.checkin_id).filter(Boolean)

      if (checkinIds.length === 0) {
        return new Response(
          JSON.stringify([]),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      // Query second-level recommendations
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', user.id)
        .in('checkin_id', checkinIds)
        .eq('is_active', true)
        .is('dismissed_at', null)
        .not('parent_recommendation_id', 'is', null) // Only second-level
        .order('checkin_id')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Query error:', error)
      }

      // Transform to legacy format or generate mock data
      if (data && data.length > 0) {
        result = data.map((rec, index) => transformToLegacyFormat(rec, index + 1, true))
      } else {
        result = checkinIds.flatMap((id: string) => generateMockRecommendations(id, 2, true))
      }

    } else {
      return new Response(
        JSON.stringify({ error: 'Unknown endpoint' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Legacy API error:', error)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Transform database recommendation to legacy format
function transformToLegacyFormat(rec: any, order: number, isSecond: boolean = false): any {
  return {
    type: rec.recommendation_type || 'action',
    id: rec.id,
    title: rec.title || `Recommendation ${order}`,
    insight: rec.recommendation_text,
    why: rec.why || "Research shows this approach is effective",
    action: rec.action || "Take action on this recommendation",
    icon_id: rec.category_id ? Math.abs(rec.category_id.charCodeAt(0)) % 10 + 1 : 1,
    order: order,
    importance: rec.importance || 3,
    primary_color: isSecond ? '#FF6B6B' : '#5B9EF7',
    time_create: rec.created_at,
    categoryItem: rec.category_id ? {
      id: rec.category_id,
      name: `Category`,
      icon_id: Math.abs(rec.category_id.charCodeAt(0)) % 10 + 1,
      color: '#5B9EF7'
    } : null,
    isSecondType: isSecond,
    parent_id: rec.parent_recommendation_id,
    checkin_id: rec.checkin_id,
    category_id: rec.category_id,
    relevance: rec.relevance ? rec.relevance.toString() : "0.75",
    description: rec.context || "Based on your check-in",
    isChecked: false
  }
}

// Generate mock recommendations in the legacy format
function generateMockRecommendations(checkinId: string, count: number = 1, isSecond: boolean = false): any[] {
  const recommendations = []
  
  for (let i = 0; i < count; i++) {
    recommendations.push({
      type: isSecond ? 'action' : 'category',
      id: crypto.randomUUID(),
      title: isSecond ? `Follow-up Action ${i + 1}` : `Recommendation ${i + 1}`,
      insight: isSecond 
        ? "Based on your progress, here's a specific action to take"
        : "This recommendation can help improve your daily routine",
      why: "Research shows this approach is effective for building positive habits",
      action: isSecond
        ? "Take 5 minutes to implement this specific technique"
        : "Explore this category to find activities that resonate with you",
      icon_id: Math.floor(Math.random() * 10) + 1,
      order: i + 1,
      importance: isSecond ? 4 : 3,
      primary_color: isSecond ? '#FF6B6B' : '#5B9EF7',
      time_create: new Date().toISOString(),
      categoryItem: isSecond ? null : {
        id: crypto.randomUUID(),
        name: `Category ${i + 1}`,
        icon_id: Math.floor(Math.random() * 10) + 1,
        color: '#5B9EF7'
      },
      isSecondType: isSecond,
      parent_id: isSecond ? crypto.randomUUID() : null,
      checkin_id: checkinId,
      category_id: isSecond ? null : crypto.randomUUID(),
      relevance: isSecond ? "0.85" : "0.75",
      description: "Generated recommendation based on your check-in",
      isChecked: false
    })
  }
  
  return recommendations
}