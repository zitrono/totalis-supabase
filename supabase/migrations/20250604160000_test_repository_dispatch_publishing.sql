-- Test repository_dispatch publishing workflow
-- This migration triggers the fixed CI/CD pipeline that uses repository_dispatch
-- to overcome GitHub App workflow triggering limitations

-- Add a comment to trigger v1.0.153 with repository_dispatch publishing
COMMENT ON TABLE public.categories IS 'Categories table - testing repository_dispatch for v1.0.153';