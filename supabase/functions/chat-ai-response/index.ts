import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUserContext,
} from "../_shared/supabase-client.ts";
import { LangflowClient } from "../_shared/langflow-client.ts";
import { ChatMessage } from "../_shared/types.ts";

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

    // Get request body
    const {
      message,
      contextType,
      contextId,
      includeHistory = true,
    } = await req.json();

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
    if (includeHistory) {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      chatHistory = messages?.map((m) => ({
        id: m.id,
        userId: m.user_id,
        message: m.content,
        isUser: m.is_user,
        timestamp: m.created_at,
        contextType: m.context_type,
        contextId: m.context_id,
      })).reverse() || [];
    }

    // Save user's message
    const { data: userMessage, error: saveUserError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        content: message,
        is_user: true,
        context_type: contextType,
        context_id: contextId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveUserError) {
      console.error("Error saving user message:", saveUserError);
    }

    // Get user context
    const context = await getUserContext(supabase, user.id);

    // Get AI response from Langflow (mocked)
    const aiResponse = await langflowClient.getChatResponse(
      message,
      chatHistory,
      context,
    );

    // Save AI response
    const { data: aiMessage, error: saveAiError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        content: aiResponse,
        is_user: false,
        context_type: contextType,
        context_id: contextId,
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
      .eq("id", context.coachId)
      .single();

    // Return response
    return new Response(
      JSON.stringify({
        userMessage: userMessage || { content: message, is_user: true },
        aiMessage: aiMessage || { content: aiResponse, is_user: false },
        coach: coach,
        context: {
          type: contextType,
          id: contextId,
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
    console.error("Chat AI response error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process chat message",
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
