-- Fix RLS policies to properly check for anonymous users using JWT claims
-- Anonymous users have 'is_anonymous' claim in their JWT that should be checked

-- First, let's drop the existing policies that aren't working correctly
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can manage own categories" ON profile_categories;
DROP POLICY IF EXISTS "All users can view own categories" ON profile_categories;
DROP POLICY IF EXISTS "Authenticated users can create messages" ON messages;
DROP POLICY IF EXISTS "All users can view own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can manage own checkins" ON checkins;
DROP POLICY IF EXISTS "All users can view own checkins" ON checkins;
DROP POLICY IF EXISTS "Authenticated users can update recommendations" ON recommendations;
DROP POLICY IF EXISTS "Authenticated users can create recommendations" ON recommendations;
DROP POLICY IF EXISTS "Authenticated users can create feedback" ON user_feedback;

-- Profiles policies
-- Drop existing policy and recreate
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- All authenticated users (including anonymous) can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Only permanent (non-anonymous) users can update their profile
CREATE POLICY "Only permanent users can update profile" ON profiles
  AS RESTRICTIVE 
  FOR UPDATE 
  TO authenticated
  USING (
    auth.uid() = id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  )
  WITH CHECK (
    auth.uid() = id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Only permanent users can insert profiles (handled by trigger for all users)
CREATE POLICY "Only permanent users can insert profile" ON profiles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Profile categories policies
-- Drop and recreate
DROP POLICY IF EXISTS "Users can view own categories" ON profile_categories;

-- All users can view their own categories
CREATE POLICY "Users can view own categories" ON profile_categories
  FOR SELECT USING (auth.uid() = user_id);

-- Only permanent users can manage categories
CREATE POLICY "Only permanent users can manage categories" ON profile_categories
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Messages policies
-- Drop and recreate
DROP POLICY IF EXISTS "Users can view own messages" ON messages;

-- All users can view their own messages
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

-- Only permanent users can create messages
CREATE POLICY "Only permanent users can create messages" ON messages
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Checkins policies
-- Drop and recreate
DROP POLICY IF EXISTS "Users can view own checkins" ON checkins;

-- All users can view their own checkins
CREATE POLICY "Users can view own checkins" ON checkins
  FOR SELECT USING (auth.uid() = user_id);

-- Only permanent users can manage checkins
CREATE POLICY "Only permanent users can manage checkins" ON checkins
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Recommendations policies
-- Drop and recreate
DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendations;

-- All users can view their own recommendations
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

-- Only permanent users can update recommendations
CREATE POLICY "Only permanent users can update recommendations" ON recommendations
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Only permanent users can create recommendations
CREATE POLICY "Only permanent users can create recommendations" ON recommendations
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- User feedback - only permanent users
DROP POLICY IF EXISTS "Users can view own feedback" ON user_feedback;
DROP POLICY IF EXISTS "Users can create own feedback" ON user_feedback;

CREATE POLICY "Only permanent users can create feedback" ON user_feedback
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Audio logs - only permanent users
DROP POLICY IF EXISTS "Authenticated users can create audio logs" ON audio_usage_logs;
DROP POLICY IF EXISTS "Users can view own audio logs" ON audio_usage_logs;
DROP POLICY IF EXISTS "Users can create own audio logs" ON audio_usage_logs;

CREATE POLICY "Only permanent users can create audio logs" ON audio_usage_logs
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Storage policies for user images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Only permanent users can upload images" ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
CREATE POLICY "Only permanent users can update images" ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  )
  WITH CHECK (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Only permanent users can delete images" ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Voice messages storage policies
DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
CREATE POLICY "Only permanent users can upload voice messages" ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

DROP POLICY IF EXISTS "Authenticated users can update voice messages" ON storage.objects;
CREATE POLICY "Only permanent users can update voice messages" ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  )
  WITH CHECK (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

DROP POLICY IF EXISTS "Authenticated users can delete voice messages" ON storage.objects;
CREATE POLICY "Only permanent users can delete voice messages" ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-messages' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE
  );

-- Add comment explaining the new approach
COMMENT ON POLICY "Only permanent users can update profile" ON profiles IS 
'Uses JWT is_anonymous claim to distinguish between anonymous and permanent users. Anonymous users have is_anonymous=true in their JWT.';

-- Summary:
-- Anonymous users (is_anonymous = true) can now:
-- ✅ View their own: profiles, categories, messages, checkins, recommendations
-- ✅ View public data: categories, coaches, app_config
-- ❌ Cannot: update profiles, create messages, manage categories, create checkins, upload files