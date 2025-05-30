/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Log webhook receipt
    console.log("Langflow webhook received:", {
      flowId: payload.flowId,
    });

    // Echo the payload back (mock implementation)
    // In production, this would process the Langflow response
    const response = {
      received: true,
      echo: payload,
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Langflow webhook error:", error);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      },
    );
  }
});
