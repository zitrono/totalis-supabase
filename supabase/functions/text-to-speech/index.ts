/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

interface TTSRequest {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
  response_format?: string;
}

interface TTSResponse {
  audio_url?: string;
  audio_base64?: string;
  duration_estimate?: number;
  error?: string;
}

// Available OpenAI voices
const AVAILABLE_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
const DEFAULT_VOICE = "nova";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: TTSRequest = await req.json();
    const {
      text,
      voice = DEFAULT_VOICE,
      model = "tts-1",
      speed = 1.0,
      response_format = "mp3",
    } = body;

    if (!text || text.trim().length === 0) {
      throw new Error("Text is required");
    }

    // Validate voice
    if (!AVAILABLE_VOICES.includes(voice)) {
      throw new Error(
        `Invalid voice. Available voices: ${AVAILABLE_VOICES.join(", ")}`,
      );
    }

    // Validate speed (0.25 to 4.0)
    if (speed < 0.25 || speed > 4.0) {
      throw new Error("Speed must be between 0.25 and 4.0");
    }

    // Estimate duration (rough estimate based on average speech rate)
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150 / speed; // Average speech rate adjusted by speed
    const durationEstimate = (wordCount / wordsPerMinute) * 60; // seconds

    // Call OpenAI TTS API
    console.log("Calling OpenAI TTS API...");
    const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format,
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("TTS API error:", errorText);
      throw new Error(`TTS API error: ${ttsResponse.status}`);
    }

    // Get audio data
    const audioBlob = await ttsResponse.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `tts/${user.id}/${timestamp}.${response_format}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(filename, audioBytes, {
        contentType: `audio/${response_format}`,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to upload audio");
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("voice-messages")
      .getPublicUrl(filename);

    // Log usage for analytics
    await supabase.rpc("log_event", {
      params: {
        event_name: "text_to_speech",
        properties: {
          text_length: text.length,
          word_count: wordCount,
          voice,
          model,
          speed,
          duration_estimate: durationEstimate,
          user_id: user.id,
        },
      },
    });

    const response: TTSResponse = {
      audio_url: publicUrl,
      duration_estimate: durationEstimate,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Text-to-speech error:", error);

    const response: TTSResponse = {
      error: errorMessage || "TTS generation failed",
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
