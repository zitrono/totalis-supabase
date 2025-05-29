/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getTestMetadata, mergeTestMetadata } from "../_shared/test-data.ts";
import { createMonitoringContext } from "../_shared/monitoring.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const testMetadata = getTestMetadata(req);
  const monitoring = createMonitoringContext("recommendations", testMetadata);

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

    const { count = 3 } = await req.json();

    // Track function start
    monitoring.trackStart(user.id);

    // Mock recommendations for now
    const mockRecommendations = [
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: "Take a 10-minute walk",
        recommendation_text:
          "A short walk can help clear your mind and boost your energy levels.",
        action: "Go for a 10-minute walk outside",
        why: "Physical movement increases blood flow and releases endorphins",
        recommendation_type: "action",
        importance: 4,
        relevance: 0.85,
        created_at: new Date().toISOString(),
        metadata: mergeTestMetadata({}, testMetadata),
      },
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: "Try a breathing exercise",
        recommendation_text:
          "Deep breathing can help reduce stress and improve focus.",
        action: "Practice 4-7-8 breathing for 5 minutes",
        why:
          "Controlled breathing activates your parasympathetic nervous system",
        recommendation_type: "action",
        importance: 3,
        relevance: 0.75,
        created_at: new Date().toISOString(),
        metadata: mergeTestMetadata({}, testMetadata),
      },
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: "Explore mindfulness practices",
        recommendation_text:
          "The Mindfulness category has techniques that might help with your current stress levels.",
        recommendation_type: "category",
        importance: 3,
        relevance: 0.70,
        context: "Based on your recent check-ins",
        created_at: new Date().toISOString(),
        metadata: mergeTestMetadata({}, testMetadata),
      },
    ].slice(0, count);

    // If this is a test, store recommendations in database
    if (testMetadata) {
      for (const rec of mockRecommendations) {
        const { error } = await supabase
          .from("recommendations")
          .insert(rec);

        if (error) {
          console.error("Failed to insert test recommendation:", error);
        }
      }
    }

    // Track success
    monitoring.trackSuccess(user.id, {
      recommendations_count: mockRecommendations.length,
      is_test: !!testMetadata,
    });

    return new Response(
      JSON.stringify({
        recommendations: mockRecommendations,
        count: mockRecommendations.length,
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
