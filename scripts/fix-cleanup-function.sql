-- Fix the cleanup function ambiguity issue
-- Apply this in Supabase SQL Editor after the initial setup

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
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = 'profiles' AND c.column_name = 'metadata'
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