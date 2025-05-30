-- Remove anonymous user support infrastructure
-- This migration cleans up any remaining anonymous-specific elements

-- Drop anonymous-specific objects if they exist
DROP TABLE IF EXISTS account_links CASCADE;
DROP FUNCTION IF EXISTS check_auth_type() CASCADE;
DROP TYPE IF EXISTS auth_type CASCADE;
DROP FUNCTION IF EXISTS create_profile_if_needed() CASCADE;

-- Clean up any remaining anonymous user data in profiles (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        UPDATE profiles 
        SET metadata = metadata - 'anonymous' - 'auth_type'
        WHERE metadata ? 'anonymous' OR metadata ? 'auth_type';
    END IF;
END $$;

-- Revoke permissions from anon role if functions exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_last_seen') THEN
        REVOKE ALL ON FUNCTION update_last_seen() FROM anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_analytics_event') THEN
        REVOKE ALL ON FUNCTION log_analytics_event(text, jsonb) FROM anon;
    END IF;
END $$;

-- Add comment explaining the simplification
COMMENT ON SCHEMA public IS 'Simplified schema with authenticated users only - no anonymous access';