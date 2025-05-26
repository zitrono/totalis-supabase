import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUserContext,
} from "../_shared/supabase-client.ts";
import { LangflowClient } from "../_shared/langflow-client.ts";
import { CheckInResponse, CheckInQuestion, CheckInSummary } from "../_shared/types.ts";

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
      checkInId, 
      answer,
      action = "continue", // continue, complete, abandon
      voiceEnabled = false,
    } = await req.json();

    if (!checkInId) {
      return new Response(
        JSON.stringify({ error: "Check-in ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Verify check-in exists and belongs to user
    const { data: checkIn, error: checkInError } = await supabase
      .from("checkins")
      .select(`
        *,
        categories (
          id,
          name,
          description,
          checkin_prompt,
          max_questions
        ),
        user_categories (
          id,
          is_favorite,
          custom_name,
          custom_color
        )
      `)
      .eq("id", checkInId)
      .eq("user_id", user.id)
      .single();

    if (checkInError || !checkIn) {
      return new Response(
        JSON.stringify({ error: "Check-in not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Validate check-in status
    if (checkIn.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Check-in already completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (checkIn.status === "abandoned") {
      return new Response(
        JSON.stringify({ error: "Check-in was abandoned" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Handle abandon action
    if (action === "abandon") {
      const { error: abandonError } = await supabase
        .from("checkins")
        .update({
          status: "abandoned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkInId);

      if (abandonError) {
        throw abandonError;
      }

      return new Response(
        JSON.stringify({
          checkInId,
          status: "abandoned",
          message: "Check-in abandoned",
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

    // Get user context
    const context = await getUserContext(supabase, user.id);

    // Get existing responses
    const existingResponses = checkIn.responses || [];
    
    // Add new response if provided
    if (answer) {
      const currentQuestion = existingResponses.length + 1;
      
      const response: CheckInResponse = {
        questionId: crypto.randomUUID(),
        question: `Question ${currentQuestion}`, // This will be enhanced with actual question text
        answer,
        timestamp: new Date().toISOString(),
      };

      existingResponses.push(response);

      // Update check-in with new response
      const { error: updateError } = await supabase
        .from("checkins")
        .update({
          responses: existingResponses,
          current_question: currentQuestion + 1,
          completion_percentage: Math.round((currentQuestion / (checkIn.total_questions || 5)) * 100),
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkInId);

      if (updateError) {
        throw updateError;
      }
    }

    // Determine if check-in should be completed
    const shouldComplete = action === "complete" || 
                         existingResponses.length >= (checkIn.categories?.max_questions || 5);

    if (shouldComplete) {
      // Generate check-in summary
      const summary: CheckInSummary = await langflowClient.generateCheckInSummary(
        existingResponses.map(r => r.answer),
        checkIn.categories?.name || "General",
        context
      );

      // Complete the check-in
      const { error: completeError } = await supabase
        .from("checkins")
        .update({
          status: "completed",
          wellness_level: summary.wellnessLevel,
          summary: summary.summary,
          insights: summary.insights.join("\n"),
          completion_percentage: 100,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkInId);

      if (completeError) {
        throw completeError;
      }

      // Update user_category stats if applicable
      if (checkIn.user_category_id) {
        // The trigger will handle updating stats automatically
      }

      // Create recommendations based on check-in
      if (summary.recommendations.length > 0) {
        const recommendationsToInsert = summary.recommendations.map(rec => ({
          user_id: user.id,
          category_id: checkIn.category_id,
          checkin_id: checkInId,
          title: rec,
          description: `Based on your ${checkIn.categories?.name} check-in`,
          recommendation_type: "checkin_based",
          relevance_score: summary.wellnessLevel < 5 ? 8 : 6,
          priority_level: summary.wellnessLevel < 3 ? "high" : "medium",
          is_active: true,
          created_at: new Date().toISOString(),
        }));

        await supabase
          .from("recommendations")
          .insert(recommendationsToInsert);
      }

      // Log analytics event
      await supabase.from("analytics_events").insert({
        user_id: user.id,
        event_type: "checkin_completed",
        event_data: {
          checkin_id: checkInId,
          category_id: checkIn.category_id,
          wellness_level: summary.wellnessLevel,
          question_count: existingResponses.length,
          duration_minutes: Math.round(
            (new Date().getTime() - new Date(checkIn.started_at).getTime()) / 60000
          ),
        },
        created_at: new Date().toISOString(),
      });

      // Return completion response
      return new Response(
        JSON.stringify({
          checkInId,
          status: "completed",
          summary: {
            wellnessLevel: summary.wellnessLevel,
            insights: summary.insights,
            summary: summary.summary,
            recommendations: summary.recommendations.slice(0, 3),
            improvementTips: summary.improvementTips,
            nextCheckInSuggestion: summary.nextCheckInSuggestion,
          },
          totalQuestions: existingResponses.length,
          completionTime: new Date().toISOString(),
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    } else {
      // Get next question
      const previousAnswers = existingResponses.map(r => r.answer);
      const nextQuestion: CheckInQuestion = await langflowClient.processCheckIn(
        checkIn.categories?.checkin_prompt || "How are you feeling?",
        previousAnswers,
        context
      );

      // Update total questions if not set
      if (!checkIn.total_questions) {
        await supabase
          .from("checkins")
          .update({
            total_questions: nextQuestion.totalQuestions,
          })
          .eq("id", checkInId);
      }

      // Return next question
      return new Response(
        JSON.stringify({
          checkInId,
          status: "in_progress",
          nextQuestion: {
            text: nextQuestion.question,
            number: nextQuestion.questionNumber,
            total: nextQuestion.totalQuestions,
            responseType: nextQuestion.responseType,
          },
          progress: {
            current: existingResponses.length,
            total: nextQuestion.totalQuestions,
            percentage: Math.round((existingResponses.length / nextQuestion.totalQuestions) * 100),
          },
          canComplete: existingResponses.length >= 3, // Allow early completion after 3 questions
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
  } catch (error) {
    console.error("Check-in process error:", error);

    // Log error for monitoring
    try {
      const supabase = createSupabaseClient(req.headers.get("Authorization")!);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from("error_logs").insert({
          user_id: user.id,
          function_name: "checkin-process",
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
        error: "Failed to process check-in",
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