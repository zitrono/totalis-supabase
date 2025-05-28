/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'
import { createMonitoringContext } from '../_shared/monitoring.ts'
import { getTestMetadata } from '../_shared/test-data.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB limit per OpenAI

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Extract test metadata
  const testMetadata = getTestMetadata(req)
  const monitoring = createMonitoringContext('audio-transcribe', testMetadata)
  
  try {

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client with service key for auth verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Get authenticated user - extract token from header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse multipart form data
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      throw new Error('No audio file provided')
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 25MB limit`)
    }

    // Validate file type
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm', 'audio/mpeg']
    if (!allowedTypes.includes(audioFile.type)) {
      throw new Error(`Invalid file type: ${audioFile.type}`)
    }

    // Generate unique filename
    const timestamp = new Date().toISOString()
    const filename = `${user.id}/${timestamp}-${audioFile.name}`

    // Upload to Supabase Storage
    const arrayBuffer = await audioFile.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('voice-recordings')
      .upload(filename, arrayBuffer, {
        contentType: audioFile.type,
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    // TODO: Call OpenAI Whisper API for transcription
    // For now, return mock transcription
    const transcription = {
      text: `[Mock transcription of ${audioFile.name}]`,
      duration: 0,
      language: 'en'
    }

    // Store transcription record
    const { data: record, error: dbError } = await supabase
      .from('audio_transcriptions')
      .insert({
        user_id: user.id,
        filename: filename,
        transcription: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
        metadata: {
          test: req.headers.get('X-Test-Mode') === 'true',
          test_run_id: req.headers.get('X-Test-Run-ID'),
          file_size: audioFile.size,
          file_type: audioFile.type
        }
      })
      .select()
      .single()

    if (dbError) {
      // Try to clean up uploaded file
      await supabase.storage.from('voice-recordings').remove([filename])
      throw new Error(`Failed to save transcription: ${dbError.message}`)
    }

    // Track success
    monitoring.trackSuccess(user.id, { transcriptionLength: transcription.text.length })

    return new Response(
      JSON.stringify({
        id: record.id,
        transcription: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
        created_at: record.created_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    // Track error
    monitoring.trackError(error instanceof Error ? error : new Error(String(error)))

    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorMessage.includes('authentication') ? 401 : 400
      }
    )
  }
})