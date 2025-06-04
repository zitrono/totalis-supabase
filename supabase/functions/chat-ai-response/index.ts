/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserContext } from "../_shared/supabase-client.ts";
import { LangflowClient } from "../_shared/langflow-client.ts";
import { ChatMessage } from "../_shared/types.ts";
// Test metadata utilities removed - test isolation handled by preview branches

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      token,
    );
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
    const body = await req.json();
    const {
      message,
      context_type,
      context_id,
      include_history = true,
      conversation_id = crypto.randomUUID(),
    } = body;


    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Get chat history if requested
    let chatHistory: ChatMessage[] = [];
    if (include_history) {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      chatHistory = messages?.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        message: m.content,
        is_user: m.role === "user",
        timestamp: m.created_at,
        context_type: m.metadata?.context_type,
        context_id: m.metadata?.context_id,
      } as ChatMessage)).reverse() || [];
    }

    // Save user's message
    const { data: user_message, error: saveUserError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        content: message,
        role: "user",
        category_id: context_type === "category" ? context_id : null,
        conversation_id: conversation_id,
        metadata: {
          context_type: context_type,
          context_id: context_id,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveUserError) {
      console.error("Error saving user message:", saveUserError);
    }

    // Get user context
    const context = await getUserContext(supabase, user.id);

    // Get AI response from Langflow
    const aiResponse = await langflowClient.getChatResponse(
      message,
      chatHistory,
      context,
    );

    // Save AI response
    const { data: ai_message, error: saveAiError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        content: aiResponse,
        role: "assistant",
        category_id: context_type === "category" ? context_id : null,
        conversation_id: conversation_id,
        coach_id: context.coach_id,
        metadata: {
          context_type: context_type,
          context_id: context_id,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveAiError) {
      console.error("Error saving AI message:", saveAiError);
    }

    // Get coach info for personalization
    const { data: coach } = await supabase
      .from("coaches")
      .select("name, voice")
      .eq("id", context.coach_id)
      .single();

    // Return response
    return new Response(
      JSON.stringify({
        response: aiResponse,
        conversation_id: conversation_id,
        user_message: user_message,
        ai_message: ai_message,
        coach: coach,
        context_used: context_type,
        metadata: {},
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Chat AI response error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process chat message",
        details: errorMessage,
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
