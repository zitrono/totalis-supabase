-- Remove test metadata flags from existing records
-- Preview branches are used for test isolation, making metadata-based tracking unnecessary
-- Note: Since preview branches are ephemeral, we don't need to track test data in production

-- Just drop the cleanup function and table as they're no longer needed
-- The actual metadata cleanup is optional since it doesn't affect functionality

-- Drop cleanup_test_data function if it exists
DROP FUNCTION IF EXISTS cleanup_test_data(TEXT, INTERVAL, BOOLEAN);

-- Drop test_cleanup_log table if it exists
DROP TABLE IF EXISTS test_cleanup_log;

-- Add comment explaining the change
COMMENT ON SCHEMA public IS 'Supabase project schema - test isolation handled by preview branches, not metadata';