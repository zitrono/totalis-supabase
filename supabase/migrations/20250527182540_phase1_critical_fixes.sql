-- Phase 1: Critical Infrastructure Fixes
-- =====================================

-- 1. Create recommendations_with_children view
-- This view is needed by the mobile app for hierarchical recommendation display
CREATE OR REPLACE VIEW recommendations_with_children AS
SELECT 
  r.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', rc.id,
        'title', rc.title,
        'recommendation_text', rc.recommendation_text,
        'action', rc.action,
        'importance', rc.importance,
        'category_id', rc.category_id,
        'created_at', rc.created_at
      ) ORDER BY rc.importance DESC NULLS LAST, rc.created_at
    ) FILTER (WHERE rc.id IS NOT NULL),
    '[]'::json
  ) as children
FROM recommendations r
LEFT JOIN recommendations rc ON rc.parent_recommendation_id = r.id
GROUP BY r.id;

-- Grant appropriate permissions
GRANT SELECT ON recommendations_with_children TO authenticated;
GRANT SELECT ON recommendations_with_children TO anon;

-- 2. Fix RPC function name mismatch
-- Mobile app expects mark_messages_read but backend has mark_thread_messages_read
-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS mark_messages_read(UUID);

CREATE FUNCTION mark_messages_read(conversation_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all messages in the conversation/thread as read
  UPDATE messages
  SET is_read = true
  WHERE thread_id = conversation_id_param
    AND user_id != auth.uid()  -- Don't mark own messages as read
    AND is_read = false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID) TO authenticated;

-- 3. Add function to check if email exists (for account linking)
CREATE OR REPLACE FUNCTION check_email_exists(email_param text)
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = lower(email_param)
    AND id != auth.uid()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_email_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_exists(text) TO anon;

-- 4. Add batch message creation support
CREATE OR REPLACE FUNCTION batch_create_messages(messages jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_record jsonb;
  result jsonb;
  results jsonb[] := '{}';
  inserted_id uuid;
BEGIN
  -- Process each message
  FOR message_record IN SELECT * FROM jsonb_array_elements(messages)
  LOOP
    BEGIN
      -- Insert message
      INSERT INTO messages (
        thread_id,
        user_id,
        content,
        message_type,
        is_from_coach,
        metadata
      ) VALUES (
        (message_record->>'thread_id')::uuid,
        auth.uid(),
        message_record->>'content',
        COALESCE(message_record->>'message_type', 'text'),
        COALESCE((message_record->>'is_from_coach')::boolean, false),
        COALESCE(message_record->'metadata', '{}'::jsonb)
      )
      RETURNING id INTO inserted_id;
      
      -- Add success result
      results := results || jsonb_build_object(
        'success', true,
        'local_id', message_record->>'local_id',
        'server_id', inserted_id
      );
    EXCEPTION WHEN OTHERS THEN
      -- Add failure result
      results := results || jsonb_build_object(
        'success', false,
        'local_id', message_record->>'local_id',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_array(results);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION batch_create_messages(jsonb) TO authenticated;

-- 5. Update handle_new_user to ensure anonymous users are properly marked
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is an anonymous user
  IF NEW.email IS NULL OR NEW.email LIKE '%@anonymous.totalis.app' THEN
    -- Update user metadata to mark as anonymous
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
                           '{"provider": "anonymous", "is_anonymous": true}'::jsonb
    WHERE id = NEW.id;
  END IF;

  -- Create profile for user
  INSERT INTO public.profiles (id, email, metadata)
  VALUES (
    NEW.id,
    NEW.email,
    jsonb_build_object(
      'created_via', 'auth_trigger',
      'is_anonymous', (NEW.email IS NULL OR NEW.email LIKE '%@anonymous.totalis.app')
    )
  );

  RETURN NEW;
END;
$$;

-- 6. Create check-in progress table for Phase 2 preparation
CREATE TABLE IF NOT EXISTS checkin_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  current_question_index INT DEFAULT 0,
  answers JSONB DEFAULT '[]',
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_id)
);

-- Create index for performance
CREATE INDEX idx_checkin_progress_user_status ON checkin_progress(user_id, status);

-- Enable RLS
ALTER TABLE checkin_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own checkin progress" ON checkin_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own checkin progress" ON checkin_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkin progress" ON checkin_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON checkin_progress TO authenticated;

-- 7. Add helper function to clean up old voice messages (for Phase 3)
CREATE OR REPLACE FUNCTION cleanup_old_voice_messages()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete test voice messages older than 30 days
  DELETE FROM storage.objects 
  WHERE bucket_id = 'voice-messages' 
    AND created_at < NOW() - INTERVAL '30 days'
    AND name LIKE 'test-%';
    
  -- Delete orphaned voice messages (no corresponding message record)
  DELETE FROM storage.objects o
  WHERE o.bucket_id = 'voice-messages'
    AND NOT EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.metadata->>'voice_url' LIKE '%' || o.name
    );
END;
$$;

-- Grant execute permission to service role only
-- This function should be called by a scheduled job, not directly by users

-- 8. Add updated_at trigger for checkin_progress
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checkin_progress_updated_at
  BEFORE UPDATE ON checkin_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();