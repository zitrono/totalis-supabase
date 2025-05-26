-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Test images can be managed" ON storage.objects;

-- Create new policies for user-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'user-images'
);

-- Allow authenticated users to update their own images
CREATE POLICY "Authenticated users can update their own images" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'user-images' AND 
  auth.uid()::text = owner
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete their own images" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'user-images' AND 
  auth.uid()::text = owner
);

-- Allow anyone to view images in user-images bucket
CREATE POLICY "Anyone can view user images" ON storage.objects
FOR SELECT USING (bucket_id = 'user-images');

-- Allow test images to be managed by authenticated users
CREATE POLICY "Test images can be managed by authenticated users" ON storage.objects
FOR ALL TO authenticated USING (
  bucket_id = 'user-images' AND 
  (name LIKE 'test-%' OR path LIKE 'test-%')
) WITH CHECK (
  bucket_id = 'user-images' AND 
  (name LIKE 'test-%' OR path LIKE 'test-%')
);