-- Fix the cleanup function to remove system_logs dependency
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
  
  -- Build result JSON (no system_logs insert)
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

-- Update the old test data cleanup function as well
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