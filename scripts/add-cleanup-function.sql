-- Create cleanup function if it doesn't exist
-- This is from the test_data_tracking migration

-- Create test cleanup log table
CREATE TABLE IF NOT EXISTS test_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_run_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  rows_deleted INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  dry_run BOOLEAN DEFAULT FALSE,
  filters JSONB,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create test data summary view
CREATE OR REPLACE VIEW test_data_summary AS
SELECT 
  'profiles' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as test_count,
  COUNT(*) FILTER (WHERE metadata->>'test' IS NULL OR metadata->>'test' = 'false') as prod_count
FROM profiles
UNION ALL
SELECT 
  'profile_categories' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as test_count,
  COUNT(*) FILTER (WHERE metadata->>'test' IS NULL OR metadata->>'test' = 'false') as prod_count
FROM profile_categories
UNION ALL
SELECT 
  'recommendations' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as test_count,
  COUNT(*) FILTER (WHERE metadata->>'test' IS NULL OR metadata->>'test' = 'false') as prod_count
FROM recommendations
UNION ALL
SELECT 
  'interaction_logs' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as test_count,
  COUNT(*) FILTER (WHERE metadata->>'test' IS NULL OR metadata->>'test' = 'false') as prod_count
FROM interaction_logs
UNION ALL
SELECT 
  'experiments' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as test_count,
  COUNT(*) FILTER (WHERE metadata->>'test' IS NULL OR metadata->>'test' = 'false') as prod_count
FROM experiments
UNION ALL
SELECT 
  'features' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as test_count,
  COUNT(*) FILTER (WHERE metadata->>'test' IS NULL OR metadata->>'test' = 'false') as prod_count
FROM features
UNION ALL
SELECT 
  'feature_flags' as table_name,
  COUNT(*) FILTER (WHERE metadata->>'test' = 'true') as test_count,
  COUNT(*) FILTER (WHERE metadata->>'test' IS NULL OR metadata->>'test' = 'false') as prod_count
FROM feature_flags;

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_test_data(
  p_test_run_id UUID DEFAULT NULL,
  p_older_than INTERVAL DEFAULT NULL,
  p_dry_run BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  table_name TEXT,
  rows_deleted INTEGER
) AS $$
DECLARE
  v_cleanup_run_id UUID := gen_random_uuid();
  v_deleted_count INTEGER;
  v_total_deleted INTEGER := 0;
BEGIN
  -- Safety check: require at least one filter
  IF p_test_run_id IS NULL AND p_older_than IS NULL THEN
    RAISE EXCEPTION 'Must provide either test_run_id or older_than parameter';
  END IF;

  -- Safety check: prevent cleanup in production without explicit confirmation
  IF current_setting('app.environment', true) = 'production' AND NOT p_dry_run THEN
    RAISE EXCEPTION 'Cannot run cleanup in production without dry_run=true first';
  END IF;

  -- Clean profiles
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_deleted_count
    FROM profiles
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
  ELSE
    DELETE FROM profiles
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  INSERT INTO test_cleanup_log (cleanup_run_id, table_name, rows_deleted, dry_run, filters)
  VALUES (v_cleanup_run_id, 'profiles', v_deleted_count, p_dry_run, 
    jsonb_build_object('test_run_id', p_test_run_id, 'older_than', p_older_than));
  
  table_name := 'profiles';
  rows_deleted := v_deleted_count;
  v_total_deleted := v_total_deleted + v_deleted_count;
  RETURN NEXT;

  -- Clean profile_categories
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_deleted_count
    FROM profile_categories
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
  ELSE
    DELETE FROM profile_categories
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  INSERT INTO test_cleanup_log (cleanup_run_id, table_name, rows_deleted, dry_run, filters)
  VALUES (v_cleanup_run_id, 'profile_categories', v_deleted_count, p_dry_run, 
    jsonb_build_object('test_run_id', p_test_run_id, 'older_than', p_older_than));
  
  table_name := 'profile_categories';
  rows_deleted := v_deleted_count;
  v_total_deleted := v_total_deleted + v_deleted_count;
  RETURN NEXT;

  -- Clean recommendations
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_deleted_count
    FROM recommendations
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
  ELSE
    DELETE FROM recommendations
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  INSERT INTO test_cleanup_log (cleanup_run_id, table_name, rows_deleted, dry_run, filters)
  VALUES (v_cleanup_run_id, 'recommendations', v_deleted_count, p_dry_run, 
    jsonb_build_object('test_run_id', p_test_run_id, 'older_than', p_older_than));
  
  table_name := 'recommendations';
  rows_deleted := v_deleted_count;
  v_total_deleted := v_total_deleted + v_deleted_count;
  RETURN NEXT;

  -- Clean interaction_logs
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_deleted_count
    FROM interaction_logs
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
  ELSE
    DELETE FROM interaction_logs
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  INSERT INTO test_cleanup_log (cleanup_run_id, table_name, rows_deleted, dry_run, filters)
  VALUES (v_cleanup_run_id, 'interaction_logs', v_deleted_count, p_dry_run, 
    jsonb_build_object('test_run_id', p_test_run_id, 'older_than', p_older_than));
  
  table_name := 'interaction_logs';
  rows_deleted := v_deleted_count;
  v_total_deleted := v_total_deleted + v_deleted_count;
  RETURN NEXT;

  -- Clean experiments
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_deleted_count
    FROM experiments
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
  ELSE
    DELETE FROM experiments
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  INSERT INTO test_cleanup_log (cleanup_run_id, table_name, rows_deleted, dry_run, filters)
  VALUES (v_cleanup_run_id, 'experiments', v_deleted_count, p_dry_run, 
    jsonb_build_object('test_run_id', p_test_run_id, 'older_than', p_older_than));
  
  table_name := 'experiments';
  rows_deleted := v_deleted_count;
  v_total_deleted := v_total_deleted + v_deleted_count;
  RETURN NEXT;

  -- Clean features
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_deleted_count
    FROM features
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
  ELSE
    DELETE FROM features
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  INSERT INTO test_cleanup_log (cleanup_run_id, table_name, rows_deleted, dry_run, filters)
  VALUES (v_cleanup_run_id, 'features', v_deleted_count, p_dry_run, 
    jsonb_build_object('test_run_id', p_test_run_id, 'older_than', p_older_than));
  
  table_name := 'features';
  rows_deleted := v_deleted_count;
  v_total_deleted := v_total_deleted + v_deleted_count;
  RETURN NEXT;

  -- Clean feature_flags
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_deleted_count
    FROM feature_flags
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
  ELSE
    DELETE FROM feature_flags
    WHERE metadata->>'test' = 'true'
      AND (p_test_run_id IS NULL OR metadata->>'test_run_id' = p_test_run_id::TEXT)
      AND (p_older_than IS NULL OR (metadata->>'test_created_at')::TIMESTAMPTZ < NOW() - p_older_than);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  INSERT INTO test_cleanup_log (cleanup_run_id, table_name, rows_deleted, dry_run, filters)
  VALUES (v_cleanup_run_id, 'feature_flags', v_deleted_count, p_dry_run, 
    jsonb_build_object('test_run_id', p_test_run_id, 'older_than', p_older_than));
  
  table_name := 'feature_flags';
  rows_deleted := v_deleted_count;
  v_total_deleted := v_total_deleted + v_deleted_count;
  RETURN NEXT;

  -- Summary row
  table_name := 'TOTAL';
  rows_deleted := v_total_deleted;
  RETURN NEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql;