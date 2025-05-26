-- Apply only the test data tracking features
-- This assumes the base tables already exist

-- First add metadata columns if they don't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE profile_categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE audio_usage_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create test cleanup log table
CREATE TABLE IF NOT EXISTS test_cleanup_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id UUID,
  table_name TEXT NOT NULL,
  records_deleted INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_test_data(
  p_test_run_id UUID DEFAULT NULL,
  p_older_than INTERVAL DEFAULT '24 hours',
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS TABLE (
  table_name TEXT,
  records_deleted INTEGER
) AS $$
DECLARE
  v_count INTEGER;
  v_user_ids UUID[];
  v_deleted_by TEXT;
BEGIN
  -- Set who is performing the deletion
  v_deleted_by := COALESCE(auth.uid()::TEXT, 'system');
  
  -- First, identify test users to delete
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM auth.users
  WHERE (raw_user_meta_data->>'test')::BOOLEAN = true
    AND (p_test_run_id IS NULL OR raw_user_meta_data->>'test_run_id' = p_test_run_id::TEXT)
    AND created_at < NOW() - p_older_than
    AND email LIKE 'test_%@example.com';
  
  IF p_dry_run THEN
    -- Just count what would be deleted
    
    -- Audio usage logs
    SELECT COUNT(*) INTO v_count
    FROM audio_usage_logs
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND created_at < NOW() - p_older_than;
    RETURN QUERY SELECT 'audio_usage_logs'::TEXT, v_count;
    
    -- User feedback
    SELECT COUNT(*) INTO v_count
    FROM user_feedback
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND created_at < NOW() - p_older_than;
    RETURN QUERY SELECT 'user_feedback'::TEXT, v_count;
    
    -- Analytics events
    SELECT COUNT(*) INTO v_count
    FROM analytics_events
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND created_at < NOW() - p_older_than;
    RETURN QUERY SELECT 'analytics_events'::TEXT, v_count;
    
    -- Recommendations
    SELECT COUNT(*) INTO v_count
    FROM recommendations
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND created_at < NOW() - p_older_than;
    RETURN QUERY SELECT 'recommendations'::TEXT, v_count;
    
    -- Checkins
    SELECT COUNT(*) INTO v_count
    FROM checkins
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND started_at < NOW() - p_older_than;
    RETURN QUERY SELECT 'checkins'::TEXT, v_count;
    
    -- Messages
    SELECT COUNT(*) INTO v_count
    FROM messages
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND created_at < NOW() - p_older_than;
    RETURN QUERY SELECT 'messages'::TEXT, v_count;
    
    -- Profile categories
    SELECT COUNT(*) INTO v_count
    FROM profile_categories
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND created_at < NOW() - p_older_than;
    RETURN QUERY SELECT 'profile_categories'::TEXT, v_count;
    
    -- Test users
    SELECT COUNT(*) INTO v_count
    FROM auth.users
    WHERE id = ANY(v_user_ids);
    RETURN QUERY SELECT 'auth.users'::TEXT, v_count;
    
  ELSE
    -- Actually delete the data
    
    -- Audio usage logs
    DELETE FROM audio_usage_logs
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND created_at < NOW() - p_older_than;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      INSERT INTO test_cleanup_log (test_run_id, table_name, records_deleted, deleted_by)
      VALUES (p_test_run_id, 'audio_usage_logs', v_count, v_deleted_by);
    END IF;
    RETURN QUERY SELECT 'audio_usage_logs'::TEXT, v_count;
    
    -- Continue for other tables...
    -- (Rest of function implementation)
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test data summary view
CREATE OR REPLACE VIEW test_data_summary AS
WITH test_counts AS (
  SELECT 
    'profiles' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_record
  FROM profiles
  WHERE metadata->>'test' = 'true'
  
  UNION ALL
  
  SELECT 
    'messages' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_record
  FROM messages
  WHERE metadata->>'test' = 'true'
  
  UNION ALL
  
  SELECT 
    'checkins' as table_name,
    COUNT(*) as count,
    MIN(started_at) as oldest_record
  FROM checkins
  WHERE metadata->>'test' = 'true'
  
  UNION ALL
  
  SELECT 
    'recommendations' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_record
  FROM recommendations
  WHERE metadata->>'test' = 'true'
  
  UNION ALL
  
  SELECT 
    'profile_categories' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_record
  FROM profile_categories
  WHERE metadata->>'test' = 'true'
  
  UNION ALL
  
  SELECT 
    'analytics_events' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_record
  FROM analytics_events
  WHERE metadata->>'test' = 'true'
  
  UNION ALL
  
  SELECT 
    'audio_usage_logs' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_record
  FROM audio_usage_logs
  WHERE metadata->>'test' = 'true'
  
  UNION ALL
  
  SELECT 
    'user_feedback' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_record
  FROM user_feedback
  WHERE metadata->>'test' = 'true'
)
SELECT 
  table_name,
  count,
  oldest_record,
  CASE 
    WHEN oldest_record IS NOT NULL 
    THEN NOW() - oldest_record 
    ELSE NULL 
  END as age
FROM test_counts
WHERE count > 0
ORDER BY count DESC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_test_data TO service_role;
GRANT SELECT ON test_data_summary TO service_role;
GRANT SELECT, INSERT ON test_cleanup_log TO service_role;