-- Full cycle test migration for GitHub Apps automated publishing
-- This migration adds a comment to test the complete end-to-end workflow

-- Add comment to recommendations table for testing purposes
COMMENT ON TABLE recommendations IS 'AI-generated health recommendations and guidance - full cycle automation test';

-- This change is benign and doesn't affect functionality
-- It will trigger: Types generation ’ Tag creation ’ Manual trigger ’ OIDC publishing ’ pub.dev