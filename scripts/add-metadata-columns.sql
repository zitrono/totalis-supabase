-- Add metadata columns to all tables that don't have them yet
-- This is a temporary script to add missing columns to the remote database

-- Add metadata to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to profile_categories table if it doesn't exist
ALTER TABLE profile_categories 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to recommendations table if it doesn't exist
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to interaction_logs table if it doesn't exist
ALTER TABLE interaction_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to experiments table if it doesn't exist
ALTER TABLE experiments 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to features table if it doesn't exist
ALTER TABLE features 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to feature_flags table if it doesn't exist
ALTER TABLE feature_flags 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add indexes for efficient test data queries
CREATE INDEX IF NOT EXISTS idx_profiles_metadata_test ON profiles ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_profile_categories_metadata_test ON profile_categories ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_recommendations_metadata_test ON recommendations ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_interaction_logs_metadata_test ON interaction_logs ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_experiments_metadata_test ON experiments ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_features_metadata_test ON features ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_feature_flags_metadata_test ON feature_flags ((metadata->>'test'));