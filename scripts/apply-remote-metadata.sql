-- Remote Testing Metadata Setup
-- Apply this script in the Supabase SQL Editor:
-- https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor

-- 1. Add metadata columns to existing tables (safe to run multiple times)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE profile_categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Create indexes on metadata for performance
CREATE INDEX IF NOT EXISTS idx_profiles_metadata_test ON profiles ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_recommendations_metadata_test ON recommendations ((metadata->>'test'));
CREATE INDEX IF NOT EXISTS idx_checkins_metadata_test ON checkins ((metadata->>'test'));

-- 3. Create test cleanup log table
CREATE TABLE IF NOT EXISTS test_cleanup_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id TEXT,
  table_name TEXT NOT NULL,
  records_deleted INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 4. Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_test_data(
  p_test_run_id TEXT DEFAULT NULL,
  p_older_than INTERVAL DEFAULT '24 hours',
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS TABLE (
  table_name TEXT,
  records_deleted INTEGER
) AS $$
DECLARE
  v_count INTEGER;
  v_total INTEGER := 0;
BEGIN
  -- Safety check: ensure we have metadata columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'metadata'
  ) THEN
    RAISE EXCEPTION 'metadata columns not found - cannot safely clean test data';
  END IF;

  -- Clean profiles
  IF NOT p_dry_run THEN
    DELETE FROM profiles
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    SELECT COUNT(*) INTO v_count FROM profiles
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
  END IF;
  
  v_total := v_total + v_count;
  RETURN QUERY SELECT 'profiles'::TEXT, v_count;

  -- Clean recommendations
  IF NOT p_dry_run THEN
    DELETE FROM recommendations
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    SELECT COUNT(*) INTO v_count FROM recommendations
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
  END IF;
  
  RETURN QUERY SELECT 'recommendations'::TEXT, v_count;
  v_total := v_total + v_count;

  -- Clean checkins
  IF NOT p_dry_run THEN
    DELETE FROM checkins
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    SELECT COUNT(*) INTO v_count FROM checkins
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
  END IF;
  
  RETURN QUERY SELECT 'checkins'::TEXT, v_count;
  v_total := v_total + v_count;

  -- Clean profile_categories
  IF NOT p_dry_run THEN
    DELETE FROM profile_categories
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    SELECT COUNT(*) INTO v_count FROM profile_categories
    WHERE metadata->>'test' = 'true'
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
  END IF;
  
  RETURN QUERY SELECT 'profile_categories'::TEXT, v_count;

  -- Log cleanup if not dry run
  IF NOT p_dry_run AND v_total > 0 THEN
    INSERT INTO test_cleanup_log (test_run_id, table_name, records_deleted, deleted_by)
    VALUES (p_test_run_id, 'all_tables', v_total, current_user);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create test data summary view
CREATE OR REPLACE VIEW test_data_summary AS
SELECT 
  'profiles' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as count,
  MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as oldest_record,
  NOW() - MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as age
FROM profiles
UNION ALL
SELECT 
  'recommendations' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as count,
  MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as oldest_record,
  NOW() - MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as age
FROM recommendations
UNION ALL
SELECT 
  'checkins' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as count,
  MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as oldest_record,
  NOW() - MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as age
FROM checkins
UNION ALL
SELECT 
  'profile_categories' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as count,
  MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as oldest_record,
  NOW() - MIN((metadata->>'test_created_at')::timestamptz) FILTER (WHERE metadata->>'test' = 'true') as age
FROM profile_categories;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_test_data TO anon, authenticated, service_role;
GRANT SELECT ON test_data_summary TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON test_cleanup_log TO anon, authenticated, service_role;

-- 7. Verify the setup
SELECT 'Setup complete! Tables with metadata columns:' as status
UNION ALL
SELECT '  - ' || table_name || ' (metadata column exists)'
FROM information_schema.columns
WHERE column_name = 'metadata'
  AND table_name IN ('profiles', 'categories', 'coaches', 'checkins', 'recommendations', 'profile_categories')
GROUP BY table_name
ORDER BY 1;