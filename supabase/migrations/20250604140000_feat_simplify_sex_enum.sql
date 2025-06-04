-- Migration: Simplify sex enum to only male and female
-- Purpose: Remove non_binary, other, and prefer_not_to_say options from sex fields
-- Date: 2025-06-04

-- First, update any existing data that uses the options we're removing
-- Set them to NULL (which will be allowed) so users can re-select
UPDATE profiles 
SET sex = NULL 
WHERE sex IN ('non_binary', 'other', 'prefer_not_to_say');

UPDATE coaches 
SET sex = NULL 
WHERE sex IN ('non_binary', 'other', 'prefer_not_to_say');

-- Drop the existing CHECK constraints for sex fields
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_sex_check;
ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_sex_check;

-- Add new simplified CHECK constraints
ALTER TABLE profiles ADD CONSTRAINT profiles_sex_check 
  CHECK (sex IS NULL OR sex IN ('male', 'female'));

ALTER TABLE coaches ADD CONSTRAINT coaches_sex_check 
  CHECK (sex IS NULL OR sex IN ('male', 'female'));

-- Add comments to document the change
COMMENT ON COLUMN profiles.sex IS 'User biological sex: male or female only. Simplified from previous broader options.';
COMMENT ON COLUMN coaches.sex IS 'Coach biological sex: male or female only. Simplified from previous broader options.';