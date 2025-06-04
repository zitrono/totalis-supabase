/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { AnalyticsSummary } from "../_shared/types.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Get authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const { period = "week" } = await req.json();

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get user stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get check-ins for period
    const { data: checkins, error: checkinsError } = await supabase
      .from("checkins")
      .select("*, categories(name)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", startDate.toISOString())
      .order("completed_at", { ascending: false });

    // Get messages count for period
    const { count: messageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString());

    // Get active recommendations
    const { data: recommendations } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gte("created_at", startDate.toISOString());

    // Calculate insights
    const total_check_ins = checkins?.length || 0;
    const avg_wellness_level = checkins && checkins.length > 0
      ? checkins.reduce((sum, c) => sum + (c.wellness_level || 5), 0) /
        checkins.length
      : 5;

    const category_breakdown = checkins?.reduce((acc, checkin) => {
      const categoryName = checkin.categories?.name || "Unknown";
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const insights = generateInsights(checkins || [], avg_wellness_level, period);

    const summary = {
      period,
      date_range: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      total_check_ins,
      total_messages: messageCount || 0,
      avg_wellness_level: Math.round(avg_wellness_level * 10) / 10,
      category_breakdown,
      active_recommendations: recommendations?.length || 0,
      insights,
      trend: calculateTrend(checkins || []),
      last_activity: stats?.last_activity || null,
    };

    return new Response(
      JSON.stringify({ summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Analytics summary error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

function generateInsights(
  checkins: any[],
  avgWellness: number,
  period: string,
): string[] {
  const insights = [];

  if (checkins.length === 0) {
    insights.push(
      `No check-ins recorded in the past ${period}. Regular check-ins help track your wellness journey.`,
    );
  } else {
    insights.push(
      `You completed ${checkins.length} check-in${
        checkins.length > 1 ? "s" : ""
      } this ${period}.`,
    );

    if (avgWellness >= 7) {
      insights.push(
        "Your wellness levels have been consistently positive. Keep up the great work!",
      );
    } else if (avgWellness <= 4) {
      insights.push(
        "It seems like this has been a challenging period. Remember, small steps can lead to big improvements.",
      );
    } else {
      insights.push(
        "Your wellness levels show a balanced pattern. Continue monitoring and making adjustments as needed.",
      );
    }

    // Category-specific insight
    const categories = [
      ...new Set(checkins.map((c) => c.categories?.name).filter(Boolean)),
    ];
    if (categories.length > 1) {
      insights.push(
        `You've been focusing on ${categories.length} different wellness areas, which shows great holistic awareness.`,
      );
    }
  }

  return insights;
}

function calculateTrend(
  checkins: any[],
): "improving" | "stable" | "declining" | "insufficient_data" {
  if (checkins.length < 2) {
    return "insufficient_data";
  }

  // Sort by date (oldest first)
  const sorted = [...checkins].sort((a, b) =>
    new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );

  // Compare first half average to second half average
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const avgFirst =
    firstHalf.reduce((sum, c) => sum + (c.wellness_level || 5), 0) /
    firstHalf.length;
  const avgSecond =
    secondHalf.reduce((sum, c) => sum + (c.wellness_level || 5), 0) /
    secondHalf.length;

  const difference = avgSecond - avgFirst;

  if (difference > 0.5) return "improving";
  if (difference < -0.5) return "declining";
  return "stable";
}
