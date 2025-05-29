/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Generic API Router
 *
 * This edge function routes legacy API endpoints to corresponding RPC functions.
 * It automatically maps URLs like /api/user/recommendation/get to api_recommendation_get
 *
 * Benefits:
 * - No need to create new edge functions for each endpoint
 * - All logic stays in the database as RPC functions
 * - Easy to add new endpoints - just create the RPC function
 * - Consistent error handling and auth
 */

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
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Parse the URL to determine which RPC function to call
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Convert URL path to RPC function name
    // /api/user/recommendation/get -> api_recommendation_get
    // /api/user/recommendation/get_all -> api_recommendation_get_all
    const pathParts = pathname.split("/").filter(Boolean);

    // Remove 'api' prefix if present
    if (pathParts[0] === "api") {
      pathParts.shift();
    }

    // Build RPC function name
    const rpcFunctionName = "api_" + pathParts.join("_");

    console.log(`Routing ${pathname} to RPC function: ${rpcFunctionName}`);

    // Parse request body
    const body = await req.json();

    // Prepare parameters for RPC call
    const rpcParams: any = {
      p_user_id: user.id,
    };

    // Handle different parameter formats
    if (body.checkin_id) {
      rpcParams.p_checkin_id = body.checkin_id;
    }

    if (body.checkins) {
      // Extract checkin_ids from array of objects
      const checkinIds = body.checkins
        .map((c: any) => c.checkin_id)
        .filter(Boolean);
      rpcParams.p_checkin_ids = checkinIds;
    }

    // Add any other parameters from body
    Object.keys(body).forEach((key) => {
      if (!["checkin_id", "checkins"].includes(key)) {
        rpcParams[`p_${key}`] = body[key];
      }
    });

    // Call the RPC function
    const { data, error } = await supabase.rpc(rpcFunctionName, rpcParams);

    if (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error("RPC error:", error);

      // If function doesn't exist, return 404
      if (errorMessage.includes("not exist")) {
        return new Response(
          JSON.stringify({ error: `Endpoint not found: ${pathname}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          },
        );
      }

      // Other errors
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Return the result
    return new Response(
      JSON.stringify(data || []),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Router error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
