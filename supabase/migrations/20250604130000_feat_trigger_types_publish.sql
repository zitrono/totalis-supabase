-- Migration: Trigger types publishing for v1.0.145
-- Purpose: Create a benign database change to trigger automatic types generation and publishing
-- Date: 2025-06-04

-- Add a comment to the profiles table to document recent improvements
COMMENT ON TABLE profiles IS 'User profiles with comprehensive health data tracking. Updated 2025-06-04 for v1.0.145 types publishing.';

-- This migration creates no functional changes, only updates documentation
-- It will trigger the CI/CD pipeline to generate and publish types automatically