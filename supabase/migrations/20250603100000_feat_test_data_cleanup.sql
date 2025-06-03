-- Create function for cleaning up test data after CI/CD runs
-- This ensures we don't pollute the production database with test data

CREATE OR REPLACE FUNCTION cleanup_test_data(run_id TEXT)
RETURNS JSON AS $$
DECLARE
  deleted_counts JSON;
  profile_count INTEGER;
  message_count INTEGER;
  recommendation_count INTEGER;
  category_count INTEGER;
  checkin_count INTEGER;
  health_card_count INTEGER;
BEGIN
  -- Delete test check-ins
  DELETE FROM checkins 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE metadata->>'test_run_id' = run_id
  );
  GET DIAGNOSTICS checkin_count = ROW_COUNT;

  -- Delete test health cards
  DELETE FROM health_cards 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE metadata->>'test_run_id' = run_id
  );
  GET DIAGNOSTICS health_card_count = ROW_COUNT;

  -- Delete test messages
  DELETE FROM messages 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE metadata->>'test_run_id' = run_id
  );
  GET DIAGNOSTICS message_count = ROW_COUNT;
  
  -- Delete test recommendations
  DELETE FROM recommendations 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE metadata->>'test_run_id' = run_id
  );
  GET DIAGNOSTICS recommendation_count = ROW_COUNT;
  
  -- Delete test profile categories
  DELETE FROM profile_categories 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE metadata->>'test_run_id' = run_id
  );
  GET DIAGNOSTICS category_count = ROW_COUNT;
  
  -- Delete test profiles (this will cascade to other tables with FK constraints)
  DELETE FROM profiles 
  WHERE metadata->>'test_run_id' = run_id;
  GET DIAGNOSTICS profile_count = ROW_COUNT;
  
  -- Log cleanup in system_logs
  INSERT INTO system_logs (
    log_level, 
    component, 
    message, 
    metadata
  ) VALUES (
    'info',
    'test_cleanup',
    'Test data cleaned up for run: ' || run_id,
    jsonb_build_object(
      'run_id', run_id,
      'profiles_deleted', profile_count,
      'messages_deleted', message_count,
      'recommendations_deleted', recommendation_count,
      'categories_deleted', category_count,
      'checkins_deleted', checkin_count,
      'health_cards_deleted', health_card_count,
      'timestamp', NOW()
    )
  );
  
  -- Build result JSON
  deleted_counts := json_build_object(
    'run_id', run_id,
    'profiles', profile_count,
    'messages', message_count,
    'recommendations', recommendation_count,
    'profile_categories', category_count,
    'checkins', checkin_count,
    'health_cards', health_card_count,
    'total', profile_count + message_count + recommendation_count + category_count + checkin_count + health_card_count
  );
  
  RETURN deleted_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for local testing)
GRANT EXECUTE ON FUNCTION cleanup_test_data(TEXT) TO authenticated;

-- Create index to speed up test data cleanup
CREATE INDEX IF NOT EXISTS idx_profiles_test_run_id 
ON profiles ((metadata->>'test_run_id')) 
WHERE metadata->>'test_run_id' IS NOT NULL;

-- Create a scheduled cleanup function for orphaned test data
CREATE OR REPLACE FUNCTION cleanup_old_test_data()
RETURNS JSON AS $$
DECLARE
  total_deleted JSON;
  run_results JSON[];
  old_runs TEXT[];
BEGIN
  -- Find test runs older than 7 days
  SELECT ARRAY_AGG(DISTINCT metadata->>'test_run_id')
  INTO old_runs
  FROM profiles
  WHERE 
    metadata->>'test_run_id' IS NOT NULL
    AND (metadata->>'created_at')::timestamptz < NOW() - INTERVAL '7 days';
  
  -- Clean up each old run
  IF old_runs IS NOT NULL THEN
    FOR i IN 1..array_length(old_runs, 1) LOOP
      run_results[i] := cleanup_test_data(old_runs[i]);
    END LOOP;
  END IF;
  
  total_deleted := json_build_object(
    'runs_cleaned', COALESCE(array_length(old_runs, 1), 0),
    'run_ids', old_runs,
    'details', run_results
  );
  
  RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on functions
COMMENT ON FUNCTION cleanup_test_data(TEXT) IS 'Removes all test data associated with a specific test run ID';
COMMENT ON FUNCTION cleanup_old_test_data() IS 'Removes test data older than 7 days';