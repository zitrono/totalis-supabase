-- Create test users for preview environments
-- This uses a workaround that's compatible with preview branch permissions

-- Create a function to set up test users that can be called by tests
CREATE OR REPLACE FUNCTION setup_test_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  status text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  test_user_id uuid;
  default_coach_id uuid;
BEGIN
  -- Get default coach
  SELECT id INTO default_coach_id
  FROM coaches
  WHERE name = 'Daniel'
  LIMIT 1;
  
  -- Create test user profiles with known UUIDs
  -- These will be linked to auth users when they sign in
  FOR i IN 1..3 LOOP
    test_user_id := gen_random_uuid();
    
    -- Insert profile
    INSERT INTO profiles (
      id,
      coach_id,
      metadata
    ) VALUES (
      test_user_id,
      default_coach_id,
      jsonb_build_object(
        'test_account', true,
        'test_number', i,
        'email', 'test' || i || '@totalis.app',
        'created_for_testing', true
      )
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Return result
    RETURN QUERY 
    SELECT 
      test_user_id,
      'test' || i || '@totalis.app'::text,
      'profile_created'::text;
  END LOOP;
END;
$$;

-- Create an RPC function to get test user credentials
-- This helps tests know which users are available
CREATE OR REPLACE FUNCTION get_test_credentials()
RETURNS TABLE (
  email text,
  password text,
  profile_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return test user credentials
  -- Note: In a real preview branch, these users would be created via Supabase Auth API
  RETURN QUERY
  SELECT 
    metadata->>'email' as email,
    'Test123!@#'::text as password,
    id as profile_id
  FROM profiles
  WHERE metadata->>'test_account' = 'true'
  ORDER BY metadata->>'test_number';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION setup_test_users() TO service_role;
GRANT EXECUTE ON FUNCTION get_test_credentials() TO service_role, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION setup_test_users() IS 'Creates test user profiles for integration testing';
COMMENT ON FUNCTION get_test_credentials() IS 'Returns available test user credentials for tests';