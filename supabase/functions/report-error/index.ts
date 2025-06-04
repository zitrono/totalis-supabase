/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

interface ErrorReportRequest {
  user_id?: string;
  error_type?: string;
  error_message?: string;
  stack_trace?: string;
  metadata?: Record<string, any>;
}

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

    const body = await req.json() as ErrorReportRequest;
    
    // Extract fields using snake_case
    const userId = body.user_id || user.id;
    const errorType = body.error_type;
    const errorMessage = body.error_message;
    const stackTrace = body.stack_trace;
    const metadata = body.metadata || {};

    // Validate required fields
    if (!errorType || !errorMessage) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          details: "error_type and error_message are required" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Insert error log
    const { error } = await supabase
      .from("error_logs")
      .insert({
        user_id: userId,
        error_type: errorType,
        error_message: errorMessage,
        stack_trace: stackTrace,
        metadata: {
          ...metadata,
          platform: metadata.platform || "unknown",
          app_version: metadata.app_version || "unknown",
          reported_at: new Date().toISOString(),
        }
      });

    if (error) {
      console.error("Failed to log error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Log to analytics_events as well for tracking
    await supabase
      .from("analytics_events")
      .insert({
        user_id: userId,
        event_type: "error_reported",
        event_data: {
          error_type: errorType,
          error_message: errorMessage,
          has_stack_trace: !!stackTrace,
        },
        platform: metadata.platform || "unknown",
        app_version: metadata.app_version || "unknown",
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Error logged successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error reporting error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});