-- Create a function to generate test users (v4.2.17)
-- This function can be called manually or by the test setup process
-- Preview branches don't allow direct auth.users modifications in migrations

CREATE OR REPLACE FUNCTION create_test_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id UUID;
  i INTEGER;
BEGIN
  -- Only create test users if they don't exist
  FOR i IN 1..3 LOOP
    -- Check if user already exists
    IF NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'test' || i || '@totalis.app'
    ) THEN
      test_user_id := gen_random_uuid();
      
      -- Insert into auth.users with minimal required fields
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        test_user_id,
        'authenticated',
        'authenticated',
        'test' || i || '@totalis.app',
        crypt('Test123!@#', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb
      );
      
      -- Create profile
      INSERT INTO profiles (user_id, email, created_at, updated_at)
      VALUES (test_user_id, 'test' || i || '@totalis.app', NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE NOTICE 'Created test user: test%@totalis.app', i;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION create_test_users() TO service_role;

-- Create RPC endpoint that can be called via API
CREATE OR REPLACE FUNCTION public.create_test_users_rpc()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow in non-production environments
  IF current_setting('app.environment', true) = 'production' THEN
    RETURN json_build_object('error', 'Test users cannot be created in production');
  END IF;
  
  -- Call the function
  PERFORM create_test_users();
  
  RETURN json_build_object('success', true, 'message', 'Test users created');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users (for testing)
GRANT EXECUTE ON FUNCTION public.create_test_users_rpc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_test_users_rpc() TO anon;