-- Fix integrated OIDC publishing workflow
-- This migration triggers the updated CI/CD pipeline that now includes
-- both type generation AND publishing in a single workflow

-- Add a comment to demonstrate the fix is working
COMMENT ON TABLE public.profiles IS 'User profiles table - triggers v1.0.152 with integrated OIDC publishing';