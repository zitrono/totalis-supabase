-- Phase 3: Voice Features & Offline Support

-- Update cleanup function to handle test files
CREATE OR REPLACE FUNCTION cleanup_old_voice_messages()
RETURNS void AS $$
DECLARE
  v_cutoff_date TIMESTAMP WITH TIME ZONE;
  v_test_cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Delete test voice messages older than 1 hour
  v_test_cutoff := NOW() - INTERVAL '1 hour';
  
  -- Delete regular voice messages older than 90 days
  v_cutoff_date := NOW() - INTERVAL '90 days';
  
  -- Mark test messages as expired
  UPDATE messages
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{voice_expired}',
    'true'::jsonb
  )
  WHERE voice_url IS NOT NULL
    AND voice_url LIKE '%/test-%'
    AND created_at < v_test_cutoff
    AND (metadata->>'voice_expired')::boolean IS NOT true;
  
  -- Mark old regular messages as expired
  UPDATE messages
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{voice_expired}',
    'true'::jsonb
  )
  WHERE voice_url IS NOT NULL
    AND voice_url NOT LIKE '%/test-%'
    AND created_at < v_cutoff_date
    AND (metadata->>'voice_expired')::boolean IS NOT true;
END;
$$ LANGUAGE plpgsql;

-- Create table for offline queue tracking
CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('message', 'voice', 'checkin', 'profile')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for offline queue queries
CREATE INDEX IF NOT EXISTS idx_offline_queue_user_status 
ON offline_queue(user_id, status);

CREATE INDEX IF NOT EXISTS idx_offline_queue_created 
ON offline_queue(created_at) 
WHERE status = 'pending';

-- Drop existing function if parameter names differ
DROP FUNCTION IF EXISTS batch_create_messages(JSONB);

-- Enhanced batch message creation with conflict resolution
CREATE OR REPLACE FUNCTION batch_create_messages(
  messages_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_message JSONB;
  v_message_id UUID;
  v_success BOOLEAN;
  v_error_msg TEXT;
  v_user_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Process each message
  FOR v_message IN SELECT * FROM jsonb_array_elements(messages_data)
  LOOP
    BEGIN
      v_success := true;
      v_error_msg := NULL;
      
      -- Extract required fields
      v_user_id := (v_message->>'user_id')::UUID;
      v_conversation_id := (v_message->>'conversation_id')::UUID;
      
      -- Check for duplicate (based on local_id and created_at)
      IF v_message->>'local_id' IS NOT NULL THEN
        SELECT id INTO v_message_id
        FROM messages
        WHERE user_id = v_user_id
          AND conversation_id = v_conversation_id
          AND metadata->>'local_id' = v_message->>'local_id';
        
        IF v_message_id IS NOT NULL THEN
          -- Message already exists, skip
          v_result := v_result || jsonb_build_object(
            'local_id', v_message->>'local_id',
            'server_id', v_message_id,
            'success', true,
            'action', 'skipped'
          );
          CONTINUE;
        END IF;
      END IF;
      
      -- Insert the message
      INSERT INTO messages (
        conversation_id,
        user_id,
        message_text,
        message_type,
        voice_url,
        voice_duration,
        is_read,
        metadata,
        created_at
      ) VALUES (
        v_conversation_id,
        v_user_id,
        v_message->>'message_text',
        COALESCE(v_message->>'message_type', 'text'),
        v_message->>'voice_url',
        (v_message->>'voice_duration')::INT,
        COALESCE((v_message->>'is_read')::BOOLEAN, false),
        jsonb_build_object(
          'local_id', v_message->>'local_id',
          'offline_created', true,
          'sync_timestamp', NOW()
        ) || COALESCE(v_message->'metadata', '{}'::jsonb),
        COALESCE((v_message->>'created_at')::TIMESTAMPTZ, NOW())
      )
      RETURNING id INTO v_message_id;
      
      v_result := v_result || jsonb_build_object(
        'local_id', v_message->>'local_id',
        'server_id', v_message_id,
        'success', true,
        'action', 'created'
      );
      
    EXCEPTION WHEN OTHERS THEN
      v_success := false;
      v_error_msg := SQLERRM;
      
      v_result := v_result || jsonb_build_object(
        'local_id', v_message->>'local_id',
        'success', false,
        'error', v_error_msg
      );
    END;
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- Function to handle voice message upload completion
CREATE OR REPLACE FUNCTION complete_voice_upload(
  p_message_id UUID,
  p_voice_url TEXT,
  p_voice_duration INT,
  p_transcription TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the message with voice information
  UPDATE messages
  SET 
    voice_url = p_voice_url,
    voice_duration = p_voice_duration,
    metadata = jsonb_set(
      jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{voice_uploaded}',
        'true'::jsonb
      ),
      '{transcription}',
      COALESCE(to_jsonb(p_transcription), 'null'::jsonb)
    ),
    updated_at = NOW()
  WHERE id = p_message_id
    AND user_id = auth.uid()
  RETURNING jsonb_build_object(
    'id', id,
    'voice_url', voice_url,
    'voice_duration', voice_duration,
    'transcription', metadata->>'transcription'
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Message not found or unauthorized';
  END IF;
  
  RETURN v_result;
END;
$$;

-- Function to retry failed offline operations
CREATE OR REPLACE FUNCTION retry_offline_operations(
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operations JSONB := '[]'::jsonb;
  v_op RECORD;
  v_result JSONB;
  v_success BOOLEAN;
BEGIN
  -- Get pending operations
  FOR v_op IN 
    SELECT * FROM offline_queue
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
      AND status = 'pending'
      AND retry_count < 3
    ORDER BY created_at ASC
    LIMIT p_limit
  LOOP
    -- Update status to processing
    UPDATE offline_queue
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = v_op.id;
    
    -- Process based on operation type
    v_success := false;
    BEGIN
      CASE v_op.operation_type
        WHEN 'message' THEN
          -- Process message using batch function
          v_result := batch_create_messages(jsonb_build_array(v_op.payload));
          v_success := (v_result->0->>'success')::boolean;
          
        WHEN 'voice' THEN
          -- Voice upload handled separately via edge function
          v_success := true; -- Mark as success to remove from queue
          
        WHEN 'checkin' THEN
          -- Process checkin
          -- This would call the checkin edge function
          v_success := true; -- Placeholder
          
        WHEN 'profile' THEN
          -- Process profile update
          UPDATE user_profiles
          SET 
            name = COALESCE(v_op.payload->>'name', name),
            yearOfBirth = COALESCE((v_op.payload->>'yearOfBirth')::INT, yearOfBirth),
            sex = COALESCE(v_op.payload->>'sex', sex),
            updated_at = NOW()
          WHERE user_id = v_op.user_id;
          v_success := true;
      END CASE;
      
      -- Update operation status
      IF v_success THEN
        UPDATE offline_queue
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = v_op.id;
      ELSE
        UPDATE offline_queue
        SET status = 'failed',
            retry_count = retry_count + 1,
            error_message = COALESCE(v_result->0->>'error', 'Unknown error'),
            updated_at = NOW()
        WHERE id = v_op.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle errors
      UPDATE offline_queue
      SET status = 'failed',
          retry_count = retry_count + 1,
          error_message = SQLERRM,
          updated_at = NOW()
      WHERE id = v_op.id;
    END;
    
    -- Add to results
    v_operations := v_operations || jsonb_build_object(
      'id', v_op.id,
      'operation_type', v_op.operation_type,
      'success', v_success,
      'status', CASE WHEN v_success THEN 'completed' ELSE 'failed' END
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'processed', jsonb_array_length(v_operations),
    'operations', v_operations
  );
END;
$$;

-- RLS policies for offline queue
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offline operations"
  ON offline_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own offline operations"
  ON offline_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offline operations"
  ON offline_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offline operations"
  ON offline_queue FOR DELETE
  USING (auth.uid() = user_id);

-- Add voice storage bucket RLS policies via comments
-- These need to be added via Supabase dashboard:
/*
-- Voice Messages Bucket Policies:

-- 1. Allow users to upload to their own folder
CREATE POLICY "Users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 2. Allow users to view voice messages in their conversations
CREATE POLICY "Users can view voice messages"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-messages' AND (
    -- Own messages
    auth.uid()::text = (string_to_array(name, '/'))[1] OR
    -- Messages in conversations they're part of
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.voice_url LIKE '%' || objects.name
        AND c.user_id = auth.uid()
    ) OR
    -- TTS messages for them
    name LIKE 'tts/' || auth.uid()::text || '/%'
  )
);

-- 3. Allow users to update their own voice messages
CREATE POLICY "Users can update own voice messages"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 4. Allow users to delete their own voice messages
CREATE POLICY "Users can delete own voice messages"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 5. Service role has full access
CREATE POLICY "Service role full access"
ON storage.objects
USING (auth.role() = 'service_role');
*/

-- Update transcribe edge function to handle batch operations
-- This is a comment showing what needs to be added to the edge function:
/*
Edge Function Updates needed for audio-transcription:

1. Add retry logic for OpenAI API calls
2. Support batch transcription requests
3. Add webhook support for async processing
4. Implement proper error handling and logging
*/

-- Add function to get voice message statistics
CREATE OR REPLACE FUNCTION get_voice_message_stats(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_voice_messages', COUNT(*) FILTER (WHERE voice_url IS NOT NULL),
    'total_duration_seconds', COALESCE(SUM(voice_duration), 0),
    'transcribed_count', COUNT(*) FILTER (WHERE metadata->>'transcription' IS NOT NULL),
    'expired_count', COUNT(*) FILTER (WHERE (metadata->>'voice_expired')::boolean = true),
    'test_messages', COUNT(*) FILTER (WHERE voice_url LIKE '%/test-%')
  ) INTO v_stats
  FROM messages
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND voice_url IS NOT NULL;
  
  RETURN v_stats;
END;
$$;

-- Comments
COMMENT ON TABLE offline_queue IS 'Tracks operations performed while offline for later sync';
COMMENT ON FUNCTION batch_create_messages IS 'Creates multiple messages in a single transaction with conflict resolution';
COMMENT ON FUNCTION complete_voice_upload IS 'Updates a message after voice file upload is complete';
COMMENT ON FUNCTION retry_offline_operations IS 'Processes pending offline operations';
COMMENT ON FUNCTION get_voice_message_stats IS 'Returns statistics about voice message usage';