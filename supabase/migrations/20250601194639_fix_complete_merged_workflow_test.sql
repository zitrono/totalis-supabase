-- Test migration to verify complete merged workflow with proper credentials
-- This migration adds a comment to test the end-to-end functionality

-- Add comment to profiles table for testing purposes
COMMENT ON TABLE profiles IS 'User profiles with coach assignments and preferences - GitHub Apps automated test';

-- This change is benign and doesn't affect functionality
-- It will trigger the complete merged workflow and should successfully publish to pub.dev