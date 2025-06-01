-- Test Migration: Lifecycle Automation Validation
-- This migration adds a test column to validate the full types generation lifecycle

-- Add a test column to profiles table for lifecycle validation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS test_lifecycle_field TEXT DEFAULT 'auto-generated-test';

-- Add a comment to document this is for testing
COMMENT ON COLUMN profiles.test_lifecycle_field IS 'Test field for validating automatic types generation lifecycle';

-- This change should trigger:
-- 1. CI/CD workflow when merged to main
-- 2. Automatic types package generation with new version
-- 3. Publication to pub.dev
-- 4. Flutter app should be able to use new field immediately via updated types package