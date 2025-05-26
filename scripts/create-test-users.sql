-- Create Pre-configured Test Users for Integration Testing
-- These users are NOT marked as test data and won't be deleted by cleanup
-- Apply this in Supabase Dashboard SQL Editor

-- Create a function to safely create test users
CREATE OR REPLACE FUNCTION create_test_user(
  email TEXT,
  password TEXT,
  display_name TEXT
) RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE auth.users.email = create_test_user.email;
  
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;
  
  -- Create new user
  user_id := extensions.uuid_generate_v4();
  
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    user_id,
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('display_name', display_name, 'test_account', true),
    false,
    'authenticated'
  );
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    display_name,
    email,
    metadata
  ) VALUES (
    user_id,
    display_name,
    email,
    jsonb_build_object(
      'test_account', true,
      'permanent', true,
      'created_at', NOW()
    )
  );
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test users
SELECT create_test_user('test1@totalis.test', 'Test123!@#', 'Test User 1');
SELECT create_test_user('test2@totalis.test', 'Test123!@#', 'Test User 2');
SELECT create_test_user('test3@totalis.test', 'Test123!@#', 'Test User 3');
SELECT create_test_user('test4@totalis.test', 'Test123!@#', 'Test User 4');
SELECT create_test_user('test5@totalis.test', 'Test123!@#', 'Test User 5');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON auth.users TO service_role;

-- Update cleanup function to exclude permanent test accounts
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

  -- Clean profiles (excluding permanent test accounts)
  IF NOT p_dry_run THEN
    DELETE FROM profiles
    WHERE metadata->>'test' = 'true'
      AND (metadata->>'permanent' IS NULL OR metadata->>'permanent' = 'false')
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    SELECT COUNT(*) INTO v_count FROM profiles
    WHERE metadata->>'test' = 'true'
      AND (metadata->>'permanent' IS NULL OR metadata->>'permanent' = 'false')
      AND (
        (p_test_run_id IS NOT NULL AND metadata->>'test_run_id' = p_test_run_id)
        OR (p_test_run_id IS NULL AND (metadata->>'test_created_at')::timestamptz < NOW() - p_older_than)
      );
  END IF;
  
  v_total := v_total + v_count;
  RETURN QUERY SELECT 'profiles'::TEXT, v_count;

  -- Clean recommendations (all test data)
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

  -- Clean checkins (all test data)
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

  -- Clean profile_categories (all test data)
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

-- Verify test users were created
SELECT 
  p.id,
  p.email,
  p.display_name,
  p.metadata->>'test_account' as is_test_account,
  p.metadata->>'permanent' as is_permanent
FROM profiles p
WHERE p.email LIKE '%@totalis.test'
ORDER BY p.email;