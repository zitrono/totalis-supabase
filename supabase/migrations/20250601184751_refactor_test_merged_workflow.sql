-- Test migration to verify merged workflow functionality
-- This migration adds a comment to test the complete end-to-end workflow

-- Add comment to categories table for testing purposes
COMMENT ON TABLE categories IS 'Category hierarchy for organizing health and wellness topics - updated for complete merged workflow testing';

-- This change is benign and doesn't affect functionality
-- It will trigger the merged types generation and publishing workflow automatically