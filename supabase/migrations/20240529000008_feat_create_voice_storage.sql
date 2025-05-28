-- Create voice-messages storage bucket
-- This must be run via Supabase dashboard or API as storage operations
-- are not supported in migrations

-- Note: Run this SQL in Supabase SQL Editor:
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages', 
  'voice-messages', 
  false,
  10485760, -- 10MB limit
  ARRAY['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg']
);
*/

-- Storage bucket creation and RLS policies must be done via Supabase dashboard
-- or using the management API, not in migrations.
-- See the SQL comments below for the policies to create.

-- Add voice message tracking to messages table
-- (Already added in previous migration)

-- Create function to clean up old voice messages
CREATE OR REPLACE FUNCTION cleanup_old_voice_messages()
RETURNS void AS $$
DECLARE
  v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Delete voice messages older than 90 days
  v_cutoff_date := NOW() - INTERVAL '90 days';
  
  -- Delete from storage (this would need to be done via API)
  -- For now, just mark messages as having expired audio
  UPDATE messages
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{voice_expired}',
    'true'::jsonb
  )
  WHERE voice_url IS NOT NULL
    AND created_at < v_cutoff_date
    AND (metadata->>'voice_expired')::boolean IS NOT true;
END;
$$ LANGUAGE plpgsql;

-- Create index for voice message queries
CREATE INDEX IF NOT EXISTS idx_messages_voice_url 
ON messages(voice_url) 
WHERE voice_url IS NOT NULL;

-- Comments
COMMENT ON FUNCTION cleanup_old_voice_messages 
IS 'Marks old voice messages as expired (actual deletion requires API calls)';