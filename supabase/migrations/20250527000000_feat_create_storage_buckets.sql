-- Create storage bucket for user images
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('user-images', 'user-images', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for user images bucket
CREATE POLICY "Users can upload their own images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view images" ON storage.objects
FOR SELECT USING (bucket_id = 'user-images');

-- Allow test images to be uploaded/managed
CREATE POLICY "Test images can be managed" ON storage.objects
FOR ALL USING (
  bucket_id = 'user-images' AND 
  (storage.foldername(name))[1] LIKE 'test-%'
);