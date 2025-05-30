-- Fix RLS policies to properly handle anonymous users
-- Anonymous users should have limited access compared to authenticated users

-- Helper function to check if user is anonymous
CREATE OR REPLACE FUNCTION is_anonymous_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has anonymous metadata or null email
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND (
      email IS NULL 
      OR email LIKE '%@anonymous.totalis.app'
      OR raw_app_meta_data->>'is_anonymous' = 'true'
      OR raw_app_meta_data->>'provider' = 'anonymous'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profiles policies to restrict anonymous users
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Authenticated users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = id 
    AND NOT is_anonymous_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Anonymous users should only be able to read categories, not manage them
DROP POLICY IF EXISTS "Users can manage own categories" ON profile_categories;
CREATE POLICY "Authenticated users can manage own categories" ON profile_categories
  FOR ALL USING (
    auth.uid() = user_id 
    AND NOT is_anonymous_user(auth.uid())
  );

-- Keep read access for all users including anonymous
CREATE POLICY "All users can view own categories" ON profile_categories
  FOR SELECT USING (auth.uid() = user_id);

-- Messages - anonymous users can only read, not create
DROP POLICY IF EXISTS "Users can create own messages" ON messages;
CREATE POLICY "Authenticated users can create messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND NOT is_anonymous_user(auth.uid())
  );

-- Keep read access for messages
CREATE POLICY "All users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

-- Check-ins - anonymous users cannot create or manage check-ins
DROP POLICY IF EXISTS "Users can manage own checkins" ON checkins;
CREATE POLICY "Authenticated users can manage own checkins" ON checkins
  FOR ALL USING (
    auth.uid() = user_id 
    AND NOT is_anonymous_user(auth.uid())
  );

-- Allow anonymous users to view checkins (for demo purposes)
CREATE POLICY "All users can view own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

-- Recommendations - anonymous users can only view
DROP POLICY IF EXISTS "Users can update own recommendations" ON recommendations;
CREATE POLICY "Authenticated users can update recommendations" ON recommendations
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND NOT is_anonymous_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own recommendations" ON recommendations;
CREATE POLICY "Authenticated users can create recommendations" ON recommendations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND NOT is_anonymous_user(auth.uid())
  );

-- User feedback - anonymous users cannot create feedback
DROP POLICY IF EXISTS "Users can create own feedback" ON user_feedback;
CREATE POLICY "Authenticated users can create feedback" ON user_feedback
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND NOT is_anonymous_user(auth.uid())
  );

-- Audio usage logs - anonymous users cannot log audio usage
DROP POLICY IF EXISTS "Users can create own audio logs" ON audio_usage_logs;
CREATE POLICY "Authenticated users can create audio logs" ON audio_usage_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND NOT is_anonymous_user(auth.uid())
  );

-- Storage policies for images - anonymous users can only view
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND NOT is_anonymous_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Authenticated users can update images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND NOT is_anonymous_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND NOT is_anonymous_user(auth.uid())
  );

-- Voice messages - anonymous users cannot manage
DROP POLICY IF EXISTS "Users can upload voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can upload voice messages" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND NOT is_anonymous_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can update voice messages" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND NOT is_anonymous_user(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can delete voice messages" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND NOT is_anonymous_user(auth.uid())
  );

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION is_anonymous_user(UUID) TO authenticated;

-- Add comment explaining the policy structure
COMMENT ON FUNCTION is_anonymous_user IS 'Helper function to identify anonymous users for RLS policies. Anonymous users have restricted write access across the application.';

-- Summary of anonymous user restrictions:
-- ✅ Can view: profiles, categories, messages, checkins, recommendations, public images
-- ❌ Cannot: update profiles, manage categories, create messages, create checkins, update recommendations, upload files, create feedback