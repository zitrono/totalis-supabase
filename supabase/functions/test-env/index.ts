/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Return environment info
  const envInfo = {
    hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
    hasSupabaseAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
    hasSupabaseServiceKey: !!Deno.env.get("SUPABASE_SERVICE_KEY"),
    url: Deno.env.get("SUPABASE_URL")?.substring(0, 30) + "...",
    headers: Object.fromEntries([...req.headers]),
  };

  return new Response(
    JSON.stringify(envInfo, null, 2),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    },
  );
});
