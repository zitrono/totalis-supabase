/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { createMonitoringContext } from "../_shared/monitoring.ts";
import { getTestMetadata, mergeTestMetadata } from "../_shared/test-data.ts";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const monitoring = createMonitoringContext("audio-transcribe");

  try {
    // Track function start
    monitoring.trackStart();

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      token,
    );
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    // Get test metadata
    const testMetadata = getTestMetadata(req);

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 25MB limit`);
    }

    // Validate file type
    const allowedTypes = [
      "audio/mp3",
      "audio/wav",
      "audio/m4a",
      "audio/ogg",
      "audio/webm",
      "audio/mpeg",
      "application/octet-stream",
    ];
    if (
      !allowedTypes.includes(audioFile.type) &&
      !audioFile.type.startsWith("audio/")
    ) {
      throw new Error(`Invalid file type: ${audioFile.type}`);
    }

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      // Return mock transcription if no API key
      const mockTranscription = {
        text: `[Mock transcription of ${audioFile.name}]`,
        duration: 0,
        language: "en",
      };

      // Store transcription record without file storage
      const { data: record, error: dbError } = await supabase
        .from("audio_transcriptions")
        .insert({
          user_id: user.id,
          transcription: mockTranscription.text,
          duration: mockTranscription.duration,
          language: mockTranscription.language,
          metadata: mergeTestMetadata({
            file_size: audioFile.size,
            file_type: audioFile.type,
            file_name: audioFile.name,
            mock: true,
          }, testMetadata),
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to save transcription: ${dbError.message}`);
      }

      // Track success
      monitoring.trackSuccess(user.id, {
        mock: true,
        fileSize: audioFile.size,
      });

      return new Response(
        JSON.stringify({
          id: record.id,
          transcription: mockTranscription.text,
          duration: mockTranscription.duration,
          language: mockTranscription.language,
          created_at: record.created_at,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Convert audio file to form data for OpenAI
    const openAIFormData = new FormData();
    openAIFormData.append("file", audioFile);
    openAIFormData.append("model", "whisper-1");
    openAIFormData.append("language", "en"); // Optional: specify language

    // Call OpenAI Whisper API
    const openAIResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: openAIFormData,
      },
    );

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const transcriptionResult = await openAIResponse.json();

    // Store transcription record
    const { data: record, error: dbError } = await supabase
      .from("audio_transcriptions")
      .insert({
        user_id: user.id,
        transcription: transcriptionResult.text,
        duration: transcriptionResult.duration || 0,
        language: transcriptionResult.language || "en",
        metadata: mergeTestMetadata({
          file_size: audioFile.size,
          file_type: audioFile.type,
          file_name: audioFile.name,
        }, testMetadata),
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save transcription: ${dbError.message}`);
    }

    // Track success
    monitoring.trackSuccess(user.id, {
      transcriptionLength: transcriptionResult.text.length,
    });

    return new Response(
      JSON.stringify({
        id: record.id,
        transcription: transcriptionResult.text,
        duration: transcriptionResult.duration || 0,
        language: transcriptionResult.language || "en",
        created_at: record.created_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    // Track error
    monitoring.trackError(
      error instanceof Error ? error : new Error(String(error)),
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: errorMessage.includes("authentication") ? 401 : 400,
      },
    );
  }
});
