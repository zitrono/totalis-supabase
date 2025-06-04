/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { createMonitoringContext } from "../_shared/monitoring.ts";

interface RecommendationRequest {
  count?: number;
  category_id?: string;
  context_type?: "general" | "category" | "checkin";
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const monitoring = createMonitoringContext("recommendations");

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Create Supabase client with service key for auth verification
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get authenticated user - extract token from header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    console.log("Auth check:", {
      hasUser: !!user,
      authError: authError?.message,
      headers: Object.fromEntries(req.headers.entries()),
    });

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Invalid authentication",
          details: authError?.message || "No user found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const body = await req.json() as RecommendationRequest;
    const { count = 3, category_id, context_type = "general" } = body;

    // Track function start
    monitoring.trackStart(user.id);

    // Get user context data
    const [profileResult, recentCheckinsResult, userCategoriesResult] = await Promise.all([
      // Get user profile
      supabase
        .from("profiles")
        .select("coach_id, metadata")
        .eq("user_id", user.id)
        .single(),
      
      // Get recent completed check-ins
      supabase
        .from("checkins")
        .select(`
          id,
          category_id,
          wellness_level,
          completed_at,
          categories (
            id,
            name,
            description
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5),
      
      // Get user's favorite categories
      supabase
        .from("user_categories")
        .select(`
          category_id,
          is_favorite,
          last_interaction,
          categories (
            id,
            name,
            keywords
          )
        `)
        .eq("user_id", user.id)
        .eq("is_favorite", true)
    ]);

    const profile = profileResult.data;
    const recentCheckins = recentCheckinsResult.data || [];
    const userCategories = userCategoriesResult.data || [];

    // Calculate wellness trends from recent check-ins
    const avgWellnessLevel = recentCheckins.length > 0
      ? recentCheckins.reduce((sum, c) => sum + (c.wellness_level || 5), 0) / recentCheckins.length
      : 5;

    // Get categories that need attention (lower wellness scores)
    const categoriesNeedingAttention = recentCheckins
      .filter(c => c.wellness_level && c.wellness_level < 5)
      .map(c => c.categories);

    // Generate AI prompt based on context
    const userContext = {
      avg_wellness_level: avgWellnessLevel,
      recent_categories: recentCheckins.map(c => c.categories?.name).filter(Boolean),
      categories_needing_attention: categoriesNeedingAttention.map(c => c?.name).filter(Boolean),
      favorite_categories: userCategories.map(uc => uc.categories?.name).filter(Boolean),
      last_checkin_date: recentCheckins[0]?.completed_at,
      context_type,
      specific_category: category_id
    };

    // Generate recommendations using OpenAI
    const recommendations = await generateAIRecommendations(
      userContext,
      count
    );

    // Transform AI recommendations to match database schema
    const dbRecommendations = recommendations.map(rec => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      title: rec.title,
      recommendation_text: rec.description,
      action: rec.action,
      why: rec.why,
      recommendation_type: rec.type || "action",
      category_id: rec.category_id || category_id || null,
      importance: rec.importance || 5,
      relevance: rec.relevance || 0.7,
      context: rec.context || userContext.context_type,
      is_active: true,
      created_at: new Date().toISOString(),
      metadata: {
        ai_generated: true,
        user_context: userContext,
        ...rec.metadata
      }
    }));

    // Store recommendations in database
    const { data: insertedRecommendations, error: insertError } = await supabase
      .from("recommendations")
      .insert(dbRecommendations)
      .select();

    if (insertError) {
      console.error("Failed to insert recommendations:", insertError);
      throw new Error("Failed to save recommendations");
    }

    // Track success
    monitoring.trackSuccess(user.id, {
      recommendations_count: insertedRecommendations?.length || 0,
      context_type,
      category_id
    });

    return new Response(
      JSON.stringify({
        recommendations: insertedRecommendations || dbRecommendations,
        count: insertedRecommendations?.length || dbRecommendations.length,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    monitoring.trackError(
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error("Recommendations error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

async function generateAIRecommendations(
  context: any,
  count: number
): Promise<any[]> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openAiKey) {
    console.log("OpenAI API key not found, using enhanced contextual recommendations");
    return generateContextualRecommendations(context, count);
  }

  try {
    const prompt = `
You are a wellness coach assistant. Based on the user's context, generate ${count} personalized wellness recommendations.

User Context:
- Average wellness level: ${context.avg_wellness_level}/10
- Recent categories: ${context.recent_categories.join(", ") || "None"}
- Categories needing attention: ${context.categories_needing_attention.join(", ") || "None"}
- Favorite categories: ${context.favorite_categories.join(", ") || "None"}
- Last check-in: ${context.last_checkin_date || "Never"}

Generate ${count} recommendations in JSON format. Each recommendation should have:
- title: Short, actionable title (max 50 chars)
- description: Detailed explanation (1-2 sentences)
- action: Specific action to take
- why: Why this will help
- type: "action" or "category" or "insight"
- importance: 1-10 (higher = more important)
- relevance: 0-1 (how relevant to user's context)
- category_id: null (we'll match this later)

Focus on practical, achievable actions that address the user's current wellness state.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful wellness coach assistant that generates personalized recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = JSON.parse(data.choices[0].message.content);
    
    // Ensure we have an array of recommendations
    const recommendations = aiResponse.recommendations || 
                          (Array.isArray(aiResponse) ? aiResponse : [aiResponse]);
    
    return recommendations.slice(0, count);
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback to contextual recommendations
    return generateContextualRecommendations(context, count);
  }
}

function generateContextualRecommendations(context: any, count: number): any[] {
  const recommendations: any[] = [];
  
  // Base recommendations on wellness level
  if (context.avg_wellness_level < 4) {
    recommendations.push({
      title: "Start with small wins",
      description: "Your wellness levels indicate you might be going through a challenging time. Focus on one small positive action today.",
      action: "Choose one simple self-care activity you enjoy and do it for just 5 minutes",
      why: "Small, achievable goals build momentum and confidence without overwhelming you",
      type: "action",
      importance: 9,
      relevance: 0.95,
      context: "low_wellness_support"
    });
  } else if (context.avg_wellness_level > 7) {
    recommendations.push({
      title: "Maintain your momentum",
      description: "You're doing great! Let's build on your positive wellness habits.",
      action: "Identify what's working well and commit to continuing it this week",
      why: "Consistency in positive habits reinforces long-term wellness",
      type: "insight",
      importance: 7,
      relevance: 0.85,
      context: "high_wellness_maintenance"
    });
  }

  // Recommendations for categories needing attention
  if (context.categories_needing_attention.length > 0) {
    const category = context.categories_needing_attention[0];
    recommendations.push({
      title: `Focus on ${category}`,
      description: `Your recent ${category} check-ins show room for improvement. Let's address this area.`,
      action: `Spend 10 minutes today on a ${category.toLowerCase()} activity`,
      why: "Addressing areas of lower wellness can significantly improve overall well-being",
      type: "category",
      importance: 8,
      relevance: 0.9,
      context: "category_improvement"
    });
  }

  // Time-based recommendations
  const lastCheckinDays = context.last_checkin_date 
    ? Math.floor((Date.now() - new Date(context.last_checkin_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (lastCheckinDays && lastCheckinDays > 3) {
    recommendations.push({
      title: "Check in with yourself",
      description: `It's been ${lastCheckinDays} days since your last check-in. Regular check-ins help track your wellness journey.`,
      action: "Complete a quick check-in in one of your favorite categories",
      why: "Regular self-reflection helps you stay connected with your wellness goals",
      type: "action",
      importance: 7,
      relevance: 0.8,
      context: "checkin_reminder"
    });
  }

  // General wellness recommendations
  const generalRecommendations = [
    {
      title: "Practice gratitude",
      description: "Take a moment to appreciate positive aspects of your day.",
      action: "Write down 3 things you're grateful for today",
      why: "Gratitude practices improve mental well-being and life satisfaction",
      type: "action",
      importance: 6,
      relevance: 0.7,
      context: "general_wellness"
    },
    {
      title: "Move your body",
      description: "Physical activity boosts both physical and mental wellness.",
      action: "Take a 10-minute walk or do light stretching",
      why: "Movement releases endorphins and reduces stress",
      type: "action",
      importance: 7,
      relevance: 0.75,
      context: "physical_wellness"
    },
    {
      title: "Connect with others",
      description: "Social connections are vital for emotional well-being.",
      action: "Reach out to a friend or family member today",
      why: "Social support improves resilience and happiness",
      type: "action",
      importance: 6,
      relevance: 0.7,
      context: "social_wellness"
    },
    {
      title: "Mindful breathing",
      description: "A few minutes of focused breathing can reduce stress.",
      action: "Try the 4-7-8 breathing technique for 3 cycles",
      why: "Deep breathing activates your body's relaxation response",
      type: "action",
      importance: 5,
      relevance: 0.65,
      context: "stress_management"
    }
  ];

  // Add general recommendations if needed
  while (recommendations.length < count && generalRecommendations.length > 0) {
    const index = Math.floor(Math.random() * generalRecommendations.length);
    recommendations.push(generalRecommendations.splice(index, 1)[0]);
  }

  return recommendations.slice(0, count);
}
