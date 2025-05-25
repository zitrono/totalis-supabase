import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";
import { LangflowClient } from "../_shared/langflow-client.ts";
import { AnalyticsSummary, CategoryStat } from "../_shared/types.ts";

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
    const { period = "week" } = await req.json();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "all":
        startDate.setFullYear(2020); // Far enough back
        break;
    }

    // Get check-ins for the period
    const { data: checkIns, error: checkInsError } = await supabase
      .from("check_ins")
      .select("*, categories(id, name)")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (checkInsError) {
      throw checkInsError;
    }

    // Calculate statistics
    const totalCheckIns = checkIns?.length || 0;
    const completedCheckIns = checkIns?.filter((c) =>
      c.status === "completed"
    ).length || 0;

    // Calculate category statistics
    const categoryStats: Record<string, CategoryStat> = {};
    checkIns?.forEach((checkIn) => {
      if (checkIn.categories) {
        const catId = checkIn.categories.id;
        if (!categoryStats[catId]) {
          categoryStats[catId] = {
            categoryId: catId,
            categoryName: checkIn.categories.name,
            count: 0,
            lastUsed: checkIn.created_at,
          };
        }
        categoryStats[catId].count++;
        if (
          new Date(checkIn.created_at) > new Date(categoryStats[catId].lastUsed)
        ) {
          categoryStats[catId].lastUsed = checkIn.created_at;
        }
      }
    });

    const topCategories = Object.values(categoryStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate streak
    const streakDays = await calculateStreak(supabase, user.id);

    // Get recommendations count
    const { count: recommendationsCount } = await supabase
      .from("recommendations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString());

    // Create summary
    const summary: AnalyticsSummary = {
      userId: user.id,
      period: period as "week" | "month" | "all",
      totalCheckIns,
      completedCheckIns,
      topCategories,
      streakDays,
      insights: [],
    };

    // Get AI-generated insights (mocked)
    const insights = await langflowClient.getAnalyticsInsights(summary);
    summary.insights = insights;

    // Add manual insights
    if (recommendationsCount && recommendationsCount > 0) {
      summary.insights.push(
        `You've received ${recommendationsCount} personalized recommendations this ${period}.`,
      );
    }

    // Return analytics summary
    return new Response(
      JSON.stringify({
        summary,
        details: {
          checkInsPerDay: (totalCheckIns /
            Math.max(
              1,
              Math.ceil(
                (endDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )).toFixed(1),
          completionRate: totalCheckIns > 0
            ? ((completedCheckIns / totalCheckIns) * 100).toFixed(0) + "%"
            : "0%",
          mostActiveTime: getMostActiveTime(checkIns || []),
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
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
    console.error("Analytics summary error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to generate analytics summary",
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

async function calculateStreak(supabase: any, userId: string): Promise<number> {
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(365); // Max 1 year

  if (!checkIns || checkIns.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkInDates = checkIns.map((c) => {
    const date = new Date(c.created_at);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  });

  // Check consecutive days from today backwards
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);

    if (checkInDates.includes(checkDate.getTime())) {
      streak++;
    } else if (i > 0) { // Allow today to be empty
      break;
    }
  }

  return streak;
}

function getMostActiveTime(checkIns: any[]): string {
  if (checkIns.length === 0) return "No activity yet";

  const hourCounts: Record<number, number> = {};

  checkIns.forEach((checkIn) => {
    const hour = new Date(checkIn.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const mostActiveHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "0";

  const hour = parseInt(mostActiveHour);
  if (hour < 6) return "Night owl (12 AM - 6 AM)";
  else if (hour < 12) return "Morning person (6 AM - 12 PM)";
  else if (hour < 18) return "Afternoon (12 PM - 6 PM)";
  else return "Evening (6 PM - 12 AM)";
}
