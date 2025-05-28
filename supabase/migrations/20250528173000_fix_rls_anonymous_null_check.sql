-- Fix RLS policies to properly handle NULL and boolean checks for is_anonymous
-- The issue is that (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE doesn't work as expected
-- We need to use COALESCE to handle potential NULL values

-- Drop the problematic profile update policy
DROP POLICY IF EXISTS "Only permanent users can update profile" ON profiles;

-- Create a more robust profile update policy
CREATE POLICY "Only permanent users can update profile" ON profiles
  AS RESTRICTIVE 
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  )
  WITH CHECK (
    auth.uid() = id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Drop other problematic policies and recreate with better NULL handling
DROP POLICY IF EXISTS "Only permanent users can insert profile" ON profiles;
CREATE POLICY "Only permanent users can insert profile" ON profiles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Fix profile categories
DROP POLICY IF EXISTS "Only permanent users can manage categories" ON profile_categories;
CREATE POLICY "Only permanent users can manage categories" ON profile_categories
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Fix messages
DROP POLICY IF EXISTS "Only permanent users can create messages" ON messages;
CREATE POLICY "Only permanent users can create messages" ON messages
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Fix checkins
DROP POLICY IF EXISTS "Only permanent users can manage checkins" ON checkins;
CREATE POLICY "Only permanent users can manage checkins" ON checkins
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Fix recommendations
DROP POLICY IF EXISTS "Only permanent users can update recommendations" ON recommendations;
CREATE POLICY "Only permanent users can update recommendations" ON recommendations
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

DROP POLICY IF EXISTS "Only permanent users can create recommendations" ON recommendations;
CREATE POLICY "Only permanent users can create recommendations" ON recommendations
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Fix user feedback
DROP POLICY IF EXISTS "Only permanent users can create feedback" ON user_feedback;
CREATE POLICY "Only permanent users can create feedback" ON user_feedback
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Fix audio logs
DROP POLICY IF EXISTS "Only permanent users can create audio logs" ON audio_usage_logs;
CREATE POLICY "Only permanent users can create audio logs" ON audio_usage_logs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Fix storage policies
DROP POLICY IF EXISTS "Only permanent users can upload images" ON storage.objects;
CREATE POLICY "Only permanent users can upload images" ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

DROP POLICY IF EXISTS "Only permanent users can update images" ON storage.objects;
CREATE POLICY "Only permanent users can update images" ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  )
  WITH CHECK (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

DROP POLICY IF EXISTS "Only permanent users can delete images" ON storage.objects;
CREATE POLICY "Only permanent users can delete images" ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Voice messages
DROP POLICY IF EXISTS "Only permanent users can upload voice messages" ON storage.objects;
CREATE POLICY "Only permanent users can upload voice messages" ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

DROP POLICY IF EXISTS "Only permanent users can update voice messages" ON storage.objects;
CREATE POLICY "Only permanent users can update voice messages" ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  )
  WITH CHECK (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

DROP POLICY IF EXISTS "Only permanent users can delete voice messages" ON storage.objects;
CREATE POLICY "Only permanent users can delete voice messages" ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  );

-- Add debugging function to test JWT claims
CREATE OR REPLACE FUNCTION debug_jwt_claims()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'jwt', auth.jwt(),
    'is_anonymous_raw', auth.jwt()->>'is_anonymous',
    'is_anonymous_bool', (auth.jwt()->>'is_anonymous')::boolean,
    'is_anonymous_coalesce', COALESCE((auth.jwt()->>'is_anonymous')::boolean, false),
    'user_id', auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION debug_jwt_claims() TO authenticated;

COMMENT ON FUNCTION debug_jwt_claims IS 'Helper function to debug JWT claims and is_anonymous checks';