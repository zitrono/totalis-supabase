import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface AnalyticsEvent {
  eventType: string;
  eventData: Record<string, any>;
  platform: string;
  appVersion: string;
  userId?: string;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
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

    // Create Supabase client with user context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Get request body
    const body = await req.json();
    const {
      event_type,
      event_data = {},
      platform,
      app_version,
    } = body;

    if (!event_type || !platform || !app_version) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: event_type, platform, app_version" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Create the analytics event
    const analyticsEvent: AnalyticsEvent = {
      eventType: event_type,
      eventData: event_data,
      platform,
      appVersion: app_version,
      userId: user.id,
      timestamp: new Date().toISOString(),
    };

    // Store in analytics_events table
    const { data, error } = await supabase
      .from("analytics_events")
      .insert({
        user_id: user.id,
        event_type: analyticsEvent.eventType,
        event_data: analyticsEvent.eventData,
        platform: analyticsEvent.platform,
        app_version: analyticsEvent.appVersion,
        created_at: analyticsEvent.timestamp,
      });

    if (error) {
      console.error("Error storing analytics event:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store analytics event" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Also log to console for debugging in development
    if (Deno.env.get("ENVIRONMENT") === "development") {
      console.log("Analytics Event:", analyticsEvent);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Analytics event logged successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error in log-analytics-event function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});