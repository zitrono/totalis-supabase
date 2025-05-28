-- Test migration to verify preview environment isolation
-- This should only exist in the preview branch, not in production

CREATE TABLE IF NOT EXISTS public.preview_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies
ALTER TABLE public.preview_test ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Users can read preview test data"
    ON public.preview_test
    FOR SELECT
    TO authenticated
    USING (true);

-- Add comment to verify this migration
COMMENT ON TABLE public.preview_test IS 'Test table for preview environment isolation verification';