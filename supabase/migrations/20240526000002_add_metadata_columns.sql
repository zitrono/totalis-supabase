-- Add metadata columns to existing tables that are missing them

-- Add metadata to categories if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add metadata to other tables that might be missing it
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE profile_categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE audio_usage_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create test_data_summary view if it doesn't exist
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

-- Add missing indexes for test data
CREATE INDEX IF NOT EXISTS idx_coaches_test_data ON coaches ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_profiles_test_data ON profiles ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_categories_test_data ON categories ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_profile_categories_test_data ON profile_categories ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_messages_test_data ON messages ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_checkins_test_data ON checkins ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_recommendations_test_data ON recommendations ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_analytics_events_test_data ON analytics_events ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_user_feedback_test_data ON user_feedback ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

CREATE INDEX IF NOT EXISTS idx_audio_usage_logs_test_data ON audio_usage_logs ((metadata->>'test')) 
WHERE metadata->>'test' = 'true';

-- Grant permissions for test_data_summary view
GRANT SELECT ON test_data_summary TO service_role;