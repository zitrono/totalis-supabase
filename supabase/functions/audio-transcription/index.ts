/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

interface TranscriptionRequest {
  audio_url?: string;
  audio_base64?: string;
  language?: string;
  prompt?: string;
  message_id?: string; // For updating message after transcription
  batch?: TranscriptionBatchItem[]; // For batch processing
}

interface TranscriptionBatchItem {
  id: string;
  audio_url?: string;
  audio_base64?: string;
  language?: string;
  prompt?: string;
}

interface TranscriptionResponse {
  text: string;
  duration?: number;
  language?: string;
  error?: string;
  message_id?: string;
  batch_results?: BatchTranscriptionResult[];
}

interface BatchTranscriptionResult {
  id: string;
  text: string;
  duration?: number;
  language?: string;
  error?: string;
}

// Helper function to transcribe audio with retry logic
async function transcribeWithRetry(
  audioBlob: Blob,
  options: {
    language?: string;
    prompt?: string;
    openaiApiKey: string;
    maxRetries?: number;
  },
): Promise<any> {
  const { language, prompt, openaiApiKey, maxRetries = 3 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");

      if (language && language !== "auto") {
        formData.append("language", language);
      }

      if (prompt) {
        formData.append("prompt", prompt);
      }

      formData.append("response_format", "verbose_json");

      const whisperResponse = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
          },
          body: formData,
        },
      );

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();

        // Check if it's a rate limit error
        if (whisperResponse.status === 429 && attempt < maxRetries) {
          const retryAfter = whisperResponse.headers.get("Retry-After");
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : Math.pow(2, attempt) * 1000;
          console.log(`Rate limited, retrying after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(
          `Whisper API error: ${whisperResponse.status} - ${errorText}`,
        );
      }

      return await whisperResponse.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `Transcription attempt ${attempt} failed, retrying after ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Transcription failed after retries");
}

// Helper function to download and transcribe audio
async function transcribeAudio(options: {
  audio_url?: string;
  audio_base64?: string;
  language?: string;
  prompt?: string;
  supabaseServiceKey: string;
  openaiApiKey: string;
}): Promise<{ text: string; duration?: number; language?: string }> {
  const {
    audio_url,
    audio_base64,
    language = "en",
    prompt,
    supabaseServiceKey,
    openaiApiKey,
  } = options;

  // Get audio data
  let audioBlob: Blob;

  if (audio_url) {
    // Download from URL
    const audioResponse = await fetch(audio_url, {
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!audioResponse.ok) {
      throw new Error("Failed to download audio");
    }

    audioBlob = await audioResponse.blob();
  } else if (audio_base64) {
    // Handle the mobile app's incorrect encoding
    // Mobile sends: file.readAsBytesSync().toString() which is NOT base64
    // We need to handle both correct base64 and the incorrect string format
    
    let bytes: Uint8Array;
    
    try {
      // First try standard base64 decode
      const binaryString = atob(audio_base64);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } catch (e) {
      // If that fails, the mobile app might have sent the bytes as a string
      // This is a temporary fix until mobile app is updated in v4.2.18
      console.warn('Invalid base64, attempting to parse as byte string');
      
      // Handle "[123, 45, 67, ...]" format
      if (audio_base64.startsWith('[')) {
        const byteArray = JSON.parse(audio_base64);
        bytes = new Uint8Array(byteArray);
      } else {
        throw new Error('Invalid audio data format');
      }
    }
    
    audioBlob = new Blob([bytes], { type: "audio/webm" });
  } else {
    throw new Error("No audio data provided");
  }

  // Check file size (25MB limit for Whisper API)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (audioBlob.size > maxSize) {
    throw new Error(
      `Audio file too large. Maximum size is 25MB, got ${
        (audioBlob.size / 1024 / 1024).toFixed(2)
      }MB`,
    );
  }

  // Transcribe with retry logic
  const whisperResult = await transcribeWithRetry(audioBlob, {
    language,
    prompt,
    openaiApiKey,
  });

  return {
    text: whisperResult.text,
    duration: whisperResult.duration,
    language: whisperResult.language,
  };
}

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

    const body: TranscriptionRequest = await req.json();
    const {
      audio_url,
      audio_base64,
      language = "en",
      prompt,
      message_id,
      batch,
    } = body;

    // Handle batch processing
    if (batch && batch.length > 0) {
      const batchResults: BatchTranscriptionResult[] = [];

      // Process in parallel with concurrency limit
      const concurrencyLimit = 3;
      for (let i = 0; i < batch.length; i += concurrencyLimit) {
        const chunk = batch.slice(i, i + concurrencyLimit);
        const chunkResults = await Promise.all(
          chunk.map(async (item) => {
            try {
              const result = await transcribeAudio({
                audio_url: item.audio_url,
                audio_base64: item.audio_base64,
                language: item.language || language,
                prompt: item.prompt || prompt,
                supabaseServiceKey,
                openaiApiKey,
              });

              return {
                id: item.id,
                text: result.text,
                duration: result.duration,
                language: result.language,
              };
            } catch (error) {
              const errorMessage = error instanceof Error
                ? error.message
                : "Transcription failed";
              return {
                id: item.id,
                text: "",
                error: errorMessage,
              };
            }
          }),
        );
        batchResults.push(...chunkResults);
      }

      return new Response(
        JSON.stringify({ batch_results: batchResults }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Single transcription
    const result = await transcribeAudio({
      audio_url,
      audio_base64,
      language,
      prompt,
      supabaseServiceKey,
      openaiApiKey,
    });

    // Update message if message_id provided
    if (message_id) {
      await supabase.rpc("complete_voice_upload", {
        p_message_id: message_id,
        p_voice_url: audio_url,
        p_voice_duration: Math.round(result.duration || 0),
        p_transcription: result.text,
      });
    }

    // Log usage for analytics
    await supabase.rpc("log_event", {
      params: {
        event_name: "audio_transcription",
        properties: {
          duration_seconds: result.duration,
          detected_language: result.language,
          user_id: user.id,
          has_message_id: !!message_id,
          is_batch: false,
        },
      },
    });

    const response: TranscriptionResponse = {
      text: result.text,
      duration: result.duration,
      language: result.language,
      message_id: message_id,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Transcription failed";
    console.error("Audio transcription error:", error);

    const response: TranscriptionResponse = {
      text: "",
      error: errorMessage,
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
