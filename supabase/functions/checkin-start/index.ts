import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUserContext,
} from "../_shared/supabase-client.ts";
import { LangflowClient } from "../_shared/langflow-client.ts";
import { CheckInQuestion } from "../_shared/types.ts";

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

    // Get request body
    const { 
      categoryId, 
      userCategoryId,
      voiceEnabled = false,
    } = await req.json();

    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: "Category ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Get category details
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        description,
        checkin_prompt,
        max_questions
      `)
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      return new Response(
        JSON.stringify({ error: "Category not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Get or create user category if not provided
    let actualUserCategoryId = userCategoryId;
    
    if (!actualUserCategoryId) {
      // Check if user category exists
      const { data: existingUserCategory } = await supabase
        .from("user_categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("category_id", categoryId)
        .single();

      if (existingUserCategory) {
        actualUserCategoryId = existingUserCategory.id;
      } else {
        // Create user category
        const { data: newUserCategory, error: createError } = await supabase
          .from("user_categories")
          .insert({
            user_id: user.id,
            category_id: categoryId,
            is_active: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating user category:", createError);
        } else {
          actualUserCategoryId = newUserCategory.id;
        }
      }
    }

    // Check for any incomplete check-ins
    const { data: incompleteCheckins } = await supabase
      .from("checkins")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("category_id", categoryId)
      .in("status", ["started", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (incompleteCheckins && incompleteCheckins.length > 0) {
      // Return existing check-in
      return new Response(
        JSON.stringify({
          checkInId: incompleteCheckins[0].id,
          status: "existing",
          message: "You have an incomplete check-in for this category",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }

    // Get user context for AI
    const context = await getUserContext(supabase, user.id);

    // Get the first question from Langflow
    const firstQuestion: CheckInQuestion = await langflowClient.processCheckIn(
      category.checkin_prompt || "Let's check in on your wellness",
      [],
      context
    );

    // Create new check-in
    const { data: newCheckIn, error: createCheckInError } = await supabase
      .from("checkins")
      .insert({
        user_id: user.id,
        category_id: categoryId,
        user_category_id: actualUserCategoryId,
        status: "started",
        current_question: 1,
        total_questions: firstQuestion.totalQuestions || category.max_questions || 5,
        responses: [],
        wellness_level: 0,
        completion_percentage: 0,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createCheckInError) {
      throw createCheckInError;
    }

    // Create a welcome message in the messages table for context
    if (voiceEnabled) {
      await supabase
        .from("messages")
        .insert({
          user_id: user.id,
          message_text: `Starting ${category.name} check-in`,
          message_type: "system",
          coach_id: context.coachId,
          ref_checkin_id: newCheckIn.id,
          voice_enabled: true,
          created_at: new Date().toISOString(),
        });
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "checkin_started",
      event_data: {
        checkin_id: newCheckIn.id,
        category_id: categoryId,
        category_name: category.name,
        voice_enabled: voiceEnabled,
      },
      created_at: new Date().toISOString(),
    });

    // Get recent check-in history for this category
    const { data: recentCheckins } = await supabase
      .from("checkins")
      .select("completed_at, wellness_level")
      .eq("user_id", user.id)
      .eq("category_id", categoryId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(3);

    // Calculate trend if there's history
    let trend = null;
    if (recentCheckins && recentCheckins.length >= 2) {
      const recentLevels = recentCheckins.map(c => c.wellness_level || 0);
      const avgRecent = recentLevels.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const avgPrevious = recentLevels.slice(1).reduce((a, b) => a + b, 0) / (recentLevels.length - 1);
      
      if (avgRecent > avgPrevious + 0.5) {
        trend = "improving";
      } else if (avgRecent < avgPrevious - 0.5) {
        trend = "declining";
      } else {
        trend = "stable";
      }
    }

    // Return response with first question
    return new Response(
      JSON.stringify({
        checkInId: newCheckIn.id,
        status: "started",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
        },
        firstQuestion: {
          text: firstQuestion.question,
          number: 1,
          total: firstQuestion.totalQuestions,
          responseType: firstQuestion.responseType,
        },
        history: {
          recentCheckins: recentCheckins?.length || 0,
          trend,
          lastCheckIn: recentCheckins?.[0]?.completed_at || null,
        },
        voiceEnabled,
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
    console.error("Check-in start error:", error);

    // Log error for monitoring
    try {
      const supabase = createSupabaseClient(req.headers.get("Authorization")!);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from("error_logs").insert({
          user_id: user.id,
          function_name: "checkin-start",
          error_message: error.message,
          error_stack: error.stack,
          request_data: await req.json().catch(() => ({})),
          created_at: new Date().toISOString(),
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({
        error: "Failed to start check-in",
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