-- Voice messages storage bucket RLS policies
-- Note: These policies must be created via Supabase Dashboard or Management API
-- as we cannot modify storage.objects table in migrations

-- To fix voice-messages bucket RLS, run these commands in SQL Editor:

/*
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access to voice messages" ON storage.objects;

-- Service role has full access
CREATE POLICY "Service role has full access to voice messages" ON storage.objects
FOR ALL USING (
  bucket_id = 'voice-messages' AND
  auth.jwt()->>'role' = 'service_role'
);

-- Users can upload voice messages to their own folder
CREATE POLICY "Users can upload voice messages" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'voice-messages' AND
  auth.role() = 'authenticated' AND
  (
    -- User's own folder
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Test uploads
    name LIKE 'test-%'
  )
);

-- Users can view their own voice messages
CREATE POLICY "Users can view own voice messages" ON storage.objects
FOR SELECT USING (
  bucket_id = 'voice-messages' AND
  auth.role() = 'authenticated' AND
  (
    -- User's own folder
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Test files
    name LIKE 'test-%'
  )
);

-- Users can update their own voice messages
CREATE POLICY "Users can update own voice messages" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'voice-messages' AND
  auth.role() = 'authenticated' AND
  (
    -- User's own folder
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Test files
    name LIKE 'test-%'
  )
);

-- Users can delete their own voice messages
CREATE POLICY "Users can delete own voice messages" ON storage.objects
FOR DELETE USING (
  bucket_id = 'voice-messages' AND
  auth.role() = 'authenticated' AND
  (
    -- User's own folder
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Test files
    name LIKE 'test-%'
  )
);

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages', 
  'voice-messages', 
  false,
  10485760, -- 10MB limit
  ARRAY['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = EXCLUDED.allowed_mime_types;
*/

-- This migration serves as documentation for the required storage policies