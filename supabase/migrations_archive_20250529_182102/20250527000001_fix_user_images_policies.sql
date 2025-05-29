-- Fix RLS policies for user-images bucket
-- This migration ensures users can properly upload, view, update, and delete their own images

-- First, drop any existing policies for user-images bucket
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
    DROP POLICY IF EXISTS "Test images can be managed" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update their own images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete their own images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view user images" ON storage.objects;
    DROP POLICY IF EXISTS "Test images can be managed by authenticated users" ON storage.objects;
END $$;

-- Policy 1: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'user-images' AND
    (
        -- User's own folder: user-images/[user-id]/...
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Test uploads: user-images/test-*/...
        (storage.foldername(name))[1] LIKE 'test-%'
        OR
        -- Direct test files: user-images/test-*.png
        name LIKE 'test-%'
    )
);

-- Policy 2: Allow authenticated users to view all images in user-images bucket
CREATE POLICY "Authenticated users can view user images" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'user-images'
);

-- Policy 3: Allow public to view all images in user-images bucket (for public profiles)
CREATE POLICY "Public can view user images" ON storage.objects
FOR SELECT TO anon USING (
    bucket_id = 'user-images'
);

-- Policy 4: Allow users to update their own images
CREATE POLICY "Users can update own images" ON storage.objects
FOR UPDATE TO authenticated USING (
    bucket_id = 'user-images' AND
    (
        -- Check owner
        owner = auth.uid()
        OR
        -- User's own folder
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Test files
        (storage.foldername(name))[1] LIKE 'test-%'
        OR
        name LIKE 'test-%'
    )
);

-- Policy 5: Allow users to delete their own images
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE TO authenticated USING (
    bucket_id = 'user-images' AND
    (
        -- Check owner
        owner = auth.uid()
        OR
        -- User's own folder
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Test files
        (storage.foldername(name))[1] LIKE 'test-%'
        OR
        name LIKE 'test-%'
    )
);

-- Policy 6: Service role can do anything
CREATE POLICY "Service role has full access" ON storage.objects
FOR ALL TO service_role USING (bucket_id = 'user-images');