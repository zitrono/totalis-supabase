-- Create storage buckets expected by mobile app (v4.2.19)
-- Note: Mobile app expects these exact bucket names

-- Insert storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES 
  ('user-images', 'user-images', true, NOW(), NOW()),      -- Mobile uses 'user-images' not 'user-profiles'
  ('coach-images', 'coach-images', true, NOW(), NOW()),
  ('category-icons', 'category-icons', true, NOW(), NOW()),
  ('voice-messages', 'voice-messages', false, NOW(), NOW()) -- For audio recordings
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user images
DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
CREATE POLICY "Users can upload own profile image" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can view user images" ON storage.objects;
CREATE POLICY "Anyone can view user images" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-images');

DROP POLICY IF EXISTS "Users can update own profile image" ON storage.objects;
CREATE POLICY "Users can update own profile image" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own profile image" ON storage.objects;
CREATE POLICY "Users can delete own profile image" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Coach images policies (public read)
DROP POLICY IF EXISTS "Anyone can view coach images" ON storage.objects;
CREATE POLICY "Anyone can view coach images" ON storage.objects
  FOR SELECT USING (bucket_id = 'coach-images');

-- Category icons policies (public read)
DROP POLICY IF EXISTS "Anyone can view category icons" ON storage.objects;
CREATE POLICY "Anyone can view category icons" ON storage.objects
  FOR SELECT USING (bucket_id = 'category-icons');

-- Voice messages policies (private)
DROP POLICY IF EXISTS "Users can upload own voice messages" ON storage.objects;
CREATE POLICY "Users can upload own voice messages" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-messages' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can access own voice messages" ON storage.objects;
CREATE POLICY "Users can access own voice messages" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-messages' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );