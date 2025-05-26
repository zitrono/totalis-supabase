import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUserContext,
} from "../_shared/supabase-client.ts";
import { LangflowClient } from "../_shared/langflow-client.ts";
import { Recommendation as _Recommendation } from "../_shared/types.ts";

const langflowClient = new LangflowClient();

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Create Supabase client with user auth
    const supabase = createSupabaseClient(authHeader);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Get request parameters
    const { 
      type = "active", // active, all, category, checkin
      categoryId,
      checkinId,
      limit = 10,
      offset = 0 
    } = await req.json();

    // Get user context for personalization
    const context = await getUserContext(supabase, user.id);

    // Build query based on type
    let query = supabase
      .from("recommendations")
      .select(`
        *,
        categories (
          id,
          name,
          icon_url
        )
      `)
      .eq("user_id", user.id);

    if (type === "active") {
      query = query
        .eq("is_active", true)
        .is("action_taken", false)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("priority_level", { ascending: false })
        .order("relevance_score", { ascending: false });
    } else if (type === "category" && categoryId) {
      query = query
        .eq("category_id", categoryId)
        .eq("is_active", true);
    } else if (type === "checkin" && checkinId) {
      query = query
        .eq("checkin_id", checkinId);
    }

    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    // Execute query
    const { data: existingRecommendations, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    // If we don't have enough recommendations, generate new ones
    let recommendations = existingRecommendations || [];
    
    if (type === "active" && recommendations.length < 3) {
      // Generate new recommendations using AI
      const newRecommendations = await langflowClient.getRecommendations(context);
      
      // Save new recommendations to database
      const recommendationsToInsert = newRecommendations.map(rec => ({
        user_id: user.id,
        title: rec.title,
        description: rec.insight,
        content: `${rec.why}\n\n${rec.action}`,
        category_id: rec.categoryId || context.recentCategories[0],
        recommendation_type: "general",
        relevance_score: rec.importance,
        priority_level: rec.importance >= 8 ? "high" : rec.importance >= 5 ? "medium" : "low",
        is_active: true,
        ai_model_used: "langflow",
        ai_confidence: 0.85,
        created_at: new Date().toISOString(),
      }));

      const { data: insertedRecs, error: insertError } = await supabase
        .from("recommendations")
        .insert(recommendationsToInsert)
        .select(`
          *,
          categories (
            id,
            name,
            icon_url
          )
        `);

      if (!insertError && insertedRecs) {
        recommendations = [...recommendations, ...insertedRecs];
      }
    }

    // Transform recommendations for response
    const transformedRecommendations = recommendations.map(rec => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      content: rec.content,
      type: rec.recommendation_type,
      priority: rec.priority_level,
      relevance: rec.relevance_score,
      category: rec.categories ? {
        id: rec.categories.id,
        name: rec.categories.name,
        iconUrl: rec.categories.icon_url,
      } : null,
      status: {
        isActive: rec.is_active,
        actionTaken: rec.action_taken,
        viewedAt: rec.viewed_at,
      },
      metadata: {
        createdAt: rec.created_at,
      },
    }));

    // Mark recommendations as viewed
    const viewedIds = recommendations
      .filter(rec => !rec.viewed_at)
      .map(rec => rec.id);
    
    if (viewedIds.length > 0) {
      await supabase
        .from("recommendations")
        .update({ viewed_at: new Date().toISOString() })
        .in("id", viewedIds);
    }

    // Return response
    return new Response(
      JSON.stringify({
        recommendations: transformedRecommendations,
        pagination: {
          offset,
          limit,
          total: recommendations.length,
          hasMore: recommendations.length === limit,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Recommendations error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to generate recommendations",
        details: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});
