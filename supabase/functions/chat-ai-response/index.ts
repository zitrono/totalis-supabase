import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createSupabaseClient,
  getUserContext,
} from "../_shared/supabase-client.ts";
import { LangflowClient } from "../_shared/langflow-client.ts";
import { ChatMessage, AIResponse } from "../_shared/types.ts";

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
      conversationId,
      includeHistory = true,
      voiceEnabled = false,
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

    // Get user context (coach, categories, etc.)
    const context = await getUserContext(supabase, user.id);

    // Generate or use existing conversation ID
    const currentConversationId = conversationId || crypto.randomUUID();

    // Get message count for ordering
    const { count: messageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", currentConversationId);

    // Get chat history if requested
    let chatHistory: ChatMessage[] = [];
    if (includeHistory && conversationId) {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("message_order", { ascending: true })
        .limit(20);

      chatHistory = messages?.map((m) => ({
        id: m.id,
        userId: m.user_id,
        message: m.message_text,
        isUser: m.message_type === "user",
        timestamp: m.created_at,
        contextType: m.ref_category_id ? "category" : 
                    m.ref_checkin_id ? "checkin" : 
                    m.ref_recommendation_id ? "recommendation" : undefined,
        contextId: m.ref_category_id || m.ref_checkin_id || m.ref_recommendation_id,
      })) || [];
    }

    // Start timing AI processing
    const startTime = Date.now();

    // Save user's message
    const { data: userMessage, error: saveUserError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        message_text: message,
        message_type: "user",
        coach_id: context.coachId,
        conversation_id: currentConversationId,
        message_order: (messageCount || 0) + 1,
        voice_enabled: voiceEnabled,
        ref_category_id: contextType === "category" ? contextId : null,
        ref_checkin_id: contextType === "checkin" ? contextId : null,
        ref_recommendation_id: contextType === "recommendation" ? contextId : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveUserError) {
      console.error("Error saving user message:", saveUserError);
      throw new Error("Failed to save message");
    }

    // Get AI response from Langflow (mocked)
    const aiResponse: AIResponse = await langflowClient.getChatResponse(
      message,
      chatHistory,
      context,
    );

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Save AI response
    const { data: aiMessage, error: saveAiError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        message_text: aiResponse.text,
        message_type: "assistant",
        coach_id: context.coachId,
        conversation_id: currentConversationId,
        message_order: (messageCount || 0) + 2,
        voice_enabled: voiceEnabled,
        ai_processed: true,
        ai_response_time_ms: processingTime,
        ref_category_id: contextType === "category" ? contextId : null,
        ref_checkin_id: contextType === "checkin" ? contextId : null,
        ref_recommendation_id: contextType === "recommendation" ? contextId : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveAiError) {
      console.error("Error saving AI message:", saveAiError);
    }

    // Get additional context if needed
    let additionalContext = {};
    
    if (contextType === "category" && contextId) {
      const { data: category } = await supabase
        .from("categories")
        .select("id, name, description")
        .eq("id", contextId)
        .single();
      additionalContext = { category };
    } else if (contextType === "checkin" && contextId) {
      const { data: checkin } = await supabase
        .from("checkins")
        .select("id, category_id, wellness_level, status")
        .eq("id", contextId)
        .single();
      additionalContext = { checkin };
    } else if (contextType === "recommendation" && contextId) {
      const { data: recommendation } = await supabase
        .from("recommendations")
        .select("id, title, description")
        .eq("id", contextId)
        .single();
      additionalContext = { recommendation };
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "chat_message",
      event_data: {
        conversation_id: currentConversationId,
        context_type: contextType,
        context_id: contextId,
        message_length: message.length,
        response_length: aiResponse.text.length,
        processing_time_ms: processingTime,
        voice_enabled: voiceEnabled,
      },
      created_at: new Date().toISOString(),
    });

    // Return comprehensive response
    return new Response(
      JSON.stringify({
        conversationId: currentConversationId,
        userMessage: {
          id: userMessage?.id,
          text: message,
          timestamp: userMessage?.created_at,
        },
        aiResponse: {
          id: aiMessage?.id,
          text: aiResponse.text,
          suggestions: aiResponse.suggestions,
          confidence: aiResponse.confidence,
          timestamp: aiMessage?.created_at,
          processingTimeMs: processingTime,
        },
        coach: {
          id: context.coachId,
          personality: aiResponse.coachPersonality,
        },
        context: {
          type: contextType,
          id: contextId,
          ...additionalContext,
        },
        followUp: aiResponse.followUp,
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

    // Log error for monitoring
    try {
      const supabase = createSupabaseClient(req.headers.get("Authorization")!);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from("error_logs").insert({
          user_id: user.id,
          function_name: "chat-ai-response",
          error_message: error.message,
          error_stack: error.stack,
          request_data: await req.json().catch(() => ({})),
          created_at: new Date().toISOString(),
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

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