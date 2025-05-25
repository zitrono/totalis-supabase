import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";

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
    const { categoryId } = await req.json();
    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: "Category ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (categoryError || !category) {
      return new Response(
        JSON.stringify({ error: "Invalid category" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Check if user has an active check-in
    const { data: activeCheckIn } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .single();

    if (activeCheckIn) {
      return new Response(
        JSON.stringify({
          error: "You already have an active check-in",
          activeCheckIn,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        },
      );
    }

    // Create new check-in
    const { data: checkIn, error: checkInError } = await supabase
      .from("check_ins")
      .insert({
        user_id: user.id,
        category_id: categoryId,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (checkInError) {
      throw checkInError;
    }

    // Generate initial questions based on category
    const initialQuestions = getInitialQuestions(category);

    // Return check-in with initial questions
    return new Response(
      JSON.stringify({
        checkIn,
        category,
        questions: initialQuestions,
        message: "Check-in started successfully",
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

function getInitialQuestions(category: any): string[] {
  // Generate questions based on category
  const baseQuestions = [
    `How are you feeling about ${category.name} right now?`,
    `What specific aspect of ${category.name} would you like to focus on today?`,
    `On a scale of 1-10, how would you rate your current ${category.name}?`,
  ];

  // Add category-specific questions
  if (category.name?.toLowerCase().includes("stress")) {
    baseQuestions.push("What is your biggest source of stress right now?");
  } else if (category.name?.toLowerCase().includes("sleep")) {
    baseQuestions.push("How many hours of sleep did you get last night?");
  } else if (category.name?.toLowerCase().includes("relationship")) {
    baseQuestions.push("Who would you like to connect with today?");
  } else if (category.name?.toLowerCase().includes("work")) {
    baseQuestions.push("What is your main work priority today?");
  }

  return baseQuestions.slice(0, category.max_questions || 3);
}
