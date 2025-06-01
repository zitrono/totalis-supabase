-- Benign schema change for full cycle testing
-- This migration adds a comment to test automatic workflow triggering

-- Add comment to coaches table for testing purposes
COMMENT ON TABLE coaches IS 'Coach profiles for user guidance and support - updated for workflow testing';

-- This change is benign and doesn't affect functionality
-- It will trigger the types generation workflow automatically