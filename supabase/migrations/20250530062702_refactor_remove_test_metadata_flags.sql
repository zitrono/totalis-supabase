-- Remove test metadata flags from existing records
-- Preview branches are used for test isolation, making metadata-based tracking unnecessary

-- Remove test-specific metadata from profiles table
UPDATE profiles 
SET metadata = metadata - 'is_test_data' - 'test_account' - 'test' - 'permanent' - 'created_by' - 'created_via'
WHERE metadata ?| ARRAY['is_test_data', 'test_account', 'test', 'permanent', 'created_by', 'created_via'];

-- Remove test-specific metadata from messages table
UPDATE messages 
SET metadata = metadata - 'test' - 'test_run_id' - 'test_timestamp' - 'test_environment' - 'generated_by'
WHERE metadata ?| ARRAY['test', 'test_run_id', 'test_timestamp', 'test_environment', 'generated_by'];

-- Remove test-specific metadata from checkins table
UPDATE checkins 
SET metadata = metadata - 'test' - 'test_run_id' - 'test_timestamp' - 'test_environment'
WHERE metadata ?| ARRAY['test', 'test_run_id', 'test_timestamp', 'test_environment'];

-- Remove test-specific metadata from recommendations table
UPDATE recommendations 
SET metadata = metadata - 'test' - 'test_run_id' - 'test_timestamp' - 'test_environment' - 'generated_by'
WHERE metadata ?| ARRAY['test', 'test_run_id', 'test_timestamp', 'test_environment', 'generated_by'];

-- Remove test-specific metadata from profile_categories table
UPDATE profile_categories 
SET metadata = metadata - 'test' - 'test_run_id' - 'test_timestamp' - 'test_environment'
WHERE metadata ?| ARRAY['test', 'test_run_id', 'test_timestamp', 'test_environment'];

-- Remove test-specific metadata from analytics_events table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    UPDATE analytics_events 
    SET metadata = metadata - 'test' - 'test_run_id' - 'test_timestamp' - 'test_environment'
    WHERE metadata ?| ARRAY['test', 'test_run_id', 'test_timestamp', 'test_environment'];
  END IF;
END $$;

-- Remove test-specific metadata from audio_transcriptions table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_transcriptions') THEN
    UPDATE audio_transcriptions 
    SET metadata = metadata - 'test' - 'test_run_id' - 'test_timestamp' - 'test_environment'
    WHERE metadata ?| ARRAY['test', 'test_run_id', 'test_timestamp', 'test_environment'];
  END IF;
END $$;

-- Drop cleanup_test_data function if it exists
DROP FUNCTION IF EXISTS cleanup_test_data(TEXT, INTERVAL, BOOLEAN);

-- Drop test_cleanup_log table if it exists
DROP TABLE IF EXISTS test_cleanup_log;

-- Add comment explaining the change
COMMENT ON SCHEMA public IS 'Supabase project schema - test isolation handled by preview branches, not metadata';