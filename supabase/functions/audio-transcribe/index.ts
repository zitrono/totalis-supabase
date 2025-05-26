import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user
const rateLimit = new Map<string, { count: number; resetTime: number }>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      },
    );
  }

  try {
    // Validate auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
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

    // Apply rate limiting
    const now = Date.now();
    const userRateLimit = rateLimit.get(user.id) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    
    if (now > userRateLimit.resetTime) {
      // Reset rate limit window
      userRateLimit.count = 0;
      userRateLimit.resetTime = now + RATE_LIMIT_WINDOW;
    }

    if (userRateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((userRateLimit.resetTime - now) / 1000)
        }),
        {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((userRateLimit.resetTime - now) / 1000).toString()
          },
          status: 429,
        },
      );
    }

    // Increment rate limit counter
    userRateLimit.count++;
    rateLimit.set(user.id, userRateLimit);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        },
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Validate file size (25MB limit for Whisper API)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ 
          error: "File too large",
          maxSize: "25MB"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Validate audio format
    const supportedFormats = ['audio/webm', 'audio/m4a', 'audio/mp3', 'audio/mpeg', 
                             'audio/wav', 'audio/ogg', 'audio/flac'];
    const mimeType = audioFile.type.toLowerCase();
    
    if (!supportedFormats.some(format => mimeType.includes(format.split('/')[1]))) {
      return new Response(
        JSON.stringify({ 
          error: "Unsupported audio format",
          supportedFormats: ['webm', 'm4a', 'mp3', 'wav', 'ogg', 'flac']
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Log request start for analytics
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    console.log(`[${requestId}] Audio transcription started`, {
      userId: user.id,
      fileSize: audioFile.size,
      mimeType: audioFile.type,
      timestamp: new Date().toISOString()
    });

    // Prepare form data for OpenAI
    const openAIFormData = new FormData();
    openAIFormData.append("file", audioFile);
    openAIFormData.append("model", "whisper-1");
    
    // Optional: Add prompt to improve accuracy
    const prompt = formData.get("prompt") as string;
    if (prompt) {
      openAIFormData.append("prompt", prompt);
    }

    // Optional: Add language hint
    const language = formData.get("language") as string;
    if (language) {
      openAIFormData.append("language", language);
    }

    // Call OpenAI Whisper API
    let transcriptionResponse;
    try {
      transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: openAIFormData,
      });
    } catch (error) {
      console.error(`[${requestId}] OpenAI API call failed:`, error);
      return new Response(
        JSON.stringify({ error: "Transcription service error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        },
      );
    }

    // Handle OpenAI API response
    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.text();
      console.error(`[${requestId}] OpenAI API error:`, transcriptionResponse.status, errorData);
      
      // Don't expose internal error details to client
      return new Response(
        JSON.stringify({ error: "Transcription failed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        },
      );
    }

    // Parse transcription result
    const transcriptionData = await transcriptionResponse.json();
    const processingTime = Date.now() - startTime;

    // Log usage for analytics/billing
    const usageLog = {
      requestId,
      userId: user.id,
      timestamp: new Date().toISOString(),
      fileSize: audioFile.size,
      mimeType: audioFile.type,
      processingTimeMs: processingTime,
      transcriptionLength: transcriptionData.text?.length || 0,
      success: true,
    };

    // Store usage log in database
    try {
      await supabase
        .from("audio_usage_logs")
        .insert({
          request_id: usageLog.requestId,
          user_id: usageLog.userId,
          file_size: usageLog.fileSize,
          mime_type: usageLog.mimeType,
          processing_time_ms: usageLog.processingTimeMs,
          transcription_length: usageLog.transcriptionLength,
          success: usageLog.success,
          created_at: usageLog.timestamp,
        });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error(`[${requestId}] Failed to log usage:`, logError);
    }

    console.log(`[${requestId}] Audio transcription completed`, usageLog);

    // Return transcription to client
    return new Response(
      JSON.stringify({
        text: transcriptionData.text,
        requestId,
        processingTimeMs: processingTime,
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
    // Log unexpected errors without exposing details
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Unexpected error:`, error);

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        errorId,
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

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of rateLimit.entries()) {
    if (now > limit.resetTime + RATE_LIMIT_WINDOW) {
      rateLimit.delete(userId);
    }
  }
}, RATE_LIMIT_WINDOW);